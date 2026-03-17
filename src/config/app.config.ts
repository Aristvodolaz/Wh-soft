import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT ?? '3030', 10),
  env: process.env.APP_ENV ?? 'development',
  corsOrigin: process.env.APP_CORS_ORIGIN ?? '*',
  isProduction: process.env.APP_ENV === 'production',
  isDevelopment: process.env.APP_ENV === 'development',
  isTest: process.env.APP_ENV === 'test',
}));
