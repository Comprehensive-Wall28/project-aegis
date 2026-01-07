import { Request } from 'express';
import crypto from 'crypto';
import AuditLog, { AuditAction, AuditStatus } from '../models/AuditLog';
import logger from './logger';

/**
 * Extracts the client IP address from the request.
 * Handles proxied requests (X-Forwarded-For) and direct connections.
 */
export function getClientIp(req: Request): string {
    // Check for forwarded header first (common in production behind load balancers)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // Can be comma-separated list; first is original client
        const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        return ips.split(',')[0].trim();
    }

    // Fall back to direct connection IP
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Computes a SHA-256 hash for integrity verification of the audit log entry.
 * This allows verification that the log entry has not been tampered with.
 */
function computeRecordHash(
    userId: string,
    action: AuditAction,
    status: AuditStatus,
    timestamp: Date,
    metadata: Record<string, any>
): string {
    const data = JSON.stringify({
        userId,
        action,
        status,
        timestamp: timestamp.toISOString(),
        metadata
    });

    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Creates an audit log entry for security-sensitive actions.
 * This function handles errors gracefully - it logs the error but does not throw,
 * ensuring that audit logging failures don't break the main application flow.
 * 
 * @param userId - The user ID performing the action
 * @param action - The type of action being performed
 * @param status - Whether the action succeeded or failed
 * @param req - The Express request object (for IP extraction)
 * @param metadata - Optional additional details about the action
 */
export async function logAuditEvent(
    userId: string,
    action: AuditAction,
    status: AuditStatus,
    req: Request,
    metadata: Record<string, any> = {}
): Promise<void> {
    try {
        const timestamp = new Date();
        const ipAddress = getClientIp(req);

        // Compute integrity hash
        const recordHash = computeRecordHash(userId, action, status, timestamp, metadata);

        // Create the audit log entry
        await AuditLog.create({
            userId,
            action,
            status,
            ipAddress,
            metadata,
            recordHash,
            timestamp
        });

        logger.info(`Audit: ${action} ${status} for user ${userId} from ${ipAddress}`);
    } catch (error) {
        // Log the error but don't throw - audit logging should not break the main flow
        logger.error(`Failed to create audit log: ${error}`);
    }
}

/**
 * Logs a failed authentication attempt.
 * Since we may not have a userId for failed logins, this uses email/username as identifier.
 */
export async function logFailedAuth(
    identifier: string,
    action: 'LOGIN_FAILED' | 'REGISTER',
    req: Request,
    metadata: Record<string, any> = {}
): Promise<void> {
    try {
        const timestamp = new Date();
        const ipAddress = getClientIp(req);

        // For failed auth, we use a placeholder userId or create a hash of the identifier
        const identifierHash = crypto.createHash('sha256').update(identifier).digest('hex').slice(0, 24);

        logger.warn(`Auth failure: ${action} attempt for ${identifier} from ${ipAddress}`);

        // Note: We don't store failed attempts in AuditLog since they require a valid userId
        // Instead, this is logged via the winston logger for security monitoring
        // The metadata can still be useful for the warning log
        logger.warn(`Auth metadata: ${JSON.stringify({ ...metadata, identifier, action })}`);
    } catch (error) {
        logger.error(`Failed to log auth failure: ${error}`);
    }
}

export default {
    logAuditEvent,
    logFailedAuth,
    getClientIp
};
