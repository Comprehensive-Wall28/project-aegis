import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SocialRepository } from './social.repository';
import { CollectionRepository } from './collection.repository';
import { LinkPostRepository } from './repositories/link-post.repository';
import { LinkViewRepository } from './repositories/link-view.repository';
import { LinkCommentRepository } from './repositories/link-comment.repository';
import { CreateRoomDto, RoomResponseDto } from './dto/room.dto';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';
import { RoomDocument } from './schemas/room.schema';
import { CollectionDocument } from './schemas/collection.schema';
import { BaseService } from '../../common/services/base.service';
import { AuditService } from '../../common/services/audit.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class SocialService extends BaseService<RoomDocument, SocialRepository> {
    constructor(
        private readonly socialRepository: SocialRepository,
        private readonly collectionRepository: CollectionRepository,
        private readonly linkPostRepository: LinkPostRepository,
        private readonly linkViewRepository: LinkViewRepository,
        private readonly linkCommentRepository: LinkCommentRepository,
        private readonly websocketGateway: WebsocketGateway,
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

        // Cascading delete
        const collections = await this.collectionRepository.findByRoom(roomId);
        const collectionIds = collections.map(c => c._id.toString());

        // Since we are migrating, we should at least handle collections and links if possible
        // but to keep it simple and safe as per legacy:
        await this.collectionRepository.deleteByRoom(roomId);
        await this.socialRepository.deleteById(roomId);

        await this.auditService.logAuditEvent(userId, 'ROOM_DELETE', 'SUCCESS', req, {
            roomId,
            name: room.name
        });
    }

    // ============== Collection Management ==============

    async createCollection(
        userId: string,
        roomId: string,
        data: CreateCollectionDto,
        req?: any
    ): Promise<CollectionDocument> {
        if (!data.name) {
            throw new BadRequestException('Collection name is required');
        }

        const room = await this.socialRepository.findByIdAndMember(roomId, userId);
        if (!room) {
            throw new ForbiddenException('Room not found or not a member');
        }

        const currentCount = await this.collectionRepository.count({ roomId: roomId as any });

        const collection = await this.collectionRepository.create({
            roomId: roomId as any,
            name: data.name,
            order: currentCount,
            type: data.type || 'links'
        } as any);

        // Broadcast collection creation
        this.websocketGateway.broadcastToRoom(roomId, 'COLLECTION_CREATED', {
            collection
        });

        await this.auditService.logAuditEvent(userId, 'COLLECTION_CREATE', 'SUCCESS', req, {
            collectionId: collection._id.toString(),
            roomId
        });

        return collection;
    }

    async deleteCollection(userId: string, collectionId: string, req?: any): Promise<void> {
        const collection = await this.collectionRepository.findById(collectionId);
        if (!collection) {
            throw new NotFoundException('Collection not found');
        }

        const room = await this.socialRepository.findById(collection.roomId.toString());
        if (!room) {
            throw new NotFoundException('Room not found');
        }

        const member = room.members.find(m => m.userId.toString() === userId);
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            throw new ForbiddenException('Only room owner or admin can delete collections');
        }

        // Delete all links in collection
        await this.linkPostRepository.deleteByCollection(collectionId);

        // Delete collection
        await this.collectionRepository.deleteById(collectionId);

        await this.auditService.logAuditEvent(userId, 'COLLECTION_DELETE', 'SUCCESS', req, {
            collectionId,
            roomId: room._id.toString()
        });

        // Broadcast collection deletion
        this.websocketGateway.broadcastToRoom(room._id.toString(), 'COLLECTION_DELETED', {
            collectionId,
            roomId: room._id.toString()
        });
    }

    async reorderCollections(userId: string, roomId: string, collectionIds: string[], req?: any): Promise<void> {
        const room = await this.socialRepository.findByIdAndMember(roomId, userId);
        if (!room) {
            throw new ForbiddenException('Room not found or not a member');
        }

        // Update orders sequentially
        for (let i = 0; i < collectionIds.length; i++) {
            await this.collectionRepository.updateById(collectionIds[i], { $set: { order: i } } as any);
        }

        // Broadcast new order
        this.websocketGateway.broadcastToRoom(roomId, 'COLLECTIONS_REORDERED', {
            roomId,
            collectionIds
        });

        await this.auditService.logAuditEvent(userId, 'COLLECTION_REORDER', 'SUCCESS', req, {
            roomId,
            collectionIds
        });
    }

    async updateCollection(userId: string, collectionId: string, name: string, req?: any): Promise<CollectionDocument> {
        if (!name) {
            throw new BadRequestException('Collection name is required');
        }

        const collection = await this.collectionRepository.findById(collectionId);
        if (!collection) {
            throw new NotFoundException('Collection not found');
        }

        const room = await this.socialRepository.findById(collection.roomId.toString());
        if (!room) {
            throw new NotFoundException('Room not found');
        }

        const member = room.members.find(m => m.userId.toString() === userId);
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            throw new ForbiddenException('Only room owner or admin can update collections');
        }

        const updatedCollection = await this.collectionRepository.updateById(collectionId, {
            $set: { name }
        } as any);

        if (!updatedCollection) {
            throw new NotFoundException('Failed to update collection');
        }

        // Broadcast collection update
        this.websocketGateway.broadcastToRoom(room._id.toString(), 'COLLECTION_UPDATED', {
            collection: updatedCollection
        });

        await this.auditService.logAuditEvent(userId, 'COLLECTION_UPDATE', 'SUCCESS', req, {
            collectionId,
            roomId: room._id.toString(),
            name
        });

        return updatedCollection;
    }

    // ============== Room Content ==============

    async getRoomContent(userId: string, roomId: string, targetCollectionId?: string): Promise<any> {
        const startTime = Date.now();
        const room = await this.socialRepository.findByIdAndMember(roomId, userId);
        if (!room) {
            throw new NotFoundException('Room not found or access denied');
        }

        const member = room.members.find(m => m.userId.toString() === userId);

        const [collections, viewedByCollection] = await Promise.all([
            this.collectionRepository.findByRoom(roomId),
            this.linkViewRepository.findMany({
                userId: { $eq: userId as any },
                roomId: { $eq: roomId as any }
            } as any, {
                select: 'collectionId',
                lean: true
            })
        ]);

        const viewedCounts: Record<string, number> = {};
        viewedByCollection.forEach((v: any) => {
            if (v.collectionId) {
                const cid = v.collectionId.toString();
                viewedCounts[cid] = (viewedCounts[cid] || 0) + 1;
            }
        });

        const collectionIds = collections.map(c => c._id.toString());

        let fetchCollectionId = collections.length > 0 ? collections[0]._id.toString() : null;
        if (targetCollectionId && collectionIds.includes(targetCollectionId)) {
            fetchCollectionId = targetCollectionId;
        }

        const limit = 12;

        const [collectionStats, initialLinksResult] = await Promise.all([
            this.linkPostRepository.groupCountByCollections(collectionIds),
            fetchCollectionId
                ? this.linkPostRepository.findByCollectionCursor(fetchCollectionId, limit)
                : Promise.resolve({ links: [], totalCount: 0 })
        ]);

        const unviewedCounts: Record<string, number> = {};
        collections.forEach((c: any) => unviewedCounts[c._id.toString()] = 0);

        collectionStats.forEach((stat: { _id: string; count: number }) => {
            const cid = stat._id.toString();
            const total = stat.count;
            const viewed = viewedCounts[cid] || 0;
            unviewedCounts[cid] = Math.max(0, total - viewed);
        });

        const initialLinks = initialLinksResult.links;
        let initialViewedLinkIds: string[] = [];
        let initialCommentCounts: Record<string, number> = {};

        if (initialLinks.length > 0) {
            const initialIds = initialLinks.map((l: any) => l._id.toString());
            const [viewed, comments] = await Promise.all([
                this.linkViewRepository.findViewedLinkIds(userId, initialIds),
                this.linkCommentRepository.countByLinkIds(initialIds)
            ]);
            initialViewedLinkIds = viewed;
            initialCommentCounts = comments;
        }

        const duration = Date.now() - startTime;
        this.logger.log(`[Performance] getRoomContent for room ${roomId} took ${duration}ms`);

        return {
            room: {
                _id: room._id.toString(),
                name: room.name,
                description: room.description,
                icon: room.icon,
                role: member?.role || 'member',
                encryptedRoomKey: member?.encryptedRoomKey
            },
            collections,
            links: initialLinks,
            viewedLinkIds: initialViewedLinkIds,
            commentCounts: initialCommentCounts,
            unviewedCounts
        };
    }
}
