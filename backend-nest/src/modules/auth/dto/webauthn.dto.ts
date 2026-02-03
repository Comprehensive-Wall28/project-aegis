import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class WebAuthnRegisterOptionsDto {
    @IsString()
    @IsNotEmpty()
    username: string;
}

export class WebAuthnVerifyRegistrationDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsNotEmpty()
    response: any; // AuthenticatorAttestationResponseJSON
}

export class WebAuthnLoginOptionsDto {
    @IsString()
    @IsNotEmpty()
    identifier: string;
}

export class WebAuthnVerifyAuthenticationDto {
    @IsString()
    @IsNotEmpty()
    identifier: string;

    @IsNotEmpty()
    response: any; // AuthenticatorAssertionResponseJSON
}
