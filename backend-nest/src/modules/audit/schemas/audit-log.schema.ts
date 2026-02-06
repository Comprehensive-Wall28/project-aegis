import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum AuditAction {
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    REGISTER = 'REGISTER',
    LOGIN_FAILED = 'LOGIN_FAILED',
    GPA_UPDATE = 'GPA_UPDATE',
    FILE_UPLOAD = 'FILE_UPLOAD',
    FILE_DELETE = 'FILE_DELETE',
    KEY_ROTATION = 'KEY_ROTATION',
    PROFILE_UPDATE = 'PROFILE_UPDATE',
    PREFERENCES_UPDATE = 'PREFERENCES_UPDATE',
    COURSE_CREATE = 'COURSE_CREATE',
    COURSE_DELETE = 'COURSE_DELETE',
    CALENDAR_EVENT_CREATE = 'CALENDAR_EVENT_CREATE',
    CALENDAR_EVENT_UPDATE = 'CALENDAR_EVENT_UPDATE',
    CALENDAR_EVENT_DELETE = 'CALENDAR_EVENT_DELETE',
    PASSKEY_REGISTER = 'PASSKEY_REGISTER',
    PASSKEY_LOGIN = 'PASSKEY_LOGIN',
    PASSKEY_REMOVE = 'PASSKEY_REMOVE',
    PASSWORD_REMOVE = 'PASSWORD_REMOVE',
    PASSWORD_UPDATE = 'PASSWORD_UPDATE',
    TASK_CREATE = 'TASK_CREATE',
    TASK_UPDATE = 'TASK_UPDATE',
    TASK_DELETE = 'TASK_DELETE',
    TASK_REORDER = 'TASK_REORDER',
    NOTE_CREATE = 'NOTE_CREATE',
    NOTE_UPDATE_METADATA = 'NOTE_UPDATE_METADATA',
    NOTE_UPDATE_CONTENT = 'NOTE_UPDATE_CONTENT',
    NOTE_DELETE = 'NOTE_DELETE',
    NOTE_FOLDER_CREATE = 'NOTE_FOLDER_CREATE',
    NOTE_FOLDER_UPDATE = 'NOTE_FOLDER_UPDATE',
    NOTE_FOLDER_DELETE = 'NOTE_FOLDER_DELETE',
    ROOM_CREATE = 'ROOM_CREATE',
    ROOM_INVITE_CREATE = 'ROOM_INVITE_CREATE',
    ROOM_JOIN = 'ROOM_JOIN',
    ROOM_LEAVE = 'ROOM_LEAVE',
    ROOM_DELETE = 'ROOM_DELETE',
    LINK_POST = 'LINK_POST',
    LINK_DELETE = 'LINK_DELETE',
    LINK_MOVE = 'LINK_MOVE',
    LINK_COMMENT_ADD = 'LINK_COMMENT_ADD',
    LINK_COMMENT_DELETE = 'LINK_COMMENT_DELETE',
    COLLECTION_CREATE = 'COLLECTION_CREATE',
    COLLECTION_DELETE = 'COLLECTION_DELETE',
    COLLECTION_UPDATE = 'COLLECTION_UPDATE',
    COLLECTION_REORDER = 'COLLECTION_REORDER',
    READER_VIEW_ACCESS = 'READER_VIEW_ACCESS',
    API_ERROR = 'API_ERROR',
}

export enum AuditStatus {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
    userId?: Types.ObjectId;

    @Prop({ type: String, required: false, index: true })
    identifier?: string;

    @Prop({ type: String, required: true, index: true, enum: AuditAction })
    action: AuditAction;

    @Prop({ type: String, required: true, enum: AuditStatus })
    status: AuditStatus;

    @Prop({ type: String, required: true })
    ipAddress: string;

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    metadata: Record<string, any>;

    @Prop({ type: Date, default: Date.now, index: true })
    timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ userId: 1, timestamp: -1 });
