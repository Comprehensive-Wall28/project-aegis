import { IsNotEmpty, IsString } from 'class-validator';

export class MoveLinkRequestDto {
  @IsNotEmpty()
  @IsString()
  collectionId: string;
}
