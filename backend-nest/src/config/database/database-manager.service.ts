import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseManagerService implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseManagerService.name);
  private activeConnection: Connection;
  private readonly secondaryConnection: Connection | null = null;

  constructor(
    @InjectConnection('primary') private readonly primary: Connection,
    // We inject configuration to know if we should even look for secondary
    private readonly configService: ConfigService,
    // Inject secondary strictly if we can, but we need to handle if it's not there.
    // Since we conditionally import the module in DatabaseModule, this service will only work if we handle injection carefully.
    // However, for simplicity, let's assume we inject 'secondary' if configured.
    // To avoid DI errors, we'll use property-based injection or optional injection in the module level provider factory.
    // A customized provider is safer.
  ) {
    this.activeConnection = this.primary;

    // We will verify connection on init
    this.setupListeners(this.primary, 'primary');
  }

  // We'll use a setter for secondary to allow optional injection via a custom provider in the module
  setSecondaryConnection(connection: Connection) {
    (this as any).secondaryConnection = connection;
    this.setupListeners(connection, 'secondary');
  }

  private setupListeners(connection: Connection, name: string) {
    connection.on('connected', () => {
      this.logger.log(`Database connection [${name}] established.`);
    });

    connection.on('disconnected', () => {
      this.logger.warn(`Database connection [${name}] disconnected.`);
      this.handleDisconnection(name);
    });

    connection.on('error', (err) => {
      this.logger.error(`Database connection [${name}] error: ${err.message}`);
    });
  }

  private handleDisconnection(name: string) {
    if (name === 'primary' && this.activeConnection === this.primary) {
      if (
        this.secondaryConnection &&
        this.secondaryConnection.readyState === 1
      ) {
        this.logger.warn('Primary connection lost. Switching to secondary.');
        this.activeConnection = this.secondaryConnection;
      } else {
        this.logger.error(
          'Primary connection lost and no healthy secondary available.',
        );
      }
    }
  }

  getActiveConnection(): Connection {
    return this.activeConnection;
  }

  usePrimary() {
    if (this.primary.readyState === 1) {
      this.activeConnection = this.primary;
      this.logger.log('Switched to primary connection.');
    } else {
      throw new Error('Primary connection is not ready.');
    }
  }

  useSecondary() {
    if (!this.secondaryConnection) {
      throw new Error('Secondary connection is not configured.');
    }
    if (this.secondaryConnection.readyState !== 1) {
      throw new Error('Secondary connection is not ready.');
    }
    this.activeConnection = this.secondaryConnection;
    this.logger.log('Switched to secondary connection.');
  }

  async onApplicationShutdown() {
    await this.primary.close();
    if (this.secondaryConnection) {
      await this.secondaryConnection.close();
    }
  }
}
