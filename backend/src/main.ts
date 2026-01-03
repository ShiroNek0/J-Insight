import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS with environment-based configuration
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Backend running on http://localhost:${port}`);
}
void bootstrap();
