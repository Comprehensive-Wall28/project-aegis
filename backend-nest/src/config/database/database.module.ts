import { Module, Global } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseManagerService } from './database-manager.service';
import { Connection } from 'mongoose';

@Global()
@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            connectionName: 'primary',
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('app.database.uri'),
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            connectionName: 'secondary',
            useFactory: async (configService: ConfigService) => {
                const uri = configService.get<string>('app.database.secondaryUri');
                if (!uri) return { uri: 'mongodb://localhost:27017/unused', retryAttempts: 0 }; // Dummy fallback if not set to avoid startup crash, but arguably we should skip. 
                // Better approach: We check in the module imports. But imports are static-ish.
                return { uri };
            },
            inject: [ConfigService],
        }),
    ],
    providers: [
        {
            provide: DatabaseManagerService,
            useFactory: (primary: Connection, secondary: Connection, config: ConfigService) => {
                const service = new DatabaseManagerService(primary, config);
                const secondaryUri = config.get<string>('app.database.secondaryUri');
                if (secondaryUri) {
                    service.setSecondaryConnection(secondary);
                }
                return service;
            },
            inject: [
                getConnectionToken('primary'),
                getConnectionToken('secondary'),
                ConfigService,
            ],
        },
    ],
    exports: [DatabaseManagerService, MongooseModule],
})
export class DatabaseModule { }
