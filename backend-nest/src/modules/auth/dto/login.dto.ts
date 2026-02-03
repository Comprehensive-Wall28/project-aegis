import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty()
    email: string;
    // email or username

    @IsString()
    @IsNotEmpty()
    argon2Hash: string;
}
