import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsArray } from 'class-validator';

export class UpdateTaskDto {
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
    @IsNumber()
    order?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mentions?: string[];
}
