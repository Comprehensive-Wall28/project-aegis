import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../modules/audit/audit.service';
import {
  AuditAction,
  AuditStatus,
} from '../../modules/audit/schemas/audit-log.schema';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : (exception as Error).message || 'Internal server error';

    // Log to audit if 500 or critical
    if (status >= 500) {
      this.logger.error(
        `Http Exception: ${message}`,
        (exception as Error).stack,
      );

      const userId = (request as any).user?.id; // Ensure User is attached by guard/middleware

      await this.auditService.log({
        userId,
        action: AuditAction.API_ERROR,
        status: AuditStatus.FAILURE,
        ipAddress: request.ip,
        metadata: {
          path: request.url,
          method: request.method,
          statusCode: status,
          errorMessage: message,
          // stack: this.configService.get('nodeEnv') !== 'production' ? (exception as Error).stack : undefined
        },
      });
    }

    const responseBody = {
      message,
      stack:
        this.configService.get('nodeEnv') !== 'production' &&
        exception instanceof Error
          ? exception.stack
          : null,
    };

    // If specific error codes exist (like CSRF), handle them.
    // e.g. EBADCSRFTOKEN mapping to 403 is done by Fastify or Guard usually, but if it bubbles up:
    if ((exception as any).code === 'EBADCSRFTOKEN') {
      response
        .status(403)
        .send({ code: 'EBADCSRFTOKEN', message: 'Invalid CSRF token' });
      return;
    }

    response.status(status).send(responseBody);
  }
}
