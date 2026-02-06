import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateRoomRequestDto {
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    encryptedRoomKey: string;
}
