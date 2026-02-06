import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateCollectionRequestDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}
