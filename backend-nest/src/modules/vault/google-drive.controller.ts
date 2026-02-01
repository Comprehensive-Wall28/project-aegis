import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoogleDriveService } from './google-drive.service';

@Controller('vault/google')
@UseGuards(JwtAuthGuard)
export class GoogleDriveController {
  private readonly logger = new Logger(GoogleDriveController.name);

  constructor(private readonly googleDriveService: GoogleDriveService) {}

  @Get('auth-url')
  getAuthUrl() {
    return { url: this.googleDriveService.getAuthUrl() };
  }

  @Get('callback')
  async callback(@Query('code') code: string) {
    if (!code) {
      return { error: 'No code provided' };
    }

    try {
      const tokens = await this.googleDriveService.exchangeCode(code);
      return {
        message: 'Authorization successful',
        hasRefreshToken: !!tokens.refresh_token,
        note: tokens.refresh_token
          ? 'Check server logs for the refresh token and update your GOOGLE_REFRESH_TOKEN environment variable.'
          : 'No new refresh token provided. Ensure you revoke access first if you need a new one.',
      };
    } catch (error: any) {
      this.logger.error(`OAuth exchange failed: ${error.message}`);
      return {
        error: 'Failed to exchange code for tokens',
        details: error.message,
      };
    }
  }
}
