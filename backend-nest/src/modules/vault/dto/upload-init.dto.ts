import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsMongoId,
} from 'class-validator';

export class UploadInitDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  originalFileName!: string;

  @IsNumber()
  @IsNotEmpty()
  fileSize!: number;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsString()
  @IsNotEmpty()
  encryptedSymmetricKey!: string;

  @IsString()
  @IsNotEmpty()
  encapsulatedKey!: string;

  @IsOptional()
  @IsMongoId()
  folderId?: string;

  @IsOptional()
  @IsString()
  storageProvider?: 'GRIDFS' | 'GOOGLE_DRIVE';
}
