import { IsString, IsOptional } from 'class-validator';

export class UpdateFolderDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    color?: string | null;
}
