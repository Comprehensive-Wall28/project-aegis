import { IsString, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';

export class CreateFolderDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsString()
    @IsNotEmpty()
    encryptedSessionKey!: string;
}

export class UpdateFolderDto {
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    name?: string;

    @IsString()
    @IsOptional()
    color?: string;
}
