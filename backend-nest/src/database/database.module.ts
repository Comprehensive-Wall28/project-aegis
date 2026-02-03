import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { DatabaseService } from './database.service';

@Module({
    imports: [
        // Primary Connection
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: AppConfigService) => ({
                uri: configService.mongoUri,
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            }),
            inject: [AppConfigService],
        }),
        // Secondary Connection (optional)
        MongooseModule.forRootAsync({
            connectionName: 'secondary',
            imports: [ConfigModule],
            useFactory: (configService: AppConfigService) => {
                const uri = configService.mongoUriSecondary;
                if (!uri) {
                    return {
                        uri: uri || configService.mongoUri, // Fallback to primary to ensure startup
                        maxPoolSize: 10,
                        minPoolSize: 2,
                        serverSelectionTimeoutMS: 5000,
                        socketTimeoutMS: 45000,
                    };
                }
                return {
                    uri,
                    maxPoolSize: 10,
                    minPoolSize: 2,
                    serverSelectionTimeoutMS: 5000,
                    socketTimeoutMS: 45000,
                };
            },
            inject: [AppConfigService],
        }),
    ],
    providers: [DatabaseService],
    exports: [DatabaseService, MongooseModule],
})
export class DatabaseModule { }
