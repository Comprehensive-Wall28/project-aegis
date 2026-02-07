import { IsArray, ArrayMinSize, IsString, IsMongoId } from 'class-validator';

export class ReorderCollectionsRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsMongoId({ each: true })
  collectionIds: string[];
}
