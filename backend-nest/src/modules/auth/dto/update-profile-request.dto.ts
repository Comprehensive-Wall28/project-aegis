import { IsString, IsEmail, IsOptional, ValidateNested, IsNumber, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePreferencesDto {
    @IsOptional()
    @IsNumber()
    @Min(5)
    @Max(480)
    sessionTimeout?: number;

    @IsOptional()
    @IsEnum(['STANDARD', 'HIGH', 'PARANOID'])
    encryptionLevel?: string;

    @IsOptional()
    @IsString()
    backgroundImage?: string | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(20)
    backgroundBlur?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    backgroundOpacity?: number;
}

export class UpdateProfileRequestDto {
    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => UpdatePreferencesDto)
    preferences?: UpdatePreferencesDto;
}
