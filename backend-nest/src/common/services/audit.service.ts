import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Audit action types matching legacy backend exactly
 */
export type AuditAction =
    | 'LOGIN'
    | 'LOGOUT'
    | 'REGISTER'
    | 'LOGIN_FAILED'
    | 'GPA_UPDATE'
    | 'FILE_UPLOAD'
    | 'FILE_DELETE'
    | 'KEY_ROTATION'
    | 'PROFILE_UPDATE'
    | 'PREFERENCES_UPDATE'
    | 'COURSE_CREATE'
    | 'COURSE_DELETE'
    | 'CALENDAR_EVENT_CREATE'
    | 'CALENDAR_EVENT_UPDATE'
    | 'CALENDAR_EVENT_DELETE'
    | 'PASSKEY_REGISTER'
    | 'PASSKEY_LOGIN'
    | 'PASSKEY_REMOVE'
    | 'PASSWORD_REMOVE'
    | 'PASSWORD_UPDATE'
    | 'TASK_CREATE'
    | 'TASK_UPDATE'
    | 'TASK_DELETE'
    | 'TASK_REORDER'
    | 'NOTE_CREATE'
    | 'NOTE_UPDATE_METADATA'
    | 'NOTE_UPDATE_CONTENT'
    | 'NOTE_DELETE'
    | 'NOTE_FOLDER_CREATE'
    | 'NOTE_FOLDER_UPDATE'
    | 'NOTE_FOLDER_DELETE'
    | 'ROOM_CREATE'
    | 'ROOM_INVITE_CREATE'
    | 'ROOM_JOIN'
    | 'ROOM_LEAVE'
    | 'ROOM_DELETE'
    | 'LINK_POST'
    | 'LINK_DELETE'
    | 'LINK_MOVE'
    | 'LINK_COMMENT_ADD'
    | 'LINK_COMMENT_DELETE'
    | 'COLLECTION_CREATE'
    | 'COLLECTION_DELETE'
    | 'COLLECTION_UPDATE'
    | 'COLLECTION_REORDER'
    | 'READER_VIEW_ACCESS';

export type AuditStatus = 'SUCCESS' | 'FAILURE';

export interface AuditLogEntry {
    userId?: string;
    identifier?: string; // For failed auth attempts
    action: AuditAction;
    status: AuditStatus;
    ipAddress: string;
    metadata: Record<string, any>;
    timestamp: Date;
}

/**
 * Service for logging security-sensitive actions.
 * Matches legacy backend auditLogger utility.
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectConnection('secondary') private readonly secondaryConnection: Connection,
    ) {}

    /**
     * Extracts the client IP address from the request.
     * Handles proxied requests (X-Forwarded-For) and direct connections.
     * Matches legacy implementation exactly.
     */
    private getClientIp(req?: Request): string {
        if (!req || !req.headers) return 'unknown';
        
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return ips.split(',')[0].trim();
        }

        return (req as any).ip || (req as any).socket?.remoteAddress || 'unknown';
    }

    /**
     * Creates an audit log entry for security-sensitive actions.
     * This function handles errors gracefully - it logs the error but does not throw.
     */
    async logAuditEvent(
        userId: string,
        action: AuditAction,
        status: AuditStatus,
        req?: Request,
        metadata: Record<string, any> = {},
    ): Promise<void> {
        try {
            const timestamp = new Date();
            const ipAddress = this.getClientIp(req);

            // Get or create AuditLog model on secondary connection
            const AuditLog =
                this.secondaryConnection.models['AuditLog'] ||
                this.secondaryConnection.model('AuditLog', this.getAuditLogSchema());

            await AuditLog.create({
                userId,
                action,
                status,
                ipAddress,
                metadata,
                timestamp,
            });
        } catch (error) {
            this.logger.error(`Failed to create audit log: ${error}`);
        }
    }

    /**
     * Logs a failed authentication attempt.
     * Since we may not have a userId for failed logins, this uses a hashed email as identifier.
     */
    async logFailedAuth(
        identifier: string,
        action: 'LOGIN_FAILED' | 'REGISTER',
        req?: Request,
        metadata: Record<string, any> = {},
    ): Promise<void> {
        try {
            const timestamp = new Date();
            const ipAddress = this.getClientIp(req);

            // Create a hash of the identifier for privacy (don't store raw email)
            const identifierHash = crypto
                .createHash('sha256')
                .update(identifier)
                .digest('hex')
                .slice(0, 24);

            const AuditLog =
                this.secondaryConnection.models['AuditLog'] ||
                this.secondaryConnection.model('AuditLog', this.getAuditLogSchema());

            await AuditLog.create({
                identifier: identifierHash,
                action,
                status: 'FAILURE',
                ipAddress,
                metadata: { ...metadata, attemptedIdentifier: identifier.substring(0, 3) + '***' },
                timestamp,
            });

            this.logger.warn(`Auth failure: ${action} attempt for ${identifier} from ${ipAddress}`);
        } catch (error) {
            this.logger.error(`Failed to log auth failure: ${error}`);
        }
    }

    /**
     * Mongoose schema for AuditLog
     */
    private getAuditLogSchema() {
        const mongoose = require('mongoose');
        return new mongoose.Schema({
            userId: { type: String, index: true },
            identifier: { type: String, index: true },
            action: { type: String, required: true, index: true },
            status: { type: String, enum: ['SUCCESS', 'FAILURE'], required: true },
            ipAddress: { type: String, required: true },
            metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
            timestamp: { type: Date, default: Date.now, index: true },
        });
    }
}
