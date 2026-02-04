import 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: string;
            username: string;
            email?: string;
            tokenVersion?: number;
            _id?: string;
        };
        _analyticsStartTime?: bigint;
        _errorMessage?: string;
    }

    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        csrfProtection: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        csrfTokenCookie: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
