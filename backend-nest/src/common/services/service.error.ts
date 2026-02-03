export class ServiceError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 500,
        public readonly code?: string
    ) {
        super(message);
        this.name = 'ServiceError';
    }
}
