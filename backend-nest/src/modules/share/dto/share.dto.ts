import { IsString, IsArray, IsOptional, IsBoolean, IsEnum, IsEmail } from 'class-validator';

export class InviteDto {
    @IsString()
    fileId!: string;

    @IsEmail()
    email!: string;

    @IsString()
    encryptedSharedKey!: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions?: string[];
}

export class CreateLinkDto {
    @IsString()
    resourceId!: string;

    @IsEnum(['file', 'folder'])
    resourceType!: 'file' | 'folder';

    @IsString()
    encryptedKey!: string;

    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;

    @IsArray()
    @IsEmail({}, { each: true })
    @IsOptional()
    allowedEmails?: string[];
}
