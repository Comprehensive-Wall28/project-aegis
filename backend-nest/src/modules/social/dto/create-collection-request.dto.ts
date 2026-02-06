import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateCollectionRequestDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsIn(['links', 'discussion'])
    type?: 'links' | 'discussion';
}
