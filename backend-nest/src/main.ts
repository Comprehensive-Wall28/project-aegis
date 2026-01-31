import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { initCryptoUtils } from './common/utils/cryptoUtils';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(), // Logger is now handled by nestjs-pino
    { bufferLogs: true } // Buffer logs until custom logger is attached
  );

  // Get config service once for all configuration
  const configService = app.get(ConfigService);

  // Register cookie parser
  await app.register(require('@fastify/cookie'), {
    secret: configService.get<string>('COOKIE_SECRET') || process.env.COOKIE_SECRET
  });

  // Register CSRF protection
  await app.register(require('@fastify/csrf-protection'), {
    cookieOpts: {
      signed: false,
      httpOnly: false, // Frontend needs to read XSRF-TOKEN cookie
      sameSite: configService.get<string>('NODE_ENV') === 'production' ? 'none' : 'lax',
      secure: configService.get<string>('NODE_ENV') === 'production',
    },
    sessionPlugin: '@fastify/cookie',
    cookieKey: 'XSRF-TOKEN', // Cookie name that frontend reads
    getToken: (req: any) => {
      // Check for token in header (sent by frontend)
      return req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];
    },
  });

  app.useLogger(app.get(Logger));

  // Initialize crypto utils with config service
  initCryptoUtils(configService);

  // MATCHING OLD BACKEND PREFIX
  app.setGlobalPrefix('api');

  const clientOrigin = configService.get<string>('CLIENT_ORIGIN') || 'http://localhost:5173';

  app.enableCors({
    origin: clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-xsrf-token', 'x-csrf-token', 'Content-Range'],
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
