import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacSha256(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function hashIp(ip: string | undefined): string | null {
  if (!ip) {
    return null;
  }
  return sha256(ip);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize('NFKC');
}
