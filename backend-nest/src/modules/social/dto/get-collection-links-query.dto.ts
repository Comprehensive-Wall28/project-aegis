import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetCollectionLinksQueryDto {
  @IsOptional()
  @IsString()
  cursorCreatedAt?: string;

  @IsOptional()
  @IsString()
  cursorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;
}
