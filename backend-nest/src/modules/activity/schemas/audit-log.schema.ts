import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

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

@Schema({
  timestamps: { createdAt: 'timestamp', updatedAt: false },
  collection: 'auditlogs',
})
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  userId?: Types.ObjectId;

  @Prop({ required: false, index: true })
  identifier?: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true, enum: ['SUCCESS', 'FAILURE'] })
  status!: AuditStatus;

  @Prop({ required: true })
  ipAddress!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata!: Record<string, any>;

  @Prop({ default: Date.now, index: true })
  timestamp!: Date;
}

export type AuditLogDocument = AuditLog & Document;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Compound index
AuditLogSchema.index({ userId: 1, timestamp: -1 });
