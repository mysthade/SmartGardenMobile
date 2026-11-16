import { Injectable } from '@nestjs/common';
import type { MessageResponse, UserPublicDto } from '@smart-garden/types';
import type { UpdateProfileInput } from '@smart-garden/validation';
import { notFound } from '../common/errors/http-errors';
import { toUserPublicDto } from '../common/mappers/user.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

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

    return toUserPublicDto(user);
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
}
