export class RoomResponseDto {
  _id: string;
  name: string;
  description: string;
  icon: string;
  role: 'owner' | 'admin' | 'member';
  encryptedRoomKey?: string;
}
