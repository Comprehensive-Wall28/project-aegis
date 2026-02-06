import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AnalyticsInterceptor } from './common/interceptors/analytics.interceptor';
import { AnalyticsBufferService } from './modules/analytics/analytics-buffer.service';
import { AuditService } from './modules/audit/audit.service';
import fastifyCookie from '@fastify/cookie';
import fastifyCsrf from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap'); // Create a logger instance for bootstrap
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true, // Enable Fastify logger for now
      trustProxy: true,
    }),
  );

  const configService = app.get(ConfigService);
  const auditService = app.get(AuditService);
  const analyticsBuffer = app.get(AnalyticsBufferService);

  // Security Plugins
  await app.register(helmet);
  await app.register(fastifyCookie, {
    secret: configService.get<string>('app.auth.cookieEncryptionKey') || 'fallback-secret', // Type requires string
  });

  // CSRF Protection
  // We use the same generic logic as backend: XSRF-TOKEN cookie + X-XSRF-TOKEN header.
  await app.register(fastifyCsrf, {
    cookieOpts: {
      signed: true,
      httpOnly: false, // Frontend reads it
      path: '/',
      secure: configService.get('app.nodeEnv') === 'production',
    },
    getToken: (req) => {
      // Fastify CSRF looks for token in body/query by default, and verifies against session/cookie secret.
      // We need to clarify if "getToken" is for extracting the token FROM THE REQUEST to verify.
      // Fastify default behavior: checks `req.body._csrf` or `req.headers['csrf-token']` etc.
      // We want `req.headers['x-xsrf-token']`.
      return (req.headers['x-xsrf-token'] as string) || (req.headers['location'] as string); // location? just check headers
    }
  });


  // Global Pipes & Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(configService, auditService));
  app.useGlobalInterceptors(new AnalyticsInterceptor(analyticsBuffer));

  // CORS
  app.enableCors({
    origin: configService.get('app.webAuthn.clientOrigin'),
    credentials: true,
  });

  const port = configService.get('app.port');
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
