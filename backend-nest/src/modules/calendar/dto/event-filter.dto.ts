import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class EventFilterDto {
    @IsOptional()
    @IsString()
    start?: string;

    @IsOptional()
    @IsString()
    end?: string;

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
