import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { RoomRepository } from './repositories/room.repository';
import { RoomResponseDto } from './dto/room-response.dto';

@Injectable()
export class SocialService {
    private readonly logger = new Logger(SocialService.name);

    constructor(
        private readonly roomRepository: RoomRepository,
    ) { }

    async getUserRooms(userId: string): Promise<RoomResponseDto[]> {
        try {
            const rooms = await this.roomRepository.findByMember(userId);

            return rooms.map(room => {
                const member = room.members.find(m => m.userId.toString() === userId);
                return {
                    _id: room._id.toString(),
                    name: room.name,
                    description: room.description,
                    icon: room.icon,
                    role: member?.role || 'member',
                    encryptedRoomKey: member?.encryptedRoomKey
                };
            });
        } catch (error) {
            this.logger.error('Get user rooms error:', error);
            throw new InternalServerErrorException('Failed to get rooms');
        }
    }
}
