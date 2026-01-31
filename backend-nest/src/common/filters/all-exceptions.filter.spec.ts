import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ServiceError } from '../services/base.service';
import { RepositoryError, RepositoryErrorCode } from '../repositories/types';

describe('AllExceptionsFilter', () => {
    let filter: AllExceptionsFilter;

    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
    };

    const mockRequest = {
        method: 'GET',
        url: '/test',
    };

    const mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnThis(),
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
    } as unknown as ArgumentsHost;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AllExceptionsFilter],
        }).compile();

        filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
        jest.clearAllMocks();
    });

    it('should catch HttpException and return correct response', () => {
        const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
        expect(mockResponse.send).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: HttpStatus.FORBIDDEN,
            message: 'Forbidden',
        }));
    });

    it('should catch ServiceError and return correct response', () => {
        const exception = new ServiceError('Service Failed', 400, 'ERR_CODE');
        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(mockResponse.send).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Service Failed',
            code: 'ERR_CODE',
        }));
    });

    it('should catch RepositoryError (NOT_FOUND) and return 404', () => {
        const exception = new RepositoryError('Not Found', RepositoryErrorCode.NOT_FOUND);
        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
        expect(mockResponse.send).toHaveBeenCalledWith(expect.objectContaining({
            code: 'NOT_FOUND',
        }));
    });

    it('should catch RepositoryError (DUPLICATE_KEY) and return 409', () => {
        const exception = new RepositoryError('Conflict', RepositoryErrorCode.DUPLICATE_KEY);
        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
        expect(mockResponse.send).toHaveBeenCalledWith(expect.objectContaining({
            code: 'DUPLICATE',
        }));
    });

    it('should catch unknown exception and return 500', () => {
        const exception = new Error('Panic');
        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockResponse.send).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
        }));
    });
});
