import { IsOptional, IsString } from 'class-validator';

export class GetRoomContentQueryDto {
  @IsOptional()
  @IsString()
  collectionId?: string;
}
