import { Body, Controller, Post, Get, Put, Ip, HttpCode, HttpStatus, Res, Param } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterRequestDto } from './dto/register-request.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { DiscoveryResponseDto } from './dto/discovery-response.dto';


interface RegisterResponse extends UserResponseDto {
    message: string;
}

@Controller('api/auth')
export class AuthController {

    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }


    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Body() body: RegisterRequestDto,
        @Ip() clientIp: string
    ): Promise<RegisterResponse> {
        const user = await this.authService.register(body, clientIp);
        return {
            ...user,
            message: 'User registered successfully'
        };
    }

    @Post('login')
    @Public()
    @HttpCode(HttpStatus.OK)
    async login(

        @Body() body: LoginRequestDto,
        @Ip() clientIp: string,
        @Res({ passthrough: true }) res: FastifyReply,
        @Body('legacyHash') legacyHash?: string
    ): Promise<LoginResponseDto> {
        // If legacyHash is present, it's already in the body `LoginRequestDto`
        // We pass the callback to set cookie
        const result = await this.authService.login(body, { ip: clientIp, headers: {} }, (token) => {
            res.setCookie('token', token, {
                httpOnly: true,
                secure: this.configService.get('app.nodeEnv') === 'production',
                sameSite: this.configService.get('app.nodeEnv') === 'production' ? 'none' : 'lax',
                path: '/',
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                partitioned: this.configService.get('app.nodeEnv') === 'production'
            });
        });

        // Check if 2FA result
        if ('status' in result && result.status === '2FA_REQUIRED') {
            return {
                ...result,
                message: 'Passkey 2FA required'
            };
        }

        // Success result
        return {
            ...(result as UserResponseDto),
            message: 'Login successful'
        };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@CurrentUser() user: any): Promise<UserResponseDto> {
        return this.authService.getMe(user.id);
    }

    @Put('me')
    @UseGuards(JwtAuthGuard)
    async updateProfile(
        @CurrentUser() user: any,
        @Body() body: UpdateProfileRequestDto,
        @Ip() clientIp: string
    ): Promise<UserResponseDto> {
        return this.authService.updateProfile(user.id, body, clientIp);
    }

    @Get('discovery/:email')
    @UseGuards(JwtAuthGuard, CsrfGuard)
    async discoverUser(@Param('email') email: string): Promise<DiscoveryResponseDto> {
        return await this.authService.discoverUser(email);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(
        @CurrentUser() user: any,
        @Res({ passthrough: true }) res: FastifyReply
    ): Promise<{ message: string }> {
        await this.authService.logout(user.id);

        res.setCookie('token', '', {
            httpOnly: true,
            secure: this.configService.get('app.nodeEnv') === 'production',
            sameSite: this.configService.get('app.nodeEnv') === 'production' ? 'none' : 'lax',
            expires: new Date(0),
            path: '/',
            partitioned: this.configService.get('app.nodeEnv') === 'production'
        });

        return { message: 'Logged out successfully' };
    }
}
