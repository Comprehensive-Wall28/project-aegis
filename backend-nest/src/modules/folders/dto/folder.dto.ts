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

export class MoveFilesUpdateDto {
    @IsString()
    @IsNotEmpty()
    fileId!: string;

    @IsString()
    @IsNotEmpty()
    encryptedKey!: string;

    @IsString()
    @IsNotEmpty()
    encapsulatedKey!: string;
}

export class MoveFilesDto {
    @IsNotEmpty()
    updates!: MoveFilesUpdateDto[];

    @IsString()
    @IsOptional()
    folderId?: string;
}
