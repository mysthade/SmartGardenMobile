import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import type { AppEnv } from '../config/env.validation';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly forcePathStyle: boolean;
  private readonly apiUrl: string;
  private readonly signingSecret: string;
  private readonly localRoot: string;
  private useLocalFallback: boolean | null = null;

  constructor(config: ConfigService<AppEnv, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true }) ?? 'smart-garden';
    this.forcePathStyle = config.get('S3_FORCE_PATH_STYLE', { infer: true });
    this.apiUrl = config.get('API_URL', { infer: true }).replace(/\/$/, '');
    this.signingSecret = config.get('ACCESS_TOKEN_SECRET', { infer: true });
    this.localRoot = path.resolve(process.cwd(), 'uploads');

    const endpoint = config.get('S3_ENDPOINT', { infer: true });
    const region = config.get('S3_REGION', { infer: true });
    const accessKeyId = config.get('S3_ACCESS_KEY', { infer: true });
    const secretAccessKey = config.get('S3_SECRET_KEY', { infer: true });

    if (endpoint && region && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region,
        endpoint,
        forcePathStyle: this.forcePathStyle,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.client = null;
      this.useLocalFallback = true;
    }
  }

  buildObjectKey(ownerId: string, extension: string): string {
    const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
    return `users/${ownerId}/${randomUUID()}.${safeExt}`;
  }

  async createUploadUrl(key: string, mimeType: string, expiresInSeconds = 900): Promise<string> {
    if (await this.shouldUseLocal() || !this.client) {
      const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
      const sig = this.sign('upload', key, exp);
      return `${this.apiUrl}/api/v1/storage/upload?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async createDownloadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    if (await this.shouldUseLocal() || !this.client) {
      const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
      const sig = this.sign('download', key, exp);
      return `${this.apiUrl}/api/v1/storage/object?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    if (await this.shouldUseLocal() || !this.client) {
      return fs.readFile(this.resolveLocalPath(key));
    }

    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    if (!result.Body) {
      throw new Error(`Empty object body for key ${key}`);
    }
    return streamToBuffer(result.Body as Readable);
  }

  async putObject(key: string, body: Buffer, mimeType: string): Promise<void> {
    if (await this.shouldUseLocal() || !this.client) {
      await this.writeLocalObject(key, body);
      return;
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
  }

  async writeLocalObject(key: string, body: Buffer): Promise<void> {
    const filePath = this.resolveLocalPath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
  }

  async deleteObject(key: string): Promise<void> {
    if (await this.shouldUseLocal() || !this.client) {
      try {
        await fs.rm(this.resolveLocalPath(key), { force: true });
      } catch (error) {
        this.logger.warn(
          `Failed to delete local object ${key}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to delete object ${key}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async isHealthy(): Promise<boolean> {
    if (await this.shouldUseLocal()) {
      return true;
    }
    return this.probeS3();
  }

  verifySignedUrl(mode: 'upload' | 'download', key: string, expRaw: string, sig: string): boolean {
    const exp = Number(expRaw);
    if (!key || !sig || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    const expected = this.sign(mode, key, exp);
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private sign(mode: 'upload' | 'download', key: string, exp: number): string {
    return createHmac('sha256', this.signingSecret)
      .update(`${mode}:${key}:${exp}`)
      .digest('hex');
  }

  private resolveLocalPath(key: string): string {
    const cleaned = key.replace(/^\/+/, '');
    const resolved = path.resolve(this.localRoot, cleaned);
    if (!resolved.startsWith(this.localRoot + path.sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return resolved;
  }

  private async shouldUseLocal(): Promise<boolean> {
    if (process.env.STORAGE_DRIVER === 'local') {
      return true;
    }
    if (this.useLocalFallback !== null) {
      return this.useLocalFallback;
    }
    const healthy = await this.probeS3();
    this.useLocalFallback = !healthy;
    if (this.useLocalFallback) {
      this.logger.warn(
        `S3/MinIO недоступний — вкладення зберігаються локально в ${this.localRoot}`,
      );
    }
    return this.useLocalFallback;
  }

  private async probeS3(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    try {
      await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: '__health_probe_missing__',
        }),
      );
      return true;
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      return name === 'NoSuchKey' || name === 'NotFound';
    }
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
