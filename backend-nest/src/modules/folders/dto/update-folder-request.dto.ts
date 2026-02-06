import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateFolderRequestDto {
    @IsString()
    @IsOptional()
    @IsNotEmpty({ message: 'Folder name cannot be empty' })
    name?: string;

    @IsString()
    @IsOptional()
    color?: string | null;
}
