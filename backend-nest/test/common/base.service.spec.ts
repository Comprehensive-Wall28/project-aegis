import { Test, TestingModule } from '@nestjs/testing';
import { BaseService, AuditAction, AuditStatus } from '../../src/common/services/base.service';
import { ServiceError } from '../../src/common/services/service.error';
import { BaseRepository } from '../../src/common/database/base.repository';
import { RepositoryError, RepositoryErrorCode } from '../../src/common/database/repository.error';
import { Document } from 'mongoose';

// Mock Document
interface MockDoc extends Document {
    name: string;
}

// Mock Repository
class MockRepository extends BaseRepository<MockDoc> {
    constructor() {
        super({} as any); // Mock model
    }
}

// Concrete Service for testing
class TestService extends BaseService<MockDoc, MockRepository> {
    // Expose protected methods for testing
    public testValidateId(id: unknown, fieldName?: string): string {
        return this.validateId(id, fieldName);
    }

    public testValidateEnum(value: unknown, valid: string[], field: string): string {
        return this.validateEnum(value, valid, field);
    }

    public testValidateRequired(data: Record<string, unknown>, fields: string[]): void {
        this.validateRequired(data, fields);
    }

    public testHandleRepositoryError(error: unknown): never {
        return this.handleRepositoryError(error);
    }

    public testLogAction(userId: string, action: AuditAction, status: AuditStatus, details?: Record<string, unknown>): void {
        this.logAction(userId, action, status, details);
    }
}

describe('BaseService', () => {
    let service: TestService;
    let repository: MockRepository;

    beforeEach(async () => {
        repository = new MockRepository();
        service = new TestService(repository);
    });

    describe('validateId', () => {
        it('should return sanitized ID string for valid ObjectId', () => {
            const validId = '507f1f77bcf86cd799439011';
            const result = service.testValidateId(validId);
            expect(result).toBe(validId);
        });

        it('should throw ServiceError for invalid format', () => {
            expect(() => service.testValidateId('invalid-id')).toThrow(ServiceError);
            expect(() => service.testValidateId('invalid-id')).toThrow('Invalid id format');
        });

        it('should throw ServiceError for non-string', () => {
            expect(() => service.testValidateId(123)).toThrow(ServiceError);
        });

        it('should throw ServiceError for null/undefined', () => {
            expect(() => service.testValidateId(null)).toThrow(ServiceError);
            expect(() => service.testValidateId(undefined)).toThrow(ServiceError);
        });
    });

    describe('validateEnum', () => {
        const VALID_VALUES = ['A', 'B', 'C'];

        it('should return value for valid enum', () => {
            const result = service.testValidateEnum('A', VALID_VALUES, 'status');
            expect(result).toBe('A');
        });

        it('should throw ServiceError for invalid enum', () => {
            expect(() => service.testValidateEnum('D', VALID_VALUES, 'status')).toThrow(ServiceError);
            expect(() => service.testValidateEnum('D', VALID_VALUES, 'status')).toThrow('Must be one of: A, B, C');
        });
    });

    describe('validateRequired', () => {
        it('should pass given all required fields', () => {
            const data = { name: 'test', age: 10 };
            expect(() => service.testValidateRequired(data, ['name', 'age'])).not.toThrow();
        });

        it('should throw ServiceError if field is missing', () => {
            const data = { name: 'test' };
            expect(() => service.testValidateRequired(data, ['name', 'age'])).toThrow(ServiceError);
            expect(() => service.testValidateRequired(data, ['name', 'age'])).toThrow('Missing required fields: age');
        });

        it('should throw ServiceError if field is null or empty string', () => {
            const data = { name: '', age: null };
            expect(() => service.testValidateRequired(data as any, ['name'])).toThrow(ServiceError);
            expect(() => service.testValidateRequired(data as any, ['age'])).toThrow(ServiceError);
        });
    });

    describe('handleRepositoryError', () => {
        it('should map NOT_FOUND to 404', () => {
            const error = new RepositoryError('Not found', RepositoryErrorCode.NOT_FOUND);
            try {
                service.testHandleRepositoryError(error);
            } catch (e) {
                expect(e).toBeInstanceOf(ServiceError);
                expect(e.statusCode).toBe(404);
                expect(e.message).toBe('Resource not found');
            }
        });

        it('should map DUPLICATE_KEY to 409', () => {
            const error = new RepositoryError('Duplicate', RepositoryErrorCode.DUPLICATE_KEY);
            try {
                service.testHandleRepositoryError(error);
            } catch (e) {
                expect(e).toBeInstanceOf(ServiceError);
                expect(e.statusCode).toBe(409);
                expect(e.code).toBe('DUPLICATE');
            }
        });

        it('should rethrow ServiceError', () => {
            const error = new ServiceError('Custom error', 418);
            try {
                service.testHandleRepositoryError(error);
            } catch (e) {
                expect(e).toBeInstanceOf(ServiceError);
                expect(e.statusCode).toBe(418);
                expect(e.message).toBe('Custom error');
            }
        });

        it('should map unknown errors to 500', () => {
            const error = new Error('Unknown');
            try {
                service.testHandleRepositoryError(error);
            } catch (e) {
                expect(e).toBeInstanceOf(ServiceError);
                expect(e.statusCode).toBe(500);
                expect(e.code).toBe('INTERNAL_ERROR');
            }
        });
    });
});
