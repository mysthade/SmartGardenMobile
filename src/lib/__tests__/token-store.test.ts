import { refreshTokenStore, tokenStore } from '@/src/lib/token-store';

describe('tokenStore', () => {
  afterEach(() => {
    tokenStore.clear();
  });

  it('stores access token in memory', () => {
    expect(tokenStore.get()).toBeNull();
    tokenStore.set('access-123');
    expect(tokenStore.get()).toBe('access-123');
  });

  it('clears access token', () => {
    tokenStore.set('access-123');
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });
});

describe('refreshTokenStore (SecureStore)', () => {
  it('persists and removes refresh token', async () => {
    await refreshTokenStore.set('refresh-token-abcdef0123456789abcdef0123456789');
    expect(await refreshTokenStore.get()).toBe('refresh-token-abcdef0123456789abcdef0123456789');
    await refreshTokenStore.clear();
    expect(await refreshTokenStore.get()).toBeNull();
  });
});
