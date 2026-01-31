import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class EducationalContextDTO {
    @IsOptional()
    @IsString()
    subject?: string;

    @IsOptional()
    @IsString()
    semester?: string;
}

export class CreateNoteDTO {
    @IsString()
    @IsNotEmpty()
    encapsulatedKey!: string;

    @IsString()
    @IsNotEmpty()
    encryptedSymmetricKey!: string;

    @IsString()
    @IsNotEmpty()
    encryptedContent!: string; // Base64

    @IsOptional()
    @IsString()
    encryptedTitle?: string;

    @IsOptional()
    @IsString()
    noteFolderId?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    linkedEntityIds?: string[];

    @IsOptional()
    @ValidateNested()
    @Type(() => EducationalContextDTO)
    educationalContext?: EducationalContextDTO;

    @IsString()
    @IsNotEmpty()
    recordHash!: string;
}

export class CreateFolderDTO {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    parentId?: string;

    @IsOptional()
    @IsString()
    color?: string;
}

export class UpdateNoteMetadataDTO {
    @IsOptional()
    @IsString()
    encryptedTitle?: string;

    @IsOptional()
    @IsString()
    noteFolderId?: string | null;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    linkedEntityIds?: string[];

    @IsOptional()
    @ValidateNested()
    @Type(() => EducationalContextDTO)
    educationalContext?: EducationalContextDTO;

    @IsOptional()
    @IsString()
    recordHash?: string;
}

export class UpdateNoteContentDTO {
    @IsString()
    @IsNotEmpty()
    encapsulatedKey!: string;

    @IsString()
    @IsNotEmpty()
    encryptedSymmetricKey!: string;

    @IsString()
    @IsNotEmpty()
    encryptedContent!: string;

    @IsOptional()
    @IsString()
    encryptedTitle?: string;

    @IsString()
    @IsNotEmpty()
    recordHash!: string;
}
