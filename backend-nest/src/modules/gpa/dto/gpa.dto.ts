import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateCourseDto {
    @IsString()
    @IsNotEmpty()
    encryptedData!: string;

    @IsString()
    @IsNotEmpty()
    encapsulatedKey!: string;

    @IsString()
    @IsNotEmpty()
    encryptedSymmetricKey!: string;
}

export class UpdatePreferencesDto {
    @IsString()
    @IsNotEmpty()
    @IsIn(['NORMAL', 'GERMAN'])
    gpaSystem!: string;
}
