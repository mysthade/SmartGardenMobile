import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies with argon2id and unique random salt per hash', async () => {
    const hash1 = await service.hash('correct-horse-battery');
    const hash2 = await service.hash('correct-horse-battery');
    expect(hash1.startsWith('$argon2id$')).toBe(true);
    expect(hash1).not.toBe(hash2);
    expect(hash1.split('$')[4]).not.toBe(hash2.split('$')[4]);
    await expect(service.verify(hash1, 'correct-horse-battery')).resolves.toBe(true);
    await expect(service.verify(hash2, 'correct-horse-battery')).resolves.toBe(true);
    await expect(service.verify(hash1, 'wrong-password')).resolves.toBe(false);
  });

  it('rejects common passwords', () => {
    expect(() => service.assertPolicy('password1234')).toThrow();
  });
});
