import { IsString } from 'class-validator';

export class JoinRoomRequestDto {
    @IsString()
    inviteCode: string;

    @IsString()
    encryptedRoomKey: string;
}
