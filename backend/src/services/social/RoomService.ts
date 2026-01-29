import { Request } from 'express';
import { randomBytes } from 'crypto';
import { BaseService, ServiceError } from '../base/BaseService';
import { RoomRepository } from '../../repositories/RoomRepository';
import { CollectionRepository } from '../../repositories/CollectionRepository';
import { LinkPostRepository } from '../../repositories/LinkPostRepository';
import { LinkViewRepository } from '../../repositories/LinkViewRepository';
import { LinkCommentRepository } from '../../repositories/LinkCommentRepository';
import { IRoom } from '../../models/Room';
import { ICollection } from '../../models/Collection';
import { ILinkPost } from '../../models/LinkPost';
import logger from '../../utils/logger';

export interface CreateRoomDTO {
    name: string;
    description?: string;
    icon?: string;
    encryptedRoomKey: string;
}

export interface RoomWithKey {
    _id: string;
    name: string;
    description: string;
    icon: string;
    encryptedRoomKey?: string;
}

export interface RoomContent {
    room: RoomWithKey;
    collections: ICollection[];
    links: ILinkPost[];
    viewedLinkIds: string[];
    commentCounts: Record<string, number>;
    unviewedCounts: Record<string, number>;
}

export class RoomService extends BaseService<IRoom, RoomRepository> {
    private collectionRepo: CollectionRepository;
    private linkPostRepo: LinkPostRepository;
    private linkViewRepo: LinkViewRepository;
    private linkCommentRepo: LinkCommentRepository;

    constructor() {
        super(new RoomRepository());
        this.collectionRepo = new CollectionRepository();
        this.linkPostRepo = new LinkPostRepository();
        this.linkViewRepo = new LinkViewRepository();
        this.linkCommentRepo = new LinkCommentRepository();
    }

    async createRoom(userId: string, data: CreateRoomDTO, req: Request): Promise<IRoom> {
        try {
            if (!data.name || !data.encryptedRoomKey) {
                throw new ServiceError('Missing required fields: name, encryptedRoomKey', 400);
            }

            const room = await this.repository.create({
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
            await this.collectionRepo.create({
                roomId: room._id,
                name: '',
                type: 'links'
            } as any);

            await this.logAction(userId, 'ROOM_CREATE', 'SUCCESS', req, {
                roomId: room._id.toString()
            });

            return room;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create room error:', error);
            throw new ServiceError('Failed to create room', 500);
        }
    }

    async getUserRooms(userId: string): Promise<RoomWithKey[]> {
        try {
            const rooms = await this.repository.findByMember(userId);

            return rooms.map(room => {
                const member = room.members.find(m => m.userId.toString() === userId);
                return {
                    _id: room._id.toString(),
                    name: room.name,
                    description: room.description,
                    icon: room.icon,
                    // encryptedRoomKey IS needed in list view to decrypt room names/descriptions
                    encryptedRoomKey: member?.encryptedRoomKey
                };
            });
        } catch (error) {
            logger.error('Get user rooms error:', error);
            throw new ServiceError('Failed to get rooms', 500);
        }
    }

    async createInvite(userId: string, roomId: string, req: Request): Promise<string> {
        try {
            const room = await this.repository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found', 404);
            }

            const member = room.members.find(m => m.userId.toString() === userId);
            if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
                throw new ServiceError('Permission denied', 403);
            }

            const inviteCode = randomBytes(6).toString('base64url');
            await this.repository.updateInviteCode(roomId, inviteCode);

            await this.logAction(userId, 'ROOM_INVITE_CREATE', 'SUCCESS', req, { roomId });

            return inviteCode;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create invite error:', error);
            throw new ServiceError('Failed to create invite', 500);
        }
    }

    async getInviteInfo(inviteCode: string): Promise<{ name: string; description: string; icon: string }> {
        try {
            if (!inviteCode) {
                throw new ServiceError('Invite code required', 400);
            }

            const room = await this.repository.findByInviteCode(inviteCode);
            if (!room) {
                throw new ServiceError('Invite not found or expired', 404);
            }

            return {
                name: room.name,
                description: room.description,
                icon: room.icon
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get invite info error:', error);
            throw new ServiceError('Failed to get invite info', 500);
        }
    }

    async joinRoom(
        userId: string,
        inviteCode: string,
        encryptedRoomKey: string,
        req: Request
    ): Promise<string> {
        try {
            if (!inviteCode || !encryptedRoomKey) {
                throw new ServiceError('Missing required fields: inviteCode, encryptedRoomKey', 400);
            }

            const room = await this.repository.findByInviteCode(inviteCode);
            if (!room) {
                throw new ServiceError('Invite not found or expired', 404);
            }

            const existingMember = room.members.find(m => m.userId.toString() === userId);
            if (existingMember) {
                throw new ServiceError('Already a member of this room', 400);
            }

            await this.repository.addMember(room._id.toString(), userId, 'member', encryptedRoomKey);

            await this.logAction(userId, 'ROOM_JOIN', 'SUCCESS', req, {
                roomId: room._id.toString()
            });

            return room._id.toString();
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Join room error:', error);
            throw new ServiceError('Failed to join room', 500);
        }
    }

    async getRoomContent(userId: string, roomId: string, targetCollectionId?: string): Promise<RoomContent> {
        const startTime = Date.now();
        try {
            const room = await this.repository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or access denied', 404);
            }

            const member = room.members.find(m => m.userId.toString() === userId);

            // OPTIMIZATION: Run collections and viewedByCollection queries in parallel
            const [collections, viewedByCollection] = await Promise.all([
                this.collectionRepo.findByRoom(roomId),
                this.linkViewRepo.findMany({
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

            // Determine which collection to fetch links for
            // If targetCollectionId is provided and exists in room, use it
            // Otherwise default to first collection
            let fetchCollectionId = collections.length > 0 ? collections[0]._id.toString() : null;
            if (targetCollectionId && collectionIds.includes(targetCollectionId)) {
                fetchCollectionId = targetCollectionId;
            }

            const limit = 12;

            const [collectionStats, initialLinksResult] = await Promise.all([
                this.linkPostRepo.groupCountByCollections(collectionIds),
                fetchCollectionId
                    ? this.linkPostRepo.findByCollectionCursor(fetchCollectionId, limit)
                    : Promise.resolve({ links: [], totalCount: 0 })
            ]);

            const unviewedCounts: Record<string, number> = {};
            collections.forEach(c => unviewedCounts[c._id.toString()] = 0);

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
                const initialIds = initialLinks.map((l: ILinkPost) => l._id.toString());
                const [viewed, comments] = await Promise.all([
                    this.linkViewRepo.findViewedLinkIds(userId, initialIds),
                    this.linkCommentRepo.countByLinkIds(initialIds)
                ]);
                initialViewedLinkIds = viewed;
                initialCommentCounts = comments;
            }

            const duration = Date.now() - startTime;
            logger.info(`[Performance] getRoomContent for room ${roomId} took ${duration}ms (optimized)`);

            return {
                room: {
                    _id: room._id.toString(),
                    name: room.name,
                    description: room.description,
                    icon: room.icon,
                    encryptedRoomKey: member?.encryptedRoomKey
                },
                collections,
                links: initialLinks,
                viewedLinkIds: initialViewedLinkIds,
                commentCounts: initialCommentCounts,
                unviewedCounts
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Get room content error:', error);
            throw new ServiceError('Failed to get room content', 500);
        }
    }

    async leaveRoom(userId: string, roomId: string, req: Request): Promise<void> {
        try {
            const room = await this.repository.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or access denied', 404);
            }

            // check if user is the last owner
            const ownerCount = room.members.filter(m => m.role === 'owner').length;
            const userMember = room.members.find(m => m.userId.toString() === userId);

            if (userMember?.role === 'owner' && ownerCount === 1) {
                throw new ServiceError('Cannot leave room as the last owner. Delete the room instead.', 400);
            }

            await this.repository.removeMember(roomId, userId);

            await this.logAction(userId, 'ROOM_LEAVE', 'SUCCESS', req, {
                roomId
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Leave room error:', error);
            throw new ServiceError('Failed to leave room', 500);
        }
    }
}
