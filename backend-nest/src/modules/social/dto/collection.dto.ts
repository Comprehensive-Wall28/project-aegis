import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  @IsEnum(['links', 'discussion'])
  type?: 'links' | 'discussion';
}

export class UpdateCollectionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class ReorderCollectionsDto {
  @IsArray()
  @IsString({ each: true })
  collectionIds!: string[];
}

export class CollectionResponseDto {
  _id!: string;
  roomId!: string;
  name!: string;
  type!: string;
  order!: number;
  createdAt!: Date;
  updatedAt!: Date;
}
