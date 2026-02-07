import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PostLinkRequestDto {
    @IsString()
    @IsNotEmpty()
    url: string;

    @IsString()
    @IsOptional()
    collectionId?: string;
}
