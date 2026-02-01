import { FastifyRequest } from 'fastify';

/**
 * Extract and validate query parameters
 */
export const getQueryParam = (
    request: FastifyRequest,
    key: string,
    defaultValue?: string
): string | undefined => {
    const value = (request.query as any)[key];
    return value !== undefined ? String(value) : defaultValue;
};

export const getQueryNumber = (
    request: FastifyRequest,
    key: string,
    defaultValue?: number
): number | undefined => {
    const value = (request.query as any)[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};

export const getQueryBoolean = (
    request: FastifyRequest,
    key: string,
    defaultValue: boolean = false
): boolean => {
    const value = (request.query as any)[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1' || value === true;
};

export const getQueryArray = (
    request: FastifyRequest,
    key: string,
    separator: string = ','
): string[] | undefined => {
    const value = (request.query as any)[key];
    if (!value) return undefined;
    return String(value).split(separator).filter(Boolean);
};

/**
 * Extract route parameters
 */
export const getParam = (request: FastifyRequest, key: string): string => {
    return (request.params as any)[key];
};

/**
 * Validate required fields in body
 */
export const validateRequired = (
    body: any,
    fields: string[]
): { valid: boolean; missing: string[] } => {
    const missing = fields.filter(field => !body[field]);
    return {
        valid: missing.length === 0,
        missing,
    };
};
