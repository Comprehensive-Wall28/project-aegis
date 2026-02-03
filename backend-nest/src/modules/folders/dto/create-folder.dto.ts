import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateFolderDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    parentId?: string | null;

    @IsString()
    encryptedSessionKey: string;

    @IsOptional()
    @IsString()
    color?: string;
}
