import { UserResponseDto } from './user-response.dto';

export type LoginResponseDto = UserResponseDto & { message: string } | {
    status: '2FA_REQUIRED';
    options: any;
    message: string;
};
