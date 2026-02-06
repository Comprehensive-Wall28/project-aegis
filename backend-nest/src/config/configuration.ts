import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsUrl, IsNotEmpty, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class EnvironmentVariables {
    @IsString()
    @IsOptional()
    NODE_ENV: string = 'development';

    @IsNumber()
    @IsOptional()
    PORT: number = 5000;

    @IsString()
    @IsNotEmpty()
    @IsUrl({ protocols: ['mongodb', 'mongodb+srv'] })
    MONGO_URI: string;

    @IsString()
    @IsOptional()
    @IsUrl({ protocols: ['mongodb', 'mongodb+srv'] })
    MONGO_URI_SECONDARY: string;

    @IsString()
    @IsNotEmpty()
    JWT_SECRET: string;

    @IsString()
    @IsOptional()
    COOKIE_ENCRYPTION_KEY: string;

    @IsString()
    @IsNotEmpty()
    @IsUrl({ require_tld: false })
    CLIENT_ORIGIN: string;

    @IsString()
    @IsNotEmpty()
    RP_ID: string;

    @IsString()
    @IsOptional()
    GOOGLE_CLIENT_ID: string;

    @IsString()
    @IsOptional()
    GOOGLE_CLIENT_SECRET: string;

    @IsString()
    @IsOptional()
    GOOGLE_REFRESH_TOKEN: string;

    @IsString()
    @IsOptional()
    GOOGLE_DRIVE_FOLDER_ID: string;

    @IsString()
    @IsNotEmpty()
    CSRF_SECRET: string;

    @IsString()
    @IsOptional()
    ANALYTICS_ACCESS_PASSWORD: string = 'admin-analytics-2024';
}

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToClass(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });
    const errors = validateSync(validatedConfig, { skipMissingProperties: false });

    if (errors.length > 0) {
        throw new Error(errors.toString());
    }
    return validatedConfig;
}

export default registerAs('app', () => ({
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT || '5000', 10) || 5000,
    database: {
        uri: process.env.MONGO_URI,
        secondaryUri: process.env.MONGO_URI_SECONDARY,
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET,
        cookieEncryptionKey: process.env.COOKIE_ENCRYPTION_KEY,
    },
    webAuthn: {
        clientOrigin: process.env.CLIENT_ORIGIN,
        rpId: process.env.RP_ID,
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    },
    security: {
        csrfSecret: process.env.CSRF_SECRET,
    },
    analytics: {
        accessPassword: process.env.ANALYTICS_ACCESS_PASSWORD || '',
    },
}));
