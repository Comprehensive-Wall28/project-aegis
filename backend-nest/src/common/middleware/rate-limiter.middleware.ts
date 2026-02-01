import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

/**
 * Rate limiting middleware matching legacy backend implementation.
 * Two separate limiters: one for general API, one for auth endpoints.
 */

let apiLimiterInstance: any = null;
let authLimiterInstance: any = null;

function getApiLimiter(configService: ConfigService) {
  if (apiLimiterInstance) {
    return apiLimiterInstance;
  }

  const apiRateLimit = configService.get<number>('API_RATE_LIMIT') || 100;

  apiLimiterInstance = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: apiRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  });

  return apiLimiterInstance;
}

function getAuthLimiter(configService: ConfigService) {
  if (authLimiterInstance) {
    return authLimiterInstance;
  }

  const authRateLimit = configService.get<number>('AUTH_RATE_LIMIT') || 20;

  authLimiterInstance = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: authRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message:
      'Too many login attempts from this IP, please try again after an hour',
  });

  return authLimiterInstance;
}

@Injectable()
export class ApiRateLimiterMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const limiter = getApiLimiter(this.configService);
    limiter(req, res, next);
  }
}

@Injectable()
export class AuthRateLimiterMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const limiter = getAuthLimiter(this.configService);
    limiter(req, res, next);
  }
}
