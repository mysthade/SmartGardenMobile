import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import type { AppEnv } from '../config/env.validation';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly forcePathStyle: boolean;

  constructor(config: ConfigService<AppEnv, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.forcePathStyle = config.get('S3_FORCE_PATH_STYLE', { infer: true });
    this.client = new S3Client({
      region: config.get('S3_REGION', { infer: true }),
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      forcePathStyle: this.forcePathStyle,
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
    });
  }

  buildObjectKey(ownerId: string, extension: string): string {
    const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
    return `users/${ownerId}/${randomUUID()}.${safeExt}`;
  }

  async createUploadUrl(key: string, mimeType: string, expiresInSeconds = 900): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async createDownloadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
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
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
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
    try {
      // Lightweight check: HeadBucket would need extra permission; list with max 1 is fine for MinIO.
      await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: '__health_probe_missing__',
        }),
      );
      return true;
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      // Missing key means bucket reachable.
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
