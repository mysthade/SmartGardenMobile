import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const config = {
    get: (key: string) => {
      if (key === 'ACCESS_TOKEN_SECRET') {
        return 'test-access-token-secret-change-me-32chars!!';
      }
      if (key === 'ACCESS_TOKEN_TTL_SECONDS') {
        return 900;
      }
      return undefined;
    },
  } as unknown as ConfigService;

  const service = new TokenService(config as never);

  it('signs and verifies access tokens', async () => {
    const token = await service.signAccessToken({
      sub: '11111111-1111-1111-1111-111111111111',
      email: 'user@example.com',
      sid: '22222222-2222-2222-2222-222222222222',
    });

    const payload = await service.verifyAccessToken(token);
    expect(payload.sub).toBe('11111111-1111-1111-1111-111111111111');
    expect(payload.email).toBe('user@example.com');
    expect(payload.sid).toBe('22222222-2222-2222-2222-222222222222');
  });

  it('rejects invalid tokens', async () => {
    await expect(service.verifyAccessToken('not-a-jwt')).rejects.toThrow();
  });
});
