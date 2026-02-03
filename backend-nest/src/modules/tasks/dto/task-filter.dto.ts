import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskFilterDto {
    @IsOptional()
    @IsEnum(['todo', 'in_progress', 'done'])
    status?: string;

    @IsOptional()
    @IsEnum(['high', 'medium', 'low'])
    priority?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @IsString()
    cursor?: string;
}
