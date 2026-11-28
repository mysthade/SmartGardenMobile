import { Body, Controller, Delete, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AvatarUploadUrlResponse, MessageResponse, UserPublicDto } from '@smart-garden/types';
import {
  avatarUploadUrlSchema,
  confirmAvatarSchema,
  updateProfileSchema,
  type AvatarUploadUrlInput,
  type ConfirmAvatarInput,
  type UpdateProfileInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Patch()
  async update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ): Promise<UserPublicDto> {
    return this.profile.update(user.id, body);
  }

  @Post('avatar/upload-url')
  async createAvatarUploadUrl(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(avatarUploadUrlSchema)) body: AvatarUploadUrlInput,
  ): Promise<AvatarUploadUrlResponse> {
    return this.profile.createAvatarUploadUrl(user.id, body);
  }

  @Post('avatar/confirm')
  @HttpCode(200)
  async confirmAvatar(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(confirmAvatarSchema)) body: ConfirmAvatarInput,
  ): Promise<UserPublicDto> {
    return this.profile.confirmAvatar(user.id, body.storageKey);
  }

  @Delete('avatar')
  @HttpCode(200)
  async removeAvatar(@CurrentUser() user: AuthUser): Promise<UserPublicDto> {
    return this.profile.removeAvatar(user.id);
  }

  @Delete()
  @HttpCode(200)
  async remove(@CurrentUser() user: AuthUser): Promise<MessageResponse> {
    return this.profile.softDelete(user.id);
  }
}
