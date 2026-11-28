import { Injectable } from '@nestjs/common';
import type { AvatarUploadUrlResponse, MessageResponse, UserPublicDto } from '@smart-garden/types';
import type { AvatarUploadUrlInput, UpdateProfileInput } from '@smart-garden/validation';
import sharp from 'sharp';
import { AppHttpException, forbidden, notFound } from '../common/errors/http-errors';
import { toUserPublicDto } from '../common/mappers/user.mapper';
import { detectImageMime } from '../common/utils/media.util';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const AVATAR_URL_TTL = 900;
const AVATAR_SIZE_PX = 256;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async update(userId: string, input: UpdateProfileInput): Promise<UserPublicDto> {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!existing) {
      throw notFound('Користувача не знайдено');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        preferredLanguage: input.preferredLanguage,
        preferredWeightUnit: input.preferredWeightUnit,
        preferredAreaUnit: input.preferredAreaUnit,
        timezone: input.timezone,
      },
    });

    return this.withResolvedAvatar(user);
  }

  async createAvatarUploadUrl(
    userId: string,
    input: AvatarUploadUrlInput,
  ): Promise<AvatarUploadUrlResponse> {
    const ext =
      input.mimeType === 'image/png' ? 'png' : input.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const storageKey = this.storage.buildObjectKey(userId, ext);
    const uploadUrl = await this.storage.createUploadUrl(storageKey, input.mimeType, AVATAR_URL_TTL);
    return {
      uploadUrl,
      storageKey,
      expiresInSeconds: AVATAR_URL_TTL,
    };
  }

  async confirmAvatar(userId: string, storageKey: string): Promise<UserPublicDto> {
    if (!storageKey.startsWith(`users/${userId}/`)) {
      throw forbidden('Недійсний ключ файлу аватара');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!existing) {
      throw notFound('Користувача не знайдено');
    }

    let raw: Buffer;
    try {
      raw = await this.storage.getObjectBuffer(storageKey);
    } catch {
      throw new AppHttpException(400, 'VALIDATION_ERROR', 'Файл аватара ще не завантажено');
    }

    if (raw.length === 0 || raw.length > 5 * 1024 * 1024) {
      await this.storage.deleteObject(storageKey);
      throw new AppHttpException(413, 'PAYLOAD_TOO_LARGE', 'Аватар перевищує ліміт 5 МБ');
    }

    const detected = detectImageMime(raw);
    if (!detected) {
      await this.storage.deleteObject(storageKey);
      throw new AppHttpException(415, 'UNSUPPORTED_MEDIA_TYPE', 'Дозволені лише JPEG, PNG, WebP');
    }

    const processed = await sharp(raw, { failOn: 'error' })
      .rotate()
      .resize(AVATAR_SIZE_PX, AVATAR_SIZE_PX, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    const finalKey = this.storage.buildObjectKey(userId, 'webp');
    await this.storage.putObject(finalKey, processed, 'image/webp');
    if (finalKey !== storageKey) {
      await this.storage.deleteObject(storageKey);
    }
    if (existing.avatarUrl && !existing.avatarUrl.startsWith('http')) {
      await this.storage.deleteObject(existing.avatarUrl);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: finalKey },
    });

    return this.withResolvedAvatar(updated);
  }

  async removeAvatar(userId: string): Promise<UserPublicDto> {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!existing) {
      throw notFound('Користувача не знайдено');
    }

    if (existing.avatarUrl && !existing.avatarUrl.startsWith('http')) {
      await this.storage.deleteObject(existing.avatarUrl);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return toUserPublicDto(updated);
  }

  async softDelete(userId: string): Promise<MessageResponse> {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!existing) {
      throw notFound('Користувача не знайдено');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Обліковий запис видалено' };
  }

  private async withResolvedAvatar(user: Parameters<typeof toUserPublicDto>[0]): Promise<UserPublicDto> {
    const dto = toUserPublicDto(user);
    if (dto.avatarUrl && !dto.avatarUrl.startsWith('http')) {
      dto.avatarUrl = await this.storage.createDownloadUrl(dto.avatarUrl);
    }
    return dto;
  }
}
