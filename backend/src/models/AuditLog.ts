import mongoose, { Document, Schema } from 'mongoose';

// Audit action types
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
    | 'TASK_REORDER';

export type AuditStatus = 'SUCCESS' | 'FAILURE';

export interface IAuditLog extends Document {
    userId?: mongoose.Types.ObjectId;
    identifier?: string; // For failed logins (email hash)
    action: AuditAction;
    status: AuditStatus;
    ipAddress: string;
    metadata: Record<string, any>;
    recordHash: string;
    timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Optional for failed login attempts
        index: true
    },
    identifier: {
        type: String,
        required: false, // Used for failed logins (hashed email)
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN', 'LOGOUT', 'REGISTER', 'LOGIN_FAILED',
            'GPA_UPDATE', 'FILE_UPLOAD', 'FILE_DELETE',
            'KEY_ROTATION', 'PROFILE_UPDATE', 'PREFERENCES_UPDATE',
            'COURSE_CREATE', 'COURSE_DELETE',
            'CALENDAR_EVENT_CREATE', 'CALENDAR_EVENT_UPDATE', 'CALENDAR_EVENT_DELETE',
            'PASSKEY_REGISTER', 'PASSKEY_LOGIN', 'PASSKEY_REMOVE', 'PASSWORD_REMOVE', 'PASSWORD_UPDATE',
            'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_REORDER'
        ]
    },
    status: {
        type: String,
        required: true,
        enum: ['SUCCESS', 'FAILURE']
    },
    ipAddress: {
        type: String,
        required: true
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    },
    recordHash: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for efficient user activity queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
