import type { User } from '@prisma/client';
import type { UserPublicDto } from '@smart-garden/types';

export function toUserPublicDto(user: User): UserPublicDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    preferredLanguage: user.preferredLanguage as UserPublicDto['preferredLanguage'],
    preferredWeightUnit: user.preferredWeightUnit,
    preferredAreaUnit: user.preferredAreaUnit,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
