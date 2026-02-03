import { IsOptional, IsString } from 'class-validator';

export class GetFoldersQueryDto {
    @IsOptional()
    @IsString()
    parentId?: string | null;
}
