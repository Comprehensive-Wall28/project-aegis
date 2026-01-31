import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(), // Logger is now handled by nestjs-pino
    { bufferLogs: true } // Buffer logs until custom logger is attached
  );

  await app.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET
  });

  app.useLogger(app.get(Logger));

  // MATCHING OLD BACKEND PREFIX
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Trust proxy for Render
  const adapter = app.getHttpAdapter().getInstance() as any;
  adapter.trustProxy = 1;

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  const logger = app.get(Logger);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
