import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

/**
 * CSRF Guard for protecting routes using Fastify's CSRF protection.
 * This guard can be applied at the route or controller level.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Skip CSRF check for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(request.method)) {
      return true;
    }

    try {
      // Fastify's CSRF plugin adds a csrfProtection method to the request
      await (request as any).csrfProtection();
      return true;
    } catch (error) {
      throw new ForbiddenException('Invalid CSRF token');
    }
  }
}
