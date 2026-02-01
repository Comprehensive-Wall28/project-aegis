import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
} from 'class-validator';

export class CreateCalendarEventDto {
  @IsNotEmpty()
  @IsString()
  encryptedData!: string;

  @IsNotEmpty()
  @IsString()
  encapsulatedKey!: string;

  @IsNotEmpty()
  @IsString()
  encryptedSymmetricKey!: string;

  @IsNotEmpty()
  @IsDateString() // Provide ISO string
  startDate!: string;

  @IsNotEmpty()
  @IsDateString() // Provide ISO string
  endDate!: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  recordHash?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mentions?: string[];
}

export class UpdateCalendarEventDto {
  @IsString()
  @IsOptional()
  encryptedData?: string;

  @IsString()
  @IsOptional()
  encapsulatedKey?: string;

  @IsString()
  @IsOptional()
  encryptedSymmetricKey?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  recordHash?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mentions?: string[];
}
