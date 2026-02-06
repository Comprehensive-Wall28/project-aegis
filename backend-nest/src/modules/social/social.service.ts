import { Injectable, Logger, InternalServerErrorException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RoomRepository } from './repositories/room.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { LinkPostRepository } from './repositories/link-post.repository';
import { LinkCommentRepository } from './repositories/link-comment.repository';
import { LinkViewRepository } from './repositories/link-view.repository';
import { ReaderAnnotationRepository } from './repositories/reader-annotation.repository';
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
        private readonly linkPostRepository: LinkPostRepository,
        private readonly linkCommentRepository: LinkCommentRepository,
        private readonly linkViewRepository: LinkViewRepository,
        private readonly readerAnnotationRepository: ReaderAnnotationRepository,
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

    async leaveRoom(userId: string, roomId: string): Promise<{ message: string }> {
        try {
            const room = await this.roomRepository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new NotFoundException('Room not found or access denied');
            }

            const ownerCount = room.members.filter(m => m.role === 'owner').length;
            const userMember = room.members.find(m => m.userId.toString() === userId);

            if (userMember?.role === 'owner' && ownerCount === 1) {
                throw new BadRequestException('Cannot leave room as the last owner. Delete the room instead.');
            }

            await this.roomRepository.removeMember(roomId, userId);

            return { message: 'Successfully left room' };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error('Leave room error:', error);
            throw new InternalServerErrorException('Failed to leave room');
        }
    }

    async deleteRoom(userId: string, roomId: string): Promise<{ message: string }> {
        try {
            const room = await this.roomRepository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new NotFoundException('Room not found or access denied');
            }

            const member = room.members.find(m => m.userId.toString() === userId);
            if (!member || member.role !== 'owner') {
                throw new ForbiddenException('Only room owners can delete rooms');
            }

            const collections = await this.collectionRepository.findByRoom(roomId);
            const collectionIds = collections.map(c => c._id.toString());

            const links = await this.linkPostRepository.findByCollections(collectionIds);
            const linkIds = links.map(l => l._id.toString());

            await Promise.all([
                ...linkIds.map(linkId => this.linkCommentRepository.deleteByLinkId(linkId)),
                this.readerAnnotationRepository.deleteByRoom(roomId),
                this.linkViewRepository.deleteByRoom(roomId)
            ]);

            if (collectionIds.length > 0) {
                await Promise.all(collectionIds.map(cid => this.linkPostRepository.deleteByCollection(cid)));
            }

            await this.collectionRepository.deleteByRoom(roomId);

            await this.roomRepository.deleteById(roomId);

            return { message: 'Successfully deleted room' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error('Delete room error:', error);
            throw new InternalServerErrorException('Failed to delete room');
        }
    }
}
