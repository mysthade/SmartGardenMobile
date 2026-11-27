import { Body, Controller, Delete, HttpCode, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { MessageResponse, UserPublicDto } from '@smart-garden/types';
import { updateProfileSchema, type UpdateProfileInput } from '@smart-garden/validation';
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

  @Delete()
  @HttpCode(200)
  async remove(@CurrentUser() user: AuthUser): Promise<MessageResponse> {
    return this.profile.softDelete(user.id);
  }
}
