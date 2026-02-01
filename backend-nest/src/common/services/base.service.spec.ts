import { Test, TestingModule } from '@nestjs/testing';
import {
  BaseService,
  ServiceError,
  AuditAction,
  AuditStatus,
} from './base.service';
import { BaseRepository } from '../repositories/base.repository';
import { RepositoryError, RepositoryErrorCode } from '../repositories/types';
import { Document } from 'mongoose';

class MockDoc extends Document {}
class MockRepo extends BaseRepository<MockDoc> {}
class MockService extends BaseService<MockDoc, MockRepo> {
  public testValidateId(id: any) {
    return this.validateId(id);
  }
  public testValidateEnum(v: any, vals: any, f: string) {
    return this.validateEnum(v, vals, f);
  }
  public testValidateRequired(d: any, f: string[]) {
    return this.validateRequired(d, f);
  }
  public testLogAction(
    u: string,
    a: AuditAction,
    s: AuditStatus,
    r: any,
    d?: any,
  ) {
    return this.logAction(u, a, s, r, d);
  }
  public testHandleError(e: any) {
    return this.handleRepositoryError(e);
  }
}

describe('BaseService', () => {
  let service: MockService;
  let repo: MockRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockService, { provide: MockRepo, useValue: {} }],
    }).compile();

    service = module.get<MockService>(MockService);
    repo = module.get<MockRepo>(MockRepo);
  });

  describe('validateId', () => {
    it('should return trimmed id', () => {
      expect(service.testValidateId(' id ')).toBe('id');
    });
    it('should throw for invalid id', () => {
      expect(() => service.testValidateId(null)).toThrow(ServiceError);
    });
  });

  describe('validateEnum', () => {
    it('should return value if valid', () => {
      expect(service.testValidateEnum('A', ['A', 'B'], 'field')).toBe('A');
    });
    it('should throw if invalid', () => {
      expect(() => service.testValidateEnum('C', ['A', 'B'], 'field')).toThrow(
        ServiceError,
      );
    });
  });

  describe('validateRequired', () => {
    it('should not throw if all present', () => {
      expect(() => service.testValidateRequired({ a: 1 }, ['a'])).not.toThrow();
    });
    it('should throw if missing', () => {
      expect(() => service.testValidateRequired({ a: '' }, ['a'])).toThrow(
        ServiceError,
      );
    });
  });

  describe('logAction', () => {
    it('should log to console', () => {
      const spy = jest.spyOn((service as any).logger, 'log');
      service.testLogAction('u', AuditAction.CREATE, AuditStatus.SUCCESS, {});
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleRepositoryError', () => {
    it('should convert RepositoryError to ServiceError', () => {
      const error = new RepositoryError(
        'Not found',
        RepositoryErrorCode.NOT_FOUND,
      );
      expect(() => service.testHandleError(error)).toThrow(ServiceError);
      try {
        service.testHandleError(error);
      } catch (e: any) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should handle duplicate key', () => {
      const error = new RepositoryError(
        'Dup',
        RepositoryErrorCode.DUPLICATE_KEY,
      );
      try {
        service.testHandleError(error);
      } catch (e: any) {
        expect(e.statusCode).toBe(409);
      }
    });

    it('should handle unknown errors', () => {
      expect(() => service.testHandleError(new Error('Panic'))).toThrow(
        ServiceError,
      );
    });
  });
});
