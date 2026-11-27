import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { validateEnv } from './env.validation';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '..', '..', '.env'),
        join(__dirname, '..', '..', '..', '..', '.env'),
      ],
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
