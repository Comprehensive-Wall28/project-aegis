import { IsString, IsOptional, IsEnum, IsDateString, IsArray } from 'class-validator';

export class CreateTaskDto {
    @IsString()
    encryptedData: string;

    @IsString()
    encapsulatedKey: string;

    @IsString()
    encryptedSymmetricKey: string;

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
    recordHash: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mentions?: string[];
}
