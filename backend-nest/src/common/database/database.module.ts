import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                uri: configService.get<string>('MONGO_URI'),
            }),
        }),
        MongooseModule.forRootAsync({
            connectionName: 'audit',
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                uri: configService.get<string>('AUDIT_MONGO_URI'),
            }),
        }),
    ],
    exports: [MongooseModule],
})
export class DatabaseModule implements OnModuleInit {
    private readonly logger = new Logger(DatabaseModule.name);

    constructor(
        @InjectConnection() private readonly connection: Connection,
        @InjectConnection('audit') private readonly auditConnection: Connection,
    ) { }

    onModuleInit() {
        this.connection.on('connected', () => {
            this.logger.log('MongoDB Main connected successfully');
        });

        this.auditConnection.on('connected', () => {
            this.logger.log('MongoDB Audit connected successfully');
        });

        // Log if already connected (e.g. if awaiting connection in forRootAsync)
        if (this.connection.readyState === 1) {
            this.logger.log('MongoDB Main is already connected');
        }
        if (this.auditConnection.readyState === 1) {
            this.logger.log('MongoDB Audit is already connected');
        }
    }
}
