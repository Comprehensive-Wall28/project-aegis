import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { RoomRepository } from './repositories/room.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { RoomResponseDto } from './dto/room-response.dto';
import { CreateRoomRequestDto } from './dto/create-room-request.dto';
import { RoomDocument } from './schemas/room.schema';
import { Types } from 'mongoose';

@Injectable()
export class SocialService {
    private readonly logger = new Logger(SocialService.name);

    constructor(
        private readonly roomRepository: RoomRepository,
        private readonly collectionRepository: CollectionRepository,
    ) { }

    async createRoom(userId: string, data: CreateRoomRequestDto): Promise<RoomDocument> {
        if (!data.name || !data.encryptedRoomKey) {
            throw new BadRequestException('Missing required fields: name, encryptedRoomKey');
        }

        const room = await this.roomRepository.create({
            name: data.name,
            description: data.description || '',
            icon: data.icon || '',
            members: [{
                userId: new Types.ObjectId(userId),
                role: 'owner',
                encryptedRoomKey: data.encryptedRoomKey
            }]
        } as any);

        await this.collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links'
        } as any);

        return room;
    }

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
