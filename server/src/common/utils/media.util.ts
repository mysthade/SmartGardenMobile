import type { HarvestUnit } from '@smart-garden/types';

/** Convert harvest quantity to grams when unit is mass-based; otherwise null. */
export function toQuantityGrams(quantity: string, unit: HarvestUnit): string | null {
  const value = Number(quantity);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  if (unit === 'GRAM') {
    return String(value);
  }
  if (unit === 'KILOGRAM') {
    return String(value * 1000);
  }
  return null;
}

export function detectImageMime(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  // Reject SVG and everything else
  const head = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').toLowerCase();
  if (head.includes('<svg') || head.includes('<?xml')) {
    return null;
  }
  return null;
}
