import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
} from 'class-validator';

export class CreateTaskDTO {
  @IsString()
  @IsNotEmpty()
  encryptedData!: string;

  @IsString()
  @IsNotEmpty()
  encapsulatedKey!: string;

  @IsString()
  @IsNotEmpty()
  encryptedSymmetricKey!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(['high', 'medium', 'low'])
  priority?: string;

  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done'])
  status?: string;

  @IsString()
  @IsNotEmpty()
  recordHash!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

export class UpdateTaskDTO {
  @IsOptional()
  @IsString()
  encryptedData?: string;

  @IsOptional()
  @IsString()
  encapsulatedKey?: string;

  @IsOptional()
  @IsString()
  encryptedSymmetricKey?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(['high', 'medium', 'low'])
  priority?: string;

  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done'])
  status?: string;

  @IsOptional()
  @IsString()
  recordHash?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}
