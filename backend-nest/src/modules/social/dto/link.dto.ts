import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

// DTOs for Link Management
export class PostLinkDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsOptional()
  collectionId?: string;
}

export class MoveLinkDto {
  @IsString()
  @IsNotEmpty()
  collectionId!: string;
}

export class ProxyImageQueryDto {
  @IsUrl({ require_protocol: true })
  @IsNotEmpty()
  url!: string;
}

// Query DTOs for Pagination
export class CursorQueryDto {
  @IsOptional()
  @IsString()
  cursorCreatedAt?: string;

  @IsOptional()
  @IsString()
  cursorId?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  q!: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
