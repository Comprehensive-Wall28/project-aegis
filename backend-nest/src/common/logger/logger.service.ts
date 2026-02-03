import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class AppLogger implements LoggerService {
    private logger: winston.Logger;

    constructor(private configService: AppConfigService) {
        this.logger = winston.createLogger({
            level: this.configService.logLevel,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { service: 'aegis-backend-nest' },
            transports: [
                new winston.transports.Console({
                    format: this.configService.isProduction
                        ? winston.format.json()
                        : winston.format.simple(),
                }),
            ],
        });
    }

    log(message: any, ...optionalParams: any[]) {
        this.logger.info(message, ...optionalParams);
    }

    error(message: any, ...optionalParams: any[]) {
        this.logger.error(message, ...optionalParams);
    }

    warn(message: any, ...optionalParams: any[]) {
        this.logger.warn(message, ...optionalParams);
    }

    debug?(message: any, ...optionalParams: any[]) {
        this.logger.debug(message, ...optionalParams);
    }

    verbose?(message: any, ...optionalParams: any[]) {
        this.logger.verbose(message, ...optionalParams);
    }
}
