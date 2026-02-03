/**
 * Repository error types for consistent error handling
 */
export class RepositoryError extends Error {
    constructor(
        message: string,
        public readonly code: RepositoryErrorCode,
        public readonly cause?: unknown
    ) {
        super(message);
        this.name = 'RepositoryError';
    }
}

export enum RepositoryErrorCode {
    NOT_FOUND = 'NOT_FOUND',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    DUPLICATE_KEY = 'DUPLICATE_KEY',
    INVALID_ID = 'INVALID_ID',
    QUERY_ERROR = 'QUERY_ERROR',
    CONNECTION_ERROR = 'CONNECTION_ERROR',
}
