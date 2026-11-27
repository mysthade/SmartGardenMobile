import { createHarvestSchema, createUploadUrlSchema } from '@smart-garden/validation';
import { detectImageMime, toQuantityGrams } from '../common/utils/media.util';

describe('harvest helpers', () => {
  it('converts kg and g to grams', () => {
    expect(toQuantityGrams('1.5', 'KILOGRAM')).toBe('1500');
    expect(toQuantityGrams('250', 'GRAM')).toBe('250');
    expect(toQuantityGrams('3', 'PIECE')).toBeNull();
  });

  it('accepts harvest payload', () => {
    const parsed = createHarvestSchema.parse({
      harvestedAt: '2026-06-01T10:00:00.000Z',
      quantity: 2,
      unit: 'KILOGRAM',
    });
    expect(parsed.unit).toBe('KILOGRAM');
    expect(parsed.quality).toBe('GOOD');
  });
});

describe('media mime detection', () => {
  it('detects jpeg/png/webp magic bytes', () => {
    expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      'image/png',
    );
    const webp = Buffer.alloc(12);
    webp.write('RIFF', 0);
    webp.write('WEBP', 8);
    expect(detectImageMime(webp)).toBe('image/webp');
  });

  it('rejects svg-like payloads', () => {
    expect(
      detectImageMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    ).toBeNull();
  });
});

describe('upload validation', () => {
  it('rejects oversized files in schema', () => {
    const result = createUploadUrlSchema.safeParse({
      originalFileName: 'big.jpg',
      mimeType: 'image/jpeg',
      size: 11 * 1024 * 1024,
      plantId: '11111111-1111-1111-1111-111111111111',
    });
    expect(result.success).toBe(false);
  });

  it('rejects svg mime', () => {
    const result = createUploadUrlSchema.safeParse({
      originalFileName: 'x.svg',
      mimeType: 'image/svg+xml',
      size: 100,
      plantId: '11111111-1111-1111-1111-111111111111',
    });
    expect(result.success).toBe(false);
  });
});
