
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PreferencesDto {
    @IsOptional()
    @IsNumber()
    @Min(5)
    @Max(480)
    sessionTimeout?: number;

    @IsOptional()
    @IsString()
    encryptionLevel?: 'STANDARD' | 'HIGH' | 'PARANOID';

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

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    username?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => PreferencesDto)
    preferences?: PreferencesDto;
}
