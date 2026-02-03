import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Controller()
export class AppController {
    constructor(private readonly databaseService: DatabaseService) { }

    @Get('health')
    async getHealth() {
        const dbStatus = await this.databaseService.healthCheck();
        const isHealthy = Object.values(dbStatus).every(
            (status) => status === 'connected' || status === 'not_configured',
        );

        const response = {
            status: isHealthy ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbStatus,
        };

        if (!isHealthy) {
            throw new ServiceUnavailableException(response);
        }

        return response;
    }
}
