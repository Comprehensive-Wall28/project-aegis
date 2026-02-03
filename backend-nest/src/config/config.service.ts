import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
    constructor(private configService: ConfigService) { }

    get nodeEnv(): string {
        return this.configService.get<string>('NODE_ENV') as string;
    }

    get port(): number {
        return this.configService.get<number>('PORT') as number;
    }

    get mongoUri(): string {
        return this.configService.get<string>('MONGO_URI') as string;
    }

    get mongoUriSecondary(): string | undefined {
        return this.configService.get<string>('MONGO_URI_SECONDARY');
    }

    get jwtSecret(): string {
        return this.configService.get<string>('JWT_SECRET') as string;
    }

    get cookieEncryptionKey(): string {
        return this.configService.get<string>('COOKIE_ENCRYPTION_KEY') as string;
    }

    get csrfSecret(): string {
        return this.configService.get<string>('CSRF_SECRET') as string;
    }

    get clientOrigin(): string {
        return this.configService.get<string>('FRONTEND_URL') as string;
    }

    get webAuthnRpId(): string {
        return this.configService.get<string>('WEBAUTHN_RP_ID') as string;
    }

    get googleClientId(): string | undefined {
        return this.configService.get<string>('GOOGLE_CLIENT_ID');
    }

    get googleClientSecret(): string | undefined {
        return this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    }

    get googleRefreshToken(): string | undefined {
        return this.configService.get<string>('GOOGLE_REFRESH_TOKEN');
    }

    get googleDriveFolderId(): string | undefined {
        return this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');
    }

    get logLevel(): string {
        return this.configService.get<string>('LOG_LEVEL') as string;
    }

    get isProduction(): boolean {
        return this.nodeEnv === 'production';
    }
}
