import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateAnnotationDto {
    @IsString()
    @IsNotEmpty()
    paragraphId!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    highlightText!: string;

    @IsString()
    @IsNotEmpty()
    encryptedContent!: string;
}
