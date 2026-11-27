import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { validationError } from '../common/errors/http-errors';

const COMMON_PASSWORDS = new Set(
  [
    'password',
    'password123',
    'password1234',
    '1234567890',
    'qwertyuiop',
    'iloveyou123',
    'adminadmin',
    'welcome123',
    'letmein1234',
    'smartgarden',
    'smartgarden1',
  ].map((value) => value.toLowerCase()),
);

const SALT_BYTES = 16;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    this.assertPolicy(password);
    const salt = randomBytes(SALT_BYTES);
    return argon2.hash(password, {
      type: argon2.argon2id,
      salt,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  assertPolicy(password: string): void {
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      throw validationError({ password: ['Пароль занадто поширений'] });
    }
  }
}
