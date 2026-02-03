import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class FileUpdateDto {
    @IsString()
    fileId: string;

    @IsString()
    encryptedKey: string;

    @IsString()
    encapsulatedKey: string;
}

export class MoveFilesDto {
    @IsArray()
    @IsObject({ each: true })
    updates: FileUpdateDto[];

    @IsOptional()
    @IsString()
    folderId?: string | null;
}
