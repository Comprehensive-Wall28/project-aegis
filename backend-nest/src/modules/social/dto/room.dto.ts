import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRoomDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    @IsNotEmpty()
    encryptedRoomKey!: string;
}

export class JoinRoomDto {
    @IsString()
    @IsNotEmpty()
    inviteCode!: string;

    @IsString()
    @IsNotEmpty()
    encryptedRoomKey!: string;
}

export class RoomResponseDto {
    _id!: string;
    name!: string;
    description!: string;
    icon!: string;
    role!: string;
    encryptedRoomKey?: string;
    inviteCode?: string;
}
