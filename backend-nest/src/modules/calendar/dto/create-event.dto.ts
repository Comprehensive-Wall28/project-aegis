import { IsString, IsOptional, IsBoolean, IsDateString, IsArray } from 'class-validator';

export class CreateEventDto {
    @IsString()
    encryptedData: string;

    @IsString()
    encapsulatedKey: string;

    @IsString()
    encryptedSymmetricKey: string;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsOptional()
    @IsBoolean()
    isAllDay?: boolean;

    @IsOptional()
    @IsString()
    color?: string;

    @IsString()
    recordHash: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mentions?: string[];
}
