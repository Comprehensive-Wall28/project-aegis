
import { Controller, Post, Body, Res, Get, UseGuards, Request, Put, HttpStatus, HttpCode } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import '@fastify/cookie';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(
        @Body() registerDto: RegisterDto,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        const result = await this.authService.register(registerDto);
        this.setCookie(res, result.token);
        return this.formatUserResponse(result.user);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        const result = await this.authService.login(loginDto);
        this.setCookie(res, result.token);
        return this.formatUserResponse(result.user);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Res({ passthrough: true }) res: FastifyReply) {
        res.clearCookie('token', { path: '/' });
        return { message: 'Logged out successfully' };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req: any) {
        return this.formatUserResponse(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Put('profile')
    async updateProfile(
        @Request() req: any,
        @Body() updateProfileDto: UpdateProfileDto
    ) {
        const updatedUser = await this.authService.updateProfile(req.user._id, updateProfileDto);
        return this.formatUserResponse(updatedUser);
    }

    private setCookie(res: FastifyReply, token: string) {
        res.setCookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
        });
    }

    private formatUserResponse(user: UserDocument) {
        return {
            _id: user._id,
            username: user.username,
            email: user.email,
            pqcPublicKey: user.pqcPublicKey,
            preferences: user.preferences
        };
    }
}
