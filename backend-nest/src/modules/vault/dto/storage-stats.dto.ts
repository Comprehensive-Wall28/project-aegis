import { IsNumber } from 'class-validator';

export class StorageStatsDto {
    @IsNumber()
    totalStorageUsed: number;

    @IsNumber()
    maxStorage: number;
}