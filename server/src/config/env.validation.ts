import { z } from 'zod';

const secretSchema = z.string().min(32, 'Secret must be at least 32 characters');

const DEFAULT_DEV_SECRETS = new Set([
  'dev-access-token-secret-change-me-32chars-min',
  'dev-refresh-token-secret-change-me-32chars',
  'dev-cookie-secret-change-me-32-characters!',
  'dev-csrf-secret-change-me-32-characters!!',
  'minioadmin',
]);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    WEB_URL: z.string().url(),
    API_URL: z.string().url(),
    ALLOWED_ORIGINS: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    ACCESS_TOKEN_SECRET: secretSchema,
    REFRESH_TOKEN_SECRET: secretSchema,
    COOKIE_SECRET: secretSchema,
    CSRF_SECRET: secretSchema,
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),
    EMAIL_VERIFICATION_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
    PASSWORD_RESET_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
    EMAIL_FROM: z.string().min(3),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASSWORD: z.string().optional().default(''),
    SMTP_SECURE: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => value === true || value === 'true')
      .default(false),
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().min(1).optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY: z.string().min(1).optional(),
    S3_SECRET_KEY: z.string().min(1).optional(),
    S3_FORCE_PATH_STYLE: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => value === true || value === 'true')
      .default(true),
    API_PORT: z.coerce.number().int().positive().default(3001),
    API_BODY_LIMIT: z.string().default('1mb'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    SWAGGER_ENABLED: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => value === true || value === 'true')
      .optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      const secrets = [
        env.ACCESS_TOKEN_SECRET,
        env.REFRESH_TOKEN_SECRET,
        env.COOKIE_SECRET,
        env.CSRF_SECRET,
        ...(env.S3_ACCESS_KEY ? [env.S3_ACCESS_KEY] : []),
        ...(env.S3_SECRET_KEY ? [env.S3_SECRET_KEY] : []),
      ];
      for (const secret of secrets) {
        if (DEFAULT_DEV_SECRETS.has(secret)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Production must not use default development secrets',
          });
          break;
        }
      }
      if (env.ALLOWED_ORIGINS.includes('*')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ALLOWED_ORIGINS must not contain wildcard in production',
          path: ['ALLOWED_ORIGINS'],
        });
      }
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return parsed.data;
}

export function getAllowedOrigins(allowedOrigins: string): string[] {
  return allowedOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
