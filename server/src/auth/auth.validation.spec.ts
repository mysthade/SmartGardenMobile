import { registerSchema, loginSchema, updateProfileSchema } from '@smart-garden/validation';

describe('auth validation schemas', () => {
  it('accepts valid register payload', () => {
    const parsed = registerSchema.parse({
      name: 'Олена',
      email: 'Olena@Example.com',
      password: 'garden-secure-1',
    });
    expect(parsed.email).toBe('olena@example.com');
  });

  it('rejects short passwords', () => {
    const result = registerSchema.safeParse({
      name: 'Олена',
      email: 'olena@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('requires login credentials', () => {
    const result = loginSchema.safeParse({ email: 'bad', password: '' });
    expect(result.success).toBe(false);
  });

  it('requires at least one profile field', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
