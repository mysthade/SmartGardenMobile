import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies with argon2id', async () => {
    const hash = await service.hash('correct-horse-battery');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(service.verify(hash, 'correct-horse-battery')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('rejects common passwords', () => {
    expect(() => service.assertPolicy('password1234')).toThrow();
  });
});
