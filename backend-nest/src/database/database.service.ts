import { Injectable, Inject } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class DatabaseService {
    constructor(
        @InjectConnection() private readonly primaryConnection: Connection,
        @InjectConnection('secondary') private readonly secondaryConnection: Connection,
        private configService: AppConfigService,
    ) { }

    getPrimaryConnection(): Connection {
        return this.primaryConnection;
    }

    getSecondaryConnection(): Connection {
        return this.secondaryConnection;
    }

    async healthCheck(): Promise<Record<string, string>> {
        const status: Record<string, string> = {
            primary: this.getConnectionStatus(this.primaryConnection),
        };

        if (this.configService.mongoUriSecondary) {
            status.secondary = this.getConnectionStatus(this.secondaryConnection);
        } else {
            status.secondary = 'not_configured';
        }

        return status;
    }

    private getConnectionStatus(connection: Connection): string {
        const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        return states[connection.readyState] || 'unknown';
    }
}
