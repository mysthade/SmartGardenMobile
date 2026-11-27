import { validateEnv } from './env.validation';

const baseEnv = {
  NODE_ENV: 'development',
  WEB_URL: 'http://localhost:3000',
  API_URL: 'http://localhost:3001',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://smartgarden:smartgarden@localhost:5432/smartgarden',
  REDIS_URL: 'redis://localhost:6379',
  ACCESS_TOKEN_SECRET: 'dev-access-token-secret-change-me-32chars-min',
  REFRESH_TOKEN_SECRET: 'dev-refresh-token-secret-change-me-32chars',
  COOKIE_SECRET: 'dev-cookie-secret-change-me-32-characters!',
  CSRF_SECRET: 'dev-csrf-secret-change-me-32-characters!!',
  EMAIL_FROM: 'Smart Garden <noreply@smartgarden.local>',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'smart-garden',
  S3_ACCESS_KEY: 'minioadmin',
  S3_SECRET_KEY: 'minioadmin',
};

describe('validateEnv', () => {
  it('accepts valid development configuration', () => {
    const env = validateEnv(baseEnv);
    expect(env.API_PORT).toBe(3001);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
  });

  it('rejects production with default secrets', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
      }),
    ).toThrow(/default development secrets/i);
  });

  it('rejects short secrets', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        ACCESS_TOKEN_SECRET: 'too-short',
      }),
    ).toThrow(/Invalid environment configuration/i);
  });
});
