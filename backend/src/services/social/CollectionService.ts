// import { Request } from 'express'; // Removed for Fastify migration
import { BaseService, ServiceError } from '../base/BaseService';
import { CollectionRepository } from '../../repositories/CollectionRepository';
import { RoomRepository } from '../../repositories/RoomRepository';
import { LinkPostRepository } from '../../repositories/LinkPostRepository';
import { ICollection } from '../../models/Collection';
import logger from '../../utils/logger';
import SocketManager from '../../utils/SocketManager';

export interface CreateCollectionDTO {
    name: string;
    type?: 'links' | 'discussion';
}

export class CollectionService extends BaseService<ICollection, CollectionRepository> {
    private roomRepo: RoomRepository;
    private linkPostRepo: LinkPostRepository;

    constructor() {
        super(new CollectionRepository());
        this.roomRepo = new RoomRepository();
        this.linkPostRepo = new LinkPostRepository();
    }

    async createCollection(
        userId: string,
        roomId: string,
        data: CreateCollectionDTO,
        req: any
    ): Promise<ICollection> {
        try {
            if (!data.name) {
                throw new ServiceError('Collection name is required', 400);
            }

            const room = await this.roomRepo.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or not a member', 403);
            }

            const currentCount = await this.repository.countByRoom(roomId);

            const collection = await this.repository.create({
                roomId: roomId as any,
                name: data.name,
                order: currentCount,
                type: data.type || 'links'
            } as any);

            // Broadcast collection creation
            SocketManager.broadcastToRoom(roomId, 'COLLECTION_CREATED', {
                collection
            });

            await this.logAction(userId, 'COLLECTION_CREATE', 'SUCCESS', req, {
                collectionId: collection._id.toString(),
                roomId
            });

            return collection;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create collection error:', error);
            throw new ServiceError('Failed to create collection', 500);
        }
    }

    async deleteCollection(userId: string, collectionId: string, req: any): Promise<void> {
        try {
            const collection = await this.repository.findById(collectionId);
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            const room = await this.roomRepo.findById(collection.roomId.toString());
            if (!room) {
                throw new ServiceError('Room not found', 404);
            }

            const member = room.members.find(m => m.userId.toString() === userId);
            if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
                throw new ServiceError('Only room owner or admin can delete collections', 403);
            }

            // Delete all links in collection
            await this.linkPostRepo.deleteByCollection(collectionId);

            // Delete collection
            await this.repository.deleteById(collectionId);

            await this.logAction(userId, 'COLLECTION_DELETE', 'SUCCESS', req, {
                collectionId,
                roomId: room._id.toString()
            });

            // Broadcast collection deletion
            SocketManager.broadcastToRoom(room._id.toString(), 'COLLECTION_DELETED', {
                collectionId,
                roomId: room._id.toString()
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete collection error:', error);
            throw new ServiceError('Failed to delete collection', 500);
        }
    }

    async reorderCollections(userId: string, roomId: string, collectionIds: string[], req: any): Promise<void> {
        try {
            const room = await this.roomRepo.findByIdAndMember(roomId, userId);
            if (!room) {
                throw new ServiceError('Room not found or not a member', 403);
            }

            // Update orders in bulk or sequentially
            const updatePromises = collectionIds.map((id, index) =>
                this.repository.updateById(id, { $set: { order: index } } as any)
            );

            await Promise.all(updatePromises);

            // Broadcast new order
            SocketManager.broadcastToRoom(roomId, 'COLLECTIONS_REORDERED', {
                roomId,
                collectionIds
            });

            await this.logAction(userId, 'COLLECTION_REORDER', 'SUCCESS', req, {
                roomId,
                collectionIds
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Reorder collections error:', error);
            throw new ServiceError('Failed to reorder collections', 500);
        }
    }

    async updateCollection(userId: string, collectionId: string, name: string, req: any): Promise<ICollection> {
        try {
            if (!name) {
                throw new ServiceError('Collection name is required', 400);
            }

            const collection = await this.repository.findById(collectionId);
            if (!collection) {
                throw new ServiceError('Collection not found', 404);
            }

            const room = await this.roomRepo.findById(collection.roomId.toString());
            if (!room) {
                throw new ServiceError('Room not found', 404);
            }

            const member = room.members.find(m => m.userId.toString() === userId);
            if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
                throw new ServiceError('Only room owner or admin can update collections', 403);
            }

            const updatedCollection = await this.repository.updateById(collectionId, {
                $set: { name }
            } as any);

            if (!updatedCollection) {
                throw new ServiceError('Failed to update collection', 500);
            }

            // Broadcast collection update
            SocketManager.broadcastToRoom(room._id.toString(), 'COLLECTION_UPDATED', {
                collection: updatedCollection
            });

            await this.logAction(userId, 'COLLECTION_UPDATE', 'SUCCESS', req, {
                collectionId,
                roomId: room._id.toString(),
                name
            });

            return updatedCollection;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Update collection error:', error);
            throw new ServiceError('Failed to update collection', 500);
        }
    }
}
