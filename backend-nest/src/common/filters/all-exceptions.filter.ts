import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ServiceError } from '../services/base.service';
import { RepositoryError, RepositoryErrorCode } from '../repositories/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
      code = (res as any).error || 'HTTP_ERROR';
    } else if (exception instanceof ServiceError) {
      status = exception.statusCode;
      message = exception.message;
      code = exception.code || 'SERVICE_ERROR';
    } else if (exception instanceof RepositoryError) {
      // Map repository errors if they escalate this far (usually caught in service)
      switch (exception.code) {
        case RepositoryErrorCode.NOT_FOUND:
          status = HttpStatus.NOT_FOUND;
          message = 'Resource not found';
          code = 'NOT_FOUND';
          break;
        case RepositoryErrorCode.DUPLICATE_KEY:
          status = HttpStatus.CONFLICT;
          message = 'Resource already exists';
          code = 'DUPLICATE';
          break;
        case RepositoryErrorCode.INVALID_ID:
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid ID';
          code = 'INVALID_ID';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = exception.message;
          code = exception.code;
      }
    }

    // Log critical errors (500s)
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} : ${status} - ${message}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else {
      // Warning or Info for client errors
      this.logger.warn(
        `[${request.method}] ${request.url} : ${status} - ${message}`,
      );
    }

    response.status(status).send({
      statusCode: status,
      message,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
