import { BaseRepository } from './base/BaseRepository';
import Room, { IRoom } from '../models/Room';
import { SafeFilter } from './base/types';

/**
 * RoomRepository handles all Room database operations
 */
export class RoomRepository extends BaseRepository<IRoom> {
    constructor() {
        super(Room);
    }

    /**
     * Find rooms by member userId
     */
    async findByMember(userId: string): Promise<IRoom[]> {
        return this.findMany({
            'members.userId': { $eq: userId as any }
        } as SafeFilter<IRoom>, {
            select: '_id name description icon members'
        });
    }

    /**
     * Find room by ID and member
     */
    async findByIdAndMember(roomId: string, userId: string): Promise<IRoom | null> {
        return this.findOne({
            _id: { $eq: roomId },
            'members.userId': { $eq: userId }
        } as unknown as SafeFilter<IRoom>);
    }

    /**
     * Find room by invite code
     */
    async findByInviteCode(inviteCode: string): Promise<IRoom | null> {
        return this.findOne({
            inviteCode: { $eq: inviteCode as any }
        } as SafeFilter<IRoom>);
    }

    /**
     * Update room's invite code
     */
    async updateInviteCode(roomId: string, inviteCode: string): Promise<IRoom | null> {
        return this.updateById(roomId, { $set: { inviteCode } } as any);
    }

    /**
     * Add member to room
     */
    async addMember(
        roomId: string,
        userId: string,
        role: 'owner' | 'admin' | 'member',
        encryptedRoomKey: string
    ): Promise<IRoom | null> {
        return this.updateById(roomId, {
            $push: {
                members: { userId, role, encryptedRoomKey }
            }
        } as any);
    }

    /**
     * Remove member from room
     */
    async removeMember(roomId: string, userId: string): Promise<IRoom | null> {
        return this.updateById(roomId, {
            $pull: {
                members: { userId }
            }
        } as any);
    }
}
