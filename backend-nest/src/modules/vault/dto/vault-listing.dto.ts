import { IsOptional, IsString, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class VaultListingRequestDto {
    @IsOptional()
    @IsString()
    folderId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @IsString()
    cursor?: string;

    @IsOptional()
    @IsString()
    search?: string;
}

export class VaultFileResponseDto {
    _id: string;
    ownerId: string;
    folderId: string | null;
    fileName: string;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export class VaultListingResponseDto {
    items: VaultFileResponseDto[];
    nextCursor: string | null;
}
