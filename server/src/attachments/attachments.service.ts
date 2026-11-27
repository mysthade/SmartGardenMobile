import { Injectable } from '@nestjs/common';
import type { AttachmentDto, MessageResponse, UploadUrlResponse } from '@smart-garden/types';
import type { CreateUploadUrlInput } from '@smart-garden/validation';
import sharp from 'sharp';
import { AppHttpException } from '../common/errors/http-errors';
import { toAttachmentDto } from '../common/mappers/events.mapper';
import { detectImageMime } from '../common/utils/media.util';
import { OwnershipService } from '../policies/ownership.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 4096;
const UPLOAD_URL_TTL = 900;
const MAX_PHOTOS_PER_PLANT = 2;

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly storage: StorageService,
  ) {}

  async createUploadUrl(ownerId: string, input: CreateUploadUrlInput): Promise<UploadUrlResponse> {
    const links = await this.resolveParentLinks(ownerId, input);
    if (links.plantId && !links.journalEntryId && !links.problemId && !links.harvestId) {
      const existingCount = await this.prisma.attachment.count({
        where: {
          plantId: links.plantId,
          deletedAt: null,
          status: 'CONFIRMED',
        },
      });
      if (existingCount >= MAX_PHOTOS_PER_PLANT) {
        throw new AppHttpException(
          400,
          'VALIDATION_ERROR',
          `До однієї рослини можна прикріпити максимум ${MAX_PHOTOS_PER_PLANT} фотографії`,
        );
      }
    }
    const extension = extensionFromMime(input.mimeType);
    const storageKey = this.storage.buildObjectKey(ownerId, extension);

    const attachment = await this.prisma.attachment.create({
      data: {
        ownerId,
        storageKey,
        originalFileName: input.originalFileName,
        mimeType: input.mimeType,
        size: input.size,
        status: 'PENDING',
        plantId: links.plantId,
        journalEntryId: links.journalEntryId,
        problemId: links.problemId,
        harvestId: links.harvestId,
      },
    });

    const uploadUrl = await this.storage.createUploadUrl(
      storageKey,
      input.mimeType,
      UPLOAD_URL_TTL,
    );
    return {
      attachment: toAttachmentDto(attachment),
      uploadUrl,
      expiresInSeconds: UPLOAD_URL_TTL,
    };
  }

  async confirm(ownerId: string, attachmentId: string): Promise<AttachmentDto> {
    const attachment = await this.ownership.requireAttachment(attachmentId, ownerId);
    if (attachment.status === 'CONFIRMED') {
      return this.withUrls(attachment);
    }

    let raw: Buffer;
    try {
      raw = await this.storage.getObjectBuffer(attachment.storageKey);
    } catch {
      await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: { status: 'FAILED' },
      });
      throw new AppHttpException(400, 'VALIDATION_ERROR', 'Файл ще не завантажено або недоступний');
    }

    if (raw.length === 0 || raw.length > MAX_BYTES) {
      await this.failAndCleanup(attachment.id, attachment.storageKey);
      throw new AppHttpException(413, 'PAYLOAD_TOO_LARGE', 'Файл перевищує ліміт 10 МБ');
    }

    const detected = detectImageMime(raw);
    if (!detected) {
      await this.failAndCleanup(attachment.id, attachment.storageKey);
      throw new AppHttpException(415, 'UNSUPPORTED_MEDIA_TYPE', 'Дозволені лише JPEG, PNG, WebP');
    }

    let processedData: Buffer;
    let processedWidth: number | undefined;
    let processedHeight: number | undefined;
    let thumbnail: Buffer;
    try {
      const image = sharp(raw, { failOn: 'error' }).rotate();
      const meta = await image.metadata();
      if ((meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION) {
        if ((meta.width ?? 0) > 20_000 || (meta.height ?? 0) > 20_000) {
          throw new Error('dimensions too large');
        }
      }

      const pipeline = image.resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });

      const processed =
        detected === 'image/png'
          ? await pipeline.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
          : detected === 'image/webp'
            ? await pipeline.webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
            : await pipeline
                .jpeg({ quality: 85, mozjpeg: true })
                .toBuffer({ resolveWithObject: true });

      processedData = processed.data;
      processedWidth = processed.info.width;
      processedHeight = processed.info.height;

      thumbnail = await sharp(processedData)
        .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
    } catch {
      await this.failAndCleanup(attachment.id, attachment.storageKey);
      throw new AppHttpException(415, 'UNSUPPORTED_MEDIA_TYPE', 'Некоректне зображення');
    }

    const thumbnailKey = this.storage.buildObjectKey(ownerId, 'jpg');
    await this.storage.putObject(attachment.storageKey, processedData, detected);
    await this.storage.putObject(thumbnailKey, thumbnail, 'image/jpeg');

    const updated = await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        status: 'CONFIRMED',
        mimeType: detected,
        size: processedData.length,
        width: processedWidth ?? null,
        height: processedHeight ?? null,
        thumbnailKey,
      },
    });

    return this.withUrls(updated);
  }

  async listByPlant(ownerId: string, plantId: string): Promise<AttachmentDto[]> {
    await this.ownership.requirePlant(plantId, ownerId);
    const items = await this.prisma.attachment.findMany({
      where: { plantId, ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(items.map((item) => this.withUrls(item)));
  }

  async get(ownerId: string, attachmentId: string): Promise<AttachmentDto> {
    const attachment = await this.ownership.requireAttachment(attachmentId, ownerId);
    return this.withUrls(attachment);
  }

  async remove(ownerId: string, attachmentId: string): Promise<MessageResponse> {
    const attachment = await this.ownership.requireAttachment(attachmentId, ownerId);
    await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
    await this.storage.deleteObject(attachment.storageKey);
    if (attachment.thumbnailKey) {
      await this.storage.deleteObject(attachment.thumbnailKey);
    }
    return { message: 'Вкладення видалено' };
  }

  private async withUrls(attachment: {
    id: string;
    ownerId: string;
    plantId: string | null;
    journalEntryId: string | null;
    problemId: string | null;
    harvestId: string | null;
    storageKey: string;
    thumbnailKey: string | null;
    originalFileName: string;
    mimeType: string;
    size: number;
    width: number | null;
    height: number | null;
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
    createdAt: Date;
    deletedAt: Date | null;
  }): Promise<AttachmentDto> {
    if (attachment.status !== 'CONFIRMED') {
      return toAttachmentDto(attachment);
    }
    const downloadUrl = await this.storage.createDownloadUrl(attachment.storageKey);
    const thumbnailUrl = attachment.thumbnailKey
      ? await this.storage.createDownloadUrl(attachment.thumbnailKey)
      : undefined;
    return toAttachmentDto(attachment, { downloadUrl, thumbnailUrl });
  }

  private async resolveParentLinks(
    ownerId: string,
    input: CreateUploadUrlInput,
  ): Promise<{
    plantId: string | null;
    journalEntryId: string | null;
    problemId: string | null;
    harvestId: string | null;
  }> {
    let plantId = input.plantId ?? null;
    const journalEntryId = input.journalEntryId ?? null;
    const problemId = input.problemId ?? null;
    const harvestId = input.harvestId ?? null;

    if (journalEntryId) {
      const entry = await this.ownership.requireJournalEntry(journalEntryId, ownerId);
      plantId = entry.plantId;
    } else if (problemId) {
      const problem = await this.ownership.requireProblem(problemId, ownerId);
      plantId = problem.plantId;
    } else if (harvestId) {
      const harvest = await this.ownership.requireHarvest(harvestId, ownerId);
      plantId = harvest.plantId;
    } else if (plantId) {
      await this.ownership.requirePlant(plantId, ownerId);
    }

    return { plantId, journalEntryId, problemId, harvestId };
  }

  private async failAndCleanup(attachmentId: string, storageKey: string): Promise<void> {
    await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { status: 'FAILED' },
    });
    await this.storage.deleteObject(storageKey);
  }
}

function extensionFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}
