import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderUpdateItemDto {
    @IsString()
    id: string;

    @IsOptional()
    @IsEnum(['todo', 'in_progress', 'done'])
    status?: string;

    @IsNumber()
    order: number;
}

export class ReorderTaskDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReorderUpdateItemDto)
    updates: ReorderUpdateItemDto[];
}
