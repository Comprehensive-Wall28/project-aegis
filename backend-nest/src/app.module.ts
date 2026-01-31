import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { validate } from './config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DatabaseModule } from './common/database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FoldersModule } from './modules/folders/folders.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { GpaModule } from './modules/gpa/gpa.module';
import { VaultModule } from './modules/vault/vault.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotesModule } from './modules/notes/notes.module';
import { SocialModule } from './modules/social/social.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { ActivityModule } from './modules/activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      cache: true,
      expandVariables: true,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProd = configService.get('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            level: isProd ? 'info' : 'debug',
            transport: isProd
              ? undefined
              : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                },
              },
            // Redact sensitive headers/body fields
            redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.token'],
          },
          forRoutes: ['*path'],
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    FoldersModule,
    CalendarModule,
    GpaModule,
    VaultModule,
    TasksModule,
    NotesModule,
    SocialModule,
    WebsocketModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },

  ],
})
export class AppModule { }
