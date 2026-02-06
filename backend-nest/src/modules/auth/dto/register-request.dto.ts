import { IsString, IsEmail, MinLength } from 'class-validator';

export class RegisterRequestDto {
    @IsString()
    @MinLength(3)
    username: string;

    @IsEmail()
    email: string;

    @IsString()
    pqcPublicKey: string;

    @IsString()
    argon2Hash: string;
}
