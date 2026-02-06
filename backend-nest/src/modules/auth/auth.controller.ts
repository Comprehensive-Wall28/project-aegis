import { Body, Controller, Post, Ip, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterRequestDto } from './dto/register-request.dto';
import { UserResponseDto } from './dto/user-response.dto';

interface RegisterResponse extends UserResponseDto {
    message: string;
}

@Controller('api/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

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
}
