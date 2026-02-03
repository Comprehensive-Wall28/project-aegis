import { IsEmail, IsString, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores and dashes' })
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    argon2Hash: string;

    @IsString()
    @IsNotEmpty()
    pqcPublicKey: string;
}
