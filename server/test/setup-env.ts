import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../.env') });
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
