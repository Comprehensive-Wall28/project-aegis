import { registerAs } from '@nestjs/config';
import { IsNumber, IsString, IsOptional, validateSync, IsEnum } from 'class-validator';
import { plainToClass } from 'class-transformer';

export enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

export class EnvironmentVariables {
    @IsEnum(Environment)
    @IsOptional()
    NODE_ENV: Environment = Environment.Development;

    @IsNumber()
    @IsOptional()
    PORT: number = 5000;

    @IsString()
    @IsOptional() // Validated manually for production later
    MONGO_URI!: string;

    @IsString()
    @IsOptional()
    AUDIT_MONGO_URI!: string;

    @IsString()
    @IsOptional()
    JWT_SECRET!: string;

    @IsString()
    @IsOptional()
    CLIENT_ORIGIN!: string;

    @IsString()
    @IsOptional()
    RP_ID!: string;

    @IsNumber()
    @IsOptional()
    API_RATE_LIMIT: number = 500;

    @IsNumber()
    @IsOptional()
    AUTH_RATE_LIMIT: number = 50;

    @IsString()
    @IsOptional()
    CSRF_SECRET!: string;

    @IsString()
    @IsOptional()
    GOOGLE_CLIENT_ID!: string;

    @IsString()
    @IsOptional()
    GOOGLE_CLIENT_SECRET!: string;

    @IsString()
    @IsOptional()
    GOOGLE_REFRESH_TOKEN!: string;

    @IsString()
    @IsOptional()
    GOOGLE_DRIVE_FOLDER_ID!: string;
}

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToClass(
        EnvironmentVariables,
        config,
        { enableImplicitConversion: true },
    );

    const errors = validateSync(validatedConfig, { skipMissingProperties: false });

    if (errors.length > 0) {
        throw new Error(errors.toString());
    }

    // Custom production validation logic to match old backend's strictness
    if (validatedConfig.NODE_ENV === Environment.Production) {
        const missing = [];
        if (!validatedConfig.MONGO_URI) missing.push('MONGO_URI');
        // AUDIT_MONGO_URI is critically important, assuming it is required if main is.
        if (!validatedConfig.AUDIT_MONGO_URI) missing.push('AUDIT_MONGO_URI');
        if (!validatedConfig.JWT_SECRET) missing.push('JWT_SECRET');
        if (!validatedConfig.CLIENT_ORIGIN) missing.push('CLIENT_ORIGIN');
        if (!validatedConfig.RP_ID) missing.push('RP_ID');
        if (!validatedConfig.CSRF_SECRET) missing.push('CSRF_SECRET');

        if (missing.length > 0) {
            throw new Error(`FATAL: Missing required environment variables for production: ${missing.join(', ')}`);
        }
    }

    return validatedConfig;
}

export default registerAs('config', () => ({
    // This allows cleaner injection if needed, but we mostly use ConfigService directly
}));
