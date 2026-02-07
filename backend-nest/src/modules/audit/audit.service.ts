import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditAction, AuditStatus } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name, 'primary')
    private auditLogModel: Model<AuditLog>,
  ) {}

  async log(entry: {
    userId?: string;
    identifier?: string;
    action: AuditAction;
    status: AuditStatus;
    ipAddress: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.auditLogModel.create({
        ...entry,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // We do not throw here to prevent disrupting the main flow
    }
  }
}
