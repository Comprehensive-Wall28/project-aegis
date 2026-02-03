import { IsString, IsOptional, IsBoolean, IsDateString, IsArray } from 'class-validator';

export class UpdateEventDto {
    @IsOptional()
    @IsString()
    encryptedData?: string;

    @IsOptional()
    @IsString()
    encapsulatedKey?: string;

    @IsOptional()
    @IsString()
    encryptedSymmetricKey?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsBoolean()
    isAllDay?: boolean;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsString()
    recordHash?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mentions?: string[];
}
