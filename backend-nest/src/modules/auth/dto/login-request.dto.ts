import { IsString, IsEmail, IsOptional } from 'class-validator';

export class LoginRequestDto {
    @IsEmail({}, { message: 'email must be an email' })
    email: string;

    @IsString()
    argon2Hash: string;

    @IsString()
    @IsOptional()
    legacyHash?: string;
}
