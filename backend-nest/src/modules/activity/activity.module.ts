import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityController } from './activity.controller';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: AuditLog.name, schema: AuditLogSchema }],
      'audit', // Important: Use the 'audit' connection
    ),
    TasksModule,
  ],
  controllers: [ActivityController],
  providers: [AuditService],
  exports: [AuditService],
})
export class ActivityModule {}
