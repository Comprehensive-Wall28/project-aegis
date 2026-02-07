import { IsString, IsNumber } from 'class-validator';

export class MoveFilesResponseDto {
  @IsString()
  message: string;

  @IsNumber()
  modifiedCount: number;
}
