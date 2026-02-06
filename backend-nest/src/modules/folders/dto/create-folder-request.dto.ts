import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateFolderRequestDto {
    @IsString()
    @IsNotEmpty({ message: 'Folder name is required' })
    name: string;

    @IsString()
    @IsOptional()
    parentId?: string | null;

    @IsString()
    @IsNotEmpty({ message: 'Encrypted session key is required' })
    encryptedSessionKey: string;
}
