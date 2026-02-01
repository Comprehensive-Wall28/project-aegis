import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

/**
 * Decorator to get CSRF token from the request.
 * Usage: @CsrfToken() token: string
 */
export const CsrfToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return (request as any).generateCsrf?.() || null;
  },
);
