
import {
    Controller,
    Post,
    Body,
    Res,
    Get,
    UseGuards,
    Request,
    Put,
    HttpStatus,
    HttpCode,
    Query,
    Req,
    Param,
    Delete,
    BadRequestException
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/cookie';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CsrfToken } from '../../common/decorators/csrf-token.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Body() registerDto: RegisterDto,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        const user = await this.authService.register(registerDto, req.raw as any);
        return user;
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        const result = await this.authService.login(
            loginDto,
            req.raw as any,
            (token: string) => this.setCookie(res, token)
        );
        return result;
    }

    @UseGuards(CsrfGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        const userId = (req as any).user?._id?.toString();
        await this.authService.logout(userId, req.raw as any);
        res.clearCookie('token', { path: '/' });
        return { message: 'Logged out successfully' };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req: any) {
        return this.authService.getMe(req.user._id.toString());
    }

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Put('me')
    async updateProfile(
        @Request() req: any,
        @Body() updateProfileDto: UpdateProfileDto
    ) {
        return this.authService.updateProfile(
            req.user._id.toString(),
            updateProfileDto,
            req.raw as any
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get('csrf-token')
    async getCsrfToken(@CsrfToken() csrfToken: string) {
        return { csrfToken };
    }

    @UseGuards(JwtAuthGuard)
    @Get('discovery/:email')
    async discoverUser(@Param('email') email: string) {
        return this.authService.discoverUser(email);
    }

    // ============== WebAuthn Routes ==============

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Post('webauthn/register-options')
    async getRegistrationOptions(@Request() req: any) {
        return this.authService.getRegistrationOptions(req.user._id.toString());
    }

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Post('webauthn/register-verify')
    async verifyRegistration(
        @Request() req: any,
        @Body() body: any
    ) {
        const verified = await this.authService.verifyRegistration(
            req.user._id.toString(),
            body,
            req.raw as any
        );
        if (verified) {
            return { verified: true };
        } else {
            throw new BadRequestException({ verified: false, message: 'Verification failed' });
        }
    }

    @Post('webauthn/login-options')
    async getAuthenticationOptions(@Body('email') email: string) {
        return this.authService.getAuthenticationOptions(email);
    }

    @Post('webauthn/login-verify')
    @HttpCode(HttpStatus.OK)
    async verifyAuthentication(
        @Body() body: any,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        const { email, body: credBody } = body;
        const result = await this.authService.verifyAuthentication(
            email,
            credBody,
            req.raw as any,
            (token: string) => this.setCookie(res, token)
        );
        return { ...result, message: 'Login successful' };
    }

    @UseGuards(JwtAuthGuard, CsrfGuard)
    @Delete('webauthn/passkey')
    async removePasskey(
        @Request() req: any,
        @Body('credentialID') credentialID: string
    ) {
        const remainingCredentials = await this.authService.removePasskey(
            req.user._id.toString(),
            credentialID,
            req.raw as any
        );
        return { message: 'Passkey removed successfully', remainingCredentials };
    }

    private setCookie(res: FastifyReply, token: string) {
        res.setCookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
        });
    }
}
