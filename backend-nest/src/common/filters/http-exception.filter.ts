import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppConfigService } from '../../config/config.service';

// Basic ServiceError interface to match existing backend
interface ServiceError extends Error {
    statusCode: number;
    code?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    constructor(private configService: AppConfigService) { }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<FastifyReply>();
        const request = ctx.getRequest<FastifyRequest>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let stack: string | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            message = typeof res === 'string' ? res : (res as any).message || message;
            stack = exception.stack;
        } else if (this.isServiceError(exception)) {
            status = exception.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
            message = exception.message;
            stack = exception.stack;
        } else if (exception instanceof Error) {
            message = exception.message;
            stack = exception.stack;
        }

        // Log the error
        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url}`,
                stack,
                'HttpExceptionFilter',
            );
        } else {
            this.logger.warn(
                `${request.method} ${request.url} - ${status} - ${message}`
            );
        }

        const responseBody = {
            message,
            ...(this.configService.nodeEnv !== 'production' && { stack }),
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        response.status(status).send(responseBody);
    }

    private isServiceError(error: any): error is ServiceError {
        return error && typeof error.statusCode === 'number' && typeof error.message === 'string';
    }
}
