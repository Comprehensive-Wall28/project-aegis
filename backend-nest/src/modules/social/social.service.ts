import { Injectable, Logger, InternalServerErrorException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RoomRepository } from './repositories/room.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { RoomResponseDto } from './dto/room-response.dto';
import { CreateRoomRequestDto } from './dto/create-room-request.dto';
import { InviteInfoResponseDto } from './dto/invite-info-response.dto';
import { JoinRoomRequestDto } from './dto/join-room-request.dto';
import { RoomDocument } from './schemas/room.schema';
import { Types } from 'mongoose';
import { randomBytes } from 'crypto';

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

    async createInvite(userId: string, roomId: string): Promise<{ inviteCode: string }> {
        try {
            const room = await this.roomRepository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new NotFoundException('Room not found');
            }

            const member = room.members.find(m => m.userId.toString() === userId);
            if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
                throw new ForbiddenException('Permission denied');
            }

            const inviteCode = randomBytes(6).toString('base64url');
            await this.roomRepository.updateInviteCode(roomId, inviteCode);

            return { inviteCode };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error('Create invite error:', error);
            throw new InternalServerErrorException('Failed to create invite');
        }
    }

    async getInviteInfo(inviteCode: string): Promise<InviteInfoResponseDto> {
        try {
            if (!inviteCode) {
                throw new BadRequestException('Invite code required');
            }

            const room = await this.roomRepository.findByInviteCode(inviteCode);
            if (!room) {
                throw new NotFoundException('Invite not found or expired');
            }

            return {
                name: room.name,
                description: room.description,
                icon: room.icon
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Get invite info error:', error);
            throw new InternalServerErrorException('Failed to get invite info');
        }
    }

    async joinRoom(userId: string, data: JoinRoomRequestDto): Promise<{ message: string; roomId: string }> {
        try {
            if (!data.inviteCode || !data.encryptedRoomKey) {
                throw new BadRequestException('Missing required fields: inviteCode, encryptedRoomKey');
            }

            const room = await this.roomRepository.findByInviteCode(data.inviteCode);
            if (!room) {
                throw new NotFoundException('Invite not found or expired');
            }

            const existingMember = room.members.find(m => m.userId.toString() === userId);
            if (existingMember) {
                throw new BadRequestException('Already a member of this room');
            }

            await this.roomRepository.addMember(room._id.toString(), userId, 'member', data.encryptedRoomKey);

            return {
                message: 'Successfully joined room',
                roomId: room._id.toString()
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Join room error:', error);
            throw new InternalServerErrorException('Failed to join room');
        }
    }
}
