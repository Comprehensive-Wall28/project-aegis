import { Document } from 'mongoose';
import { BaseRepository } from '../database/base.repository';
import { RepositoryError, RepositoryErrorCode } from '../database/repository.error';
import { ServiceError } from './service.error';
import { QuerySanitizer } from '../database/query-sanitizer';
import { Logger } from '@nestjs/common';

// Placeholder enums until Audit module is fully ported
export enum AuditAction {
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    UPLOAD = 'UPLOAD',
    DOWNLOAD = 'DOWNLOAD',
    SHARE = 'SHARE'
}

export enum AuditStatus {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    DENIED = 'DENIED'
}

/**
 * BaseService provides common business logic patterns.
 * Services handle validation, business rules, and audit logging.
 */
export abstract class BaseService<
    T extends Document,
    R extends BaseRepository<T>
> {
    protected readonly logger = new Logger(this.constructor.name);

    constructor(protected readonly repository: R) { }

    /**
     * Validate an ID and throw ServiceError if invalid.
     * Delegates to QuerySanitizer to ensure strict ObjectId compliance.
     */
    protected validateId(id: unknown, fieldName: string = 'id'): string {
        if (typeof id !== 'string') {
            throw new ServiceError(`Invalid ${fieldName}: must be a string`, 400, 'INVALID_ID');
        }

        const sanitized = QuerySanitizer.sanitizeObjectId(id);
        if (!sanitized) {
            throw new ServiceError(`Invalid ${fieldName} format`, 400, 'INVALID_ID');
        }

        return sanitized;
    }

    /**
     * Validate that a value is one of the allowed enum values.
     */
    protected validateEnum<E extends string>(
        value: unknown,
        validValues: readonly E[],
        fieldName: string
    ): E {
        const stringValue = String(value);
        if (!validValues.includes(stringValue as E)) {
            throw new ServiceError(
                `Invalid ${fieldName}. Must be one of: ${validValues.join(', ')}`,
                400,
                'VALIDATION_ERROR' // Mapping to standard code
            );
        }
        return stringValue as E;
    }

    /**
     * Validate required fields are present.
     */
    protected validateRequired(
        data: Record<string, unknown>,
        requiredFields: string[]
    ): void {
        const missing = requiredFields.filter(
            field => data[field] === undefined || data[field] === null || data[field] === ''
        );

        if (missing.length > 0) {
            throw new ServiceError(
                `Missing required fields: ${missing.join(', ')}`,
                400,
                'VALIDATION_ERROR'
            );
        }
    }

    /**
     * Log an audit event (placeholder implementation).
     */
    protected logAction(
        userId: string,
        action: AuditAction,
        status: AuditStatus,
        details: Record<string, unknown> = {}
    ): void {
        // Placeholder: Log to console/logger for now
        this.logger.log(`AUDIT [${action}] User=${userId} Status=${status} ${JSON.stringify(details)}`);
    }

    /**
     * Handle repository errors and convert to ServiceError.
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
                    throw new ServiceError('Internal server error', 500, 'INTERNAL_ERROR');
            }
        }

        if (error instanceof ServiceError) {
            throw error;
        }

        this.logger.error(`Unexpected service error: ${error}`);
        throw new ServiceError('Internal server error', 500, 'INTERNAL_ERROR');
    }
}
