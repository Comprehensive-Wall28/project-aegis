import { Document } from 'mongoose';
import { Logger } from '@nestjs/common';
import { BaseRepository } from '../repositories/base.repository';
import { RepositoryError, RepositoryErrorCode } from '../repositories/types';

// We should use FastifyRequest for typing if possible since we are on Fastify
import { FastifyRequest } from 'fastify';

/**
 * ServiceError for consistent error handling in service layer
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Audit types placeholder until actual AuditLog model is migrated
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_DELETE = 'FILE_DELETE',
  CALENDAR_CREATE = 'CALENDAR_CREATE',
  CALENDAR_UPDATE = 'CALENDAR_UPDATE',
  CALENDAR_DELETE = 'CALENDAR_DELETE',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

/**
 * BaseService provides common business logic patterns
 * Services handle validation, business rules, and audit logging
 */
export abstract class BaseService<
  T extends Document,
  R extends BaseRepository<T>,
> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly repository: R) {}

  /**
   * Validate an ID and throw ServiceError if invalid
   */
  protected validateId(id: unknown, fieldName: string = 'ID'): string {
    if (typeof id !== 'string' || !id.trim()) {
      throw new ServiceError(`Invalid ${fieldName}`, 400, 'INVALID_ID');
    }
    return id.trim();
  }

  /**
   * Validate that a value is one of the allowed enum values
   */
  protected validateEnum<E extends string>(
    value: unknown,
    validValues: readonly E[],
    fieldName: string,
  ): E {
    const stringValue = String(value);
    if (!validValues.includes(stringValue as E)) {
      throw new ServiceError(
        `Invalid ${fieldName}. Must be one of: ${validValues.join(', ')}`,
        400,
        'INVALID_ENUM',
      );
    }
    return stringValue as E;
  }

  /**
   * Validate required fields are present
   */
  protected validateRequired(
    data: Record<string, unknown>,
    requiredFields: string[],
  ): void {
    const missing = requiredFields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === '',
    );

    if (missing.length > 0) {
      throw new ServiceError(
        `Missing required fields: ${missing.join(', ')}`,
        400,
        'MISSING_FIELDS',
      );
    }
  }

  /**
   * Log an audit event (fire-and-forget for performance)
   * Audit logs are written asynchronously without blocking the main request
   */
  protected logAction(
    userId: string,
    action: AuditAction,
    status: AuditStatus,
    req: FastifyRequest | Record<string, any>, // Allow generic object for flexibility
    details: Record<string, unknown> = {},
  ): void {
    // Implement actual AuditLogService injection and usage once Audit module is migrated.
    // For now, we log to stdout for debugging
    this.logger.log(
      `AUDIT [${action}] User=${userId} Status=${status}`,
      details,
    );
  }

  /**
   * Handle repository errors and convert to ServiceError
   */
  protected handleRepositoryError(error: unknown): never {
    if (error instanceof RepositoryError) {
      switch (error.code) {
        case RepositoryErrorCode.NOT_FOUND:
          throw new ServiceError('Resource not found', 404, 'NOT_FOUND');
        case RepositoryErrorCode.INVALID_ID:
          throw new ServiceError('Invalid ID format', 400, 'INVALID_ID');
        case RepositoryErrorCode.DUPLICATE_KEY:
          throw new ServiceError('Resource already exists', 409, 'DUPLICATE');
        case RepositoryErrorCode.VALIDATION_ERROR:
          throw new ServiceError('Validation failed', 400, 'VALIDATION_ERROR');
        default:
          throw new ServiceError(
            'Internal server error',
            500,
            'INTERNAL_ERROR',
          );
      }
    }

    if (error instanceof ServiceError) {
      throw error;
    }

    this.logger.error('Unexpected service error:', error);
    throw new ServiceError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
