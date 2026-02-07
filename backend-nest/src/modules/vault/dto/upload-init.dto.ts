import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class UploadInitDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  originalFileName: string;

  @IsNumber()
  @IsNotEmpty()
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  encryptedSymmetricKey: string;

  @IsString()
  @IsNotEmpty()
  encapsulatedKey: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsOptional()
  folderId?: string;
}
