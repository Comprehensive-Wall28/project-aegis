import { Body, Controller, Post, Ip, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';



import { AuthService } from './auth.service';
import { RegisterRequestDto } from './dto/register-request.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserResponseDto } from './dto/user-response.dto';


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
}
