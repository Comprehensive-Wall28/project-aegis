
export class UserPreferencesDto {
    sessionTimeout: number;
    encryptionLevel: string;
    backgroundImage?: string | null;
    backgroundBlur?: number;
    backgroundOpacity?: number;
}

export class WebAuthnCredentialDto {
    credentialID: string;
    counter: number;
    transports?: string[];
}

export class UserResponseDto {
    _id: string;
    username: string;
    email: string;
    pqcPublicKey: string;
    preferences: UserPreferencesDto;
    hasPassword: boolean;
    webauthnCredentials: WebAuthnCredentialDto[];
}
