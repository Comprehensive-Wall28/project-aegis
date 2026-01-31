import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SocialRepository } from './social.repository';
import { CollectionRepository } from './collection.repository';
import { CreateRoomDto, RoomResponseDto } from './dto/room.dto';
import { RoomDocument } from './schemas/room.schema';
import { BaseService } from '../../common/services/base.service';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class SocialService extends BaseService<RoomDocument, SocialRepository> {
    constructor(
        private readonly socialRepository: SocialRepository,
        private readonly collectionRepository: CollectionRepository,
        private readonly auditService: AuditService,
    ) {
        super(socialRepository);
    }

    async createRoom(userId: string, data: CreateRoomDto, req?: any): Promise<RoomDocument> {
        if (!data.name || !data.encryptedRoomKey) {
            throw new BadRequestException('Missing required fields: name, encryptedRoomKey');
        }

        const room = await this.socialRepository.create({
            name: data.name,
            description: data.description || '',
            icon: data.icon || '',
            members: [{
                userId: userId as any,
                role: 'owner',
                encryptedRoomKey: data.encryptedRoomKey
            }]
        } as any);

        // Create default Links collection
        await this.collectionRepository.create({
            roomId: room._id,
            name: '',
            type: 'links',
            order: 0
        } as any);

        await this.auditService.logAuditEvent(userId, 'ROOM_CREATE', 'SUCCESS', req, {
            roomId: room._id.toString()
        });

        return room;
    }

    async getUserRooms(userId: string): Promise<RoomResponseDto[]> {
        const rooms = await this.socialRepository.findByMember(userId);

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
    }

    async createInvite(userId: string, roomId: string, req?: any): Promise<string> {
        const room = await this.socialRepository.findByIdAndMember(roomId, userId);
        if (!room) {
            throw new NotFoundException('Room not found');
        }

        const member = room.members.find(m => m.userId.toString() === userId);
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            throw new ForbiddenException('Permission denied');
        }

        const inviteCode = randomBytes(6).toString('base64url');
        await this.socialRepository.updateInviteCode(roomId, inviteCode);

        await this.auditService.logAuditEvent(userId, 'ROOM_INVITE_CREATE', 'SUCCESS', req, { roomId });

        return inviteCode;
    }

    async getInviteInfo(inviteCode: string): Promise<{ name: string; description: string; icon: string }> {
        if (!inviteCode) {
            throw new BadRequestException('Invite code required');
        }

        const room = await this.socialRepository.findByInviteCode(inviteCode);
        if (!room) {
            throw new NotFoundException('Invite not found or expired');
        }

        return {
            name: room.name,
            description: room.description,
            icon: room.icon
        };
    }

    async joinRoom(
        userId: string,
        inviteCode: string,
        encryptedRoomKey: string,
        req?: any
    ): Promise<string> {
        if (!inviteCode || !encryptedRoomKey) {
            throw new BadRequestException('Missing required fields: inviteCode, encryptedRoomKey');
        }

        const room = await this.socialRepository.findByInviteCode(inviteCode);
        if (!room) {
            throw new NotFoundException('Invite not found or expired');
        }

        const existingMember = room.members.find(m => m.userId.toString() === userId);
        if (existingMember) {
            throw new BadRequestException('Already a member of this room');
        }

        await this.socialRepository.addMember(room._id.toString(), userId, 'member', encryptedRoomKey);

        await this.auditService.logAuditEvent(userId, 'ROOM_JOIN', 'SUCCESS', req, {
            roomId: room._id.toString()
        });

        return room._id.toString();
    }

    async leaveRoom(userId: string, roomId: string, req?: any): Promise<void> {
        const room = await this.socialRepository.findByIdAndMember(roomId, userId);
        if (!room) {
            throw new NotFoundException('Room not found or access denied');
        }

        const ownerCount = room.members.filter(m => m.role === 'owner').length;
        const userMember = room.members.find(m => m.userId.toString() === userId);

        if (userMember?.role === 'owner' && ownerCount === 1) {
            throw new BadRequestException('Cannot leave room as the last owner. Delete the room instead.');
        }

        await this.socialRepository.removeMember(roomId, userId);

        await this.auditService.logAuditEvent(userId, 'ROOM_LEAVE', 'SUCCESS', req, {
            roomId
        });
    }

    async deleteRoom(userId: string, roomId: string, req?: any): Promise<void> {
        const room = await this.socialRepository.findByIdAndMember(roomId, userId);
        if (!room) {
            throw new NotFoundException('Room not found or access denied');
        }

        const member = room.members.find(m => m.userId.toString() === userId);
        if (!member || member.role !== 'owner') {
            throw new ForbiddenException('Only room owners can delete rooms');
        }

        // Partial cascading delete (only rooms and collections for now)
        // Full cascading delete would include links, comments, etc.
        // But since we haven't migrated those yet, we'll stick to what we have.

        await this.collectionRepository.deleteByRoom(roomId);
        await this.socialRepository.deleteById(roomId);

        await this.auditService.logAuditEvent(userId, 'ROOM_DELETE', 'SUCCESS', req, {
            roomId,
            name: room.name
        });
    }
}
