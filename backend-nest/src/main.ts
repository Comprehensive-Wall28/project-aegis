import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
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

  const configService = app.get(ConfigService);
  const clientOrigin = configService.get<string>('CLIENT_ORIGIN') || 'http://localhost:5173';

  app.enableCors({
    origin: clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-xsrf-token', 'x-csrf-token'],
  });

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

  // Force shutdown if graceful shutdown fails/hangs
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Shutting down gracefully...`);
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000); // 10s timeout

    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
bootstrap();
