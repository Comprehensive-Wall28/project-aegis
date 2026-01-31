import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditAction, AuditStatus } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectModel(AuditLog.name, 'audit') private auditLogModel: Model<AuditLogDocument>,
    ) { }

    async log(
        action: AuditAction,
        status: AuditStatus,
        ipAddress: string,
        userId?: string,
        metadata: Record<string, any> = {},
        identifier?: string,
    ): Promise<AuditLogDocument> {
        try {
            const newLog = new this.auditLogModel({
                action,
                status,
                ipAddress,
                userId: userId ? new Types.ObjectId(userId) : undefined,
                metadata,
                identifier,
                timestamp: new Date(),
            });
            return await newLog.save();
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to save audit log: ${err.message}`, err.stack);
            throw error;
        }
    }

    async getRecentActivity(userId: string, limit: number): Promise<{ logs: any[] }> {
        const logs = await this.auditLogModel.find({
            userId: new Types.ObjectId(userId)
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean()
            .exec();

        return { logs };
    }
}
