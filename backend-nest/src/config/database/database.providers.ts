import { Provider } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DatabaseManagerService } from './database-manager.service';

export const databaseProviders: Provider[] = [
  {
    provide: DatabaseManagerService,
    useFactory: (
      primary: Connection,
      secondary: Connection,
      config: ConfigService,
    ) => {
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
];

export const databaseImports = [
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
      if (!uri)
        return { uri: 'mongodb://localhost:27017/unused', retryAttempts: 0 };
      return { uri };
    },
    inject: [ConfigService],
  }),
];
