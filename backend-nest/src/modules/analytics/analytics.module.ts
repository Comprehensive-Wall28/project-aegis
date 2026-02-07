import { Module, Global } from '@nestjs/common';
import { AnalyticsBufferService } from './analytics-buffer.service';

@Global()
@Module({
  providers: [AnalyticsBufferService],
  exports: [AnalyticsBufferService],
})
export class AnalyticsModule {}
