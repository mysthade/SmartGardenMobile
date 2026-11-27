import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  PayloadTooLargeException,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/auth.decorators';
import { StorageService } from './storage.service';

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Put('upload')
  @HttpCode(200)
  async uploadObject(
    @Query('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    if (!this.storage.verifySignedUrl('upload', key, exp, sig)) {
      throw new ForbiddenException('Невалідне або прострочене посилання для завантаження');
    }

    const buffer = await readRequestBody(req);
    await this.storage.writeLocalObject(key, buffer);
    return { ok: true };
  }

  @Public()
  @Get('object')
  async getObject(
    @Query('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.storage.verifySignedUrl('download', key, exp, sig)) {
      throw new ForbiddenException('Невалідне або прострочене посилання');
    }

    let buffer: Buffer;
    try {
      buffer = await this.storage.getObjectBuffer(key);
    } catch {
      throw new NotFoundException('Файл не знайдено');
    }

    res.setHeader('Content-Type', mimeFromKey(key));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(buffer);
  }
}

async function readRequestBody(req: Request): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException('Файл перевищує допустимий розмір');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function mimeFromKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

