import { generateOpaqueToken, safeEqual, sha256 } from './crypto.util';

describe('crypto.util', () => {
  it('generates opaque tokens', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it('hashes deterministically', () => {
    expect(sha256('abc')).toEqual(sha256('abc'));
    expect(sha256('abc')).not.toEqual(sha256('abd'));
  });

  it('compares safely', () => {
    expect(safeEqual('same', 'same')).toBe(true);
    expect(safeEqual('same', 'diff')).toBe(false);
  });
});
