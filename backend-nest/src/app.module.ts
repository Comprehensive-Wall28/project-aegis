import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration, { validate } from './config/configuration';
import { DatabaseModule } from './config/database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { CommonModule } from './common/common.module';
import { CsrfGuard } from './common/guards/csrf.guard';
import { AuthModule } from './modules/auth/auth.module';
import { VaultModule } from './modules/vault/vault.module';
import { FoldersModule } from './modules/folders/folders.module';
import { SocialModule } from './modules/social/social.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    DatabaseModule,
    AuditModule,
    AnalyticsModule,
    HealthModule,
    CommonModule,
    AuthModule,
    VaultModule,
    FoldersModule,
    SocialModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'APP_GUARD',
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
