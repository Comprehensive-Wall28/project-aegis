import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
    private readonly logger = new Logger(PerformanceInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<FastifyRequest>();
        const start = process.hrtime();
        const memoryStart = process.memoryUsage().heapUsed;

        return next
            .handle()
            .pipe(
                tap(() => {
                    const end = process.hrtime(start);
                    const duration = (end[0] * 1000) + (end[1] / 1e6); // ms
                    const memoryEnd = process.memoryUsage().heapUsed;

                    this.logger.debug({
                        message: 'Performance Metrics',
                        path: request.url,
                        method: request.method,
                        duration: `${duration.toFixed(2)}ms`,
                        memoryDelta: `${((memoryEnd - memoryStart) / 1024 / 1024).toFixed(2)}MB`,
                        heapUsed: `${(memoryEnd / 1024 / 1024).toFixed(2)}MB`,
                    });

                    if (duration > 1000) {
                        this.logger.warn(`Slow Request: ${request.method} ${request.url} took ${duration.toFixed(2)}ms`);
                    }
                }),
            );
    }
}
