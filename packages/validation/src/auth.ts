import { z } from 'zod';
import { emailSchema, nonEmptyTrimmedString, passwordSchema, uuidSchema } from './base';

export const clientTypeSchema = z.enum(['web', 'mobile']).default('web');

export const registerSchema = z.object({
  name: nonEmptyTrimmedString(2, 120),
  email: emailSchema,
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32).max(512),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  clientType: clientTypeSchema.optional(),
  deviceName: nonEmptyTrimmedString(1, 120).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(512).optional(),
  clientType: clientTypeSchema.optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(512),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z
  .object({
    name: nonEmptyTrimmedString(2, 120).optional(),
    preferredLanguage: z.enum(['uk', 'en']).optional(),
    preferredWeightUnit: z.enum(['GRAM', 'KILOGRAM']).optional(),
    preferredAreaUnit: z.enum(['SQUARE_METER', 'HECTARE']).optional(),
    timezone: nonEmptyTrimmedString(1, 64).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Потрібно передати хоча б одне поле',
  });

export const sessionIdParamSchema = z.object({
  sessionId: uuidSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
