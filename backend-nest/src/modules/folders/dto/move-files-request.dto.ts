import {
  IsString,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FileUpdateDto {
  @IsString()
  @IsNotEmpty({ message: 'File ID is required' })
  fileId: string;

  @IsString()
  @IsNotEmpty({ message: 'Encrypted key is required' })
  encryptedKey: string;

  @IsString()
  @IsNotEmpty({ message: 'Encapsulated key is required' })
  encapsulatedKey: string;
}

export class MoveFilesRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileUpdateDto)
  @IsNotEmpty({ message: 'File updates are required' })
  updates: FileUpdateDto[];

  @IsString()
  @IsOptional()
  folderId?: string | null;
}
