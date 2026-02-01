import { FastifyRequest, FastifyReply } from 'fastify';

import { UserRole } from '../models/User';

/**
 * Authenticated user structure
 */
export interface AuthUser {
    id: string;
    username: string;
    role?: UserRole;
}

/**
 * Extended FastifyRequest with user authentication
 */
export interface AuthRequest extends FastifyRequest {
    user?: AuthUser;
    csrfToken?: string;
    startTime?: number; // For performance monitoring
}

/**
 * Standard Fastify handler type
 */
export type FastifyHandler = (
    request: FastifyRequest,
    reply: FastifyReply
) => Promise<any> | any;

/**
 * Authenticated handler type
 */
export type AuthHandler = (
    request: AuthRequest,
    reply: FastifyReply
) => Promise<any> | any;

/**
 * Route hook handler type
 */
export type HookHandler = (
    request: FastifyRequest,
    reply: FastifyReply
) => Promise<void> | void;

/**
 * Augment Fastify types to include our custom properties
 */
declare module 'fastify' {
    interface FastifyRequest {
        user?: AuthUser;
        csrfToken?: string;
        startTime?: number;
        startMemory?: number; // For memory usage tracking
    }
}
