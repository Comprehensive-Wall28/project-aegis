import { Module, Global } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseManagerService } from './database-manager.service';
import { Connection } from 'mongoose';
import { databaseImports, databaseProviders } from './database.providers';

@Global()
@Module({
    imports: [
        ...databaseImports,
    ],
    providers: [
        ...databaseProviders,
    ],
    exports: [DatabaseManagerService, MongooseModule],
})
export class DatabaseModule { }
