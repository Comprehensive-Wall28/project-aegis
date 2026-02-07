import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsBufferService } from '../../modules/analytics/analytics-buffer.service';

@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  constructor(private analyticsBuffer: AnalyticsBufferService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = process.hrtime.bigint();
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const res = context.switchToHttp().getResponse<FastifyReply>();

    return next.handle().pipe(
      tap(() => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;

        // Extract user ID from request (populated by Guard/Strategy)
        // Note: Fastify request user might be at `req.user`
        const userId = (req as any).user?.id || (req as any).user?._id;

        const { statusCode } = res;

        this.analyticsBuffer.queueMetric({
          method: req.method,
          path: req.url, // Fastify url
          statusCode: statusCode, // might be undefined if not sent yet?
          durationMs,
          userId: userId?.toString(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date(),
          metadata: {
            // We can capture query params, etc. if needed
            query: req.query,
          },
        });
      }),
    );
  }
}
