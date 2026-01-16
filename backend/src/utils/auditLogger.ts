import { Request } from 'express';
import crypto from 'crypto';
import { AuditAction, AuditStatus, AuditLogSchema, IAuditLog } from '../models/AuditLog';
import { DatabaseManager } from '../config/DatabaseManager';
import logger from './logger';

/**
 * Get the AuditLog model from the secondary connection
 * This ensures audit logs are stored in the secondary database
 */
function getAuditLogModel() {
    const dbManager = DatabaseManager.getInstance();
    const connection = dbManager.getConnection('secondary');
    // Use existing model if already registered, otherwise create it
    return connection.models['AuditLog'] || connection.model<IAuditLog>('AuditLog', AuditLogSchema);
}

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
        const AuditLog = getAuditLogModel();
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
 * Since we may not have a userId for failed logins, this uses a hashed email as identifier.
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

        // Create a hash of the identifier for privacy (don't store raw email)
        const identifierHash = crypto.createHash('sha256').update(identifier).digest('hex').slice(0, 24);

        // Compute integrity hash
        const recordHash = crypto.createHash('sha256').update(JSON.stringify({
            identifier: identifierHash,
            action,
            status: 'FAILURE',
            timestamp: timestamp.toISOString(),
            metadata
        })).digest('hex');

        // Store failed attempt in AuditLog
        const AuditLog = getAuditLogModel();
        await AuditLog.create({
            identifier: identifierHash,
            action,
            status: 'FAILURE',
            ipAddress,
            metadata: { ...metadata, attemptedIdentifier: identifier.substring(0, 3) + '***' },
            recordHash,
            timestamp
        });

        logger.warn(`Auth failure: ${action} attempt for ${identifier} from ${ipAddress}`);
    } catch (error) {
        logger.error(`Failed to log auth failure: ${error}`);
    }
}

export default {
    logAuditEvent,
    logFailedAuth,
    getClientIp
};
