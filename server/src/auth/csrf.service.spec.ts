import { ConfigService } from '@nestjs/config';
import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  const config = {
    get: (key: string) => {
      if (key === 'CSRF_SECRET') {
        return 'dev-csrf-secret-change-me-32-characters!!';
      }
      if (key === 'NODE_ENV') {
        return 'test';
      }
      return undefined;
    },
  } as unknown as ConfigService;

  const service = new CsrfService(config as never);

  it('issues and validates matching tokens', () => {
    const token = service.issueToken();
    expect(() => service.validate(token, token)).not.toThrow();
  });

  it('rejects mismatched tokens', () => {
    const token = service.issueToken();
    expect(() => service.validate(token, 'other')).toThrow();
  });
});
