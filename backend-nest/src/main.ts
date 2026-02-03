import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { AppLogger } from './common/logger/logger.service';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
        { bufferLogs: true } // Buffer logs until custom logger is attached
    );

    const configService = app.get(AppConfigService);
    const logger = app.get(AppLogger);

    app.useLogger(logger);

    // Enable CORS
    app.enableCors({
        origin: [configService.clientOrigin, 'http://localhost:3000', 'http://localhost:5173'],
        credentials: true,
    });

    app.setGlobalPrefix('api');

    await app.listen(configService.port, '0.0.0.0');
    logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
