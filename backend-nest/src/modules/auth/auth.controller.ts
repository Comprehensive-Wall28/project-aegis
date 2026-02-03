import {
    Controller,
    Post,
    Body,
    Req,
    Res,
    Get,
    Put,
    Delete,
    UseGuards,
    Param,
    HttpStatus,
    BadRequestException,
    HttpCode
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CsrfService } from './csrf.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
        private csrfService: CsrfService
    ) { }

    private setAuthCookie(res: FastifyReply, token: string) {
        const isProd = this.configService.get('NODE_ENV') === 'production';
        (res as any).setCookie('token', token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 365 * 24 * 60 * 60 * 1000,
            path: '/',
            partitioned: isProd
        });
    }

    private clearAuthCookie(res: FastifyReply) {
        const isProd = this.configService.get('NODE_ENV') === 'production';
        (res as any).setCookie('token', '', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            expires: new Date(0),
            path: '/',
            partitioned: isProd
        });
    }

    private setCsrfCookie(res: FastifyReply, token: string) {
        const isProd = this.configService.get('NODE_ENV') === 'production';
        (res as any).setCookie('XSRF-TOKEN', token, {
            httpOnly: false, // Must be readable by frontend JS
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            path: '/',
        });
    }

    @Public()
    @Post('register')
    async register(@Body() registerDto: RegisterDto, @Req() req: FastifyRequest) {
        const result = await this.authService.register(registerDto, req);
        return { ...result, message: 'User registered successfully' };
    }

    @Public()
    @Post('login')
    @HttpCode(200)
    async login(
        @Body() loginDto: LoginDto,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        // Handle lowercasing in DTO or Service? Service handles it.
        const result = await this.authService.login(loginDto, req, (token) => {
            this.setAuthCookie(res, token);
        });

        if ('status' in result && result.status === '2FA_REQUIRED') {
            return {
                status: '2FA_REQUIRED',
                options: result.options,
                message: 'Passkey 2FA required'
            };
        }

        return { ...result, message: 'Login successful' };
    }

    @Public() // CSRF token generation is public
    @Get('csrf-token')
    getCsrfToken(@Res({ passthrough: true }) res: FastifyReply) {
        const signedToken = this.csrfService.createSignedToken();
        this.setCsrfCookie(res, signedToken);
        // Express returned: { csrfToken: res.locals.csrfToken }. 
        // We return the same signed token.
        return { csrfToken: signedToken };
    }

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Get('me')
    async getMe(@CurrentUser() user: any) {
        return this.authService.getMe(user.id);
    }

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Get('discovery/:email')
    async discoverUser(@Param('email') email: string) {
        return this.authService.discoverUser(email);
    }

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Put('me')
    async updateMe(
        @CurrentUser() user: any,
        @Body() body: any,
        @Req() req: FastifyRequest
    ) {
        return this.authService.updateProfile(user.id, body, req);
    }

    @UseGuards(JwtAuthGuard) // Logout doesn't need CSRF usually, as cookie might be stale
    @Post('logout')
    @HttpCode(200)
    async logout(
        @CurrentUser() user: any,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        await this.authService.logout(user?.id, req);
        this.clearAuthCookie(res);
        return { message: 'Logged out successfully' };
    }

    // WebAuthn
    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Post('webauthn/register-options')
    @HttpCode(200)
    async getRegistrationOptions(@CurrentUser() user: any) {
        return this.authService.getRegistrationOptions(user.id);
    }

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Post('webauthn/register-verify')
    @HttpCode(200)
    async verifyRegistration(
        @CurrentUser() user: any,
        @Body() body: any,
        @Req() req: FastifyRequest
    ) {
        const verified = await this.authService.verifyRegistration(user.id, body, req);
        if (verified) {
            return { verified: true };
        } else {
            throw new BadRequestException({ verified: false, message: 'Verification failed' });
        }
    }

    @Public()
    @Post('webauthn/login-options')
    @HttpCode(200)
    async getAuthenticationOptions(@Body() body: any) {
        return this.authService.getAuthenticationOptions(body.email);
    }

    @Public()
    @Post('webauthn/login-verify')
    @HttpCode(200)
    async verifyAuthentication(
        @Body() fullBody: any,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        const { email, body } = fullBody;
        const normalizedEmail = email ? email.toLowerCase().trim() : email;
        const result = await this.authService.verifyAuthentication(normalizedEmail, body, req, (token) => {
            this.setAuthCookie(res, token);
        });
        return { ...result, message: 'Login successful' };
    }

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Post('password/remove') // Express route was just `removePassword` in controller map?
    async removePasskeyPlaceholder() { } // Just comment

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Delete('webauthn/passkey')
    async removePasskey(
        @CurrentUser() user: any,
        @Body() body: any,
        @Req() req: FastifyRequest
    ) {
        const remainingCredentials = await this.authService.removePasskey(user.id, body.credentialID, req);
        return { message: 'Passkey removed successfully', remainingCredentials };
    }
}
