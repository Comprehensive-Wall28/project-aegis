import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Room, RoomDocument } from '../schemas/room.schema';
import { SafeFilter, QueryOptions } from '../../../common/repositories/types';

@Injectable()
export class RoomRepository extends BaseRepository<RoomDocument> {
    constructor(
        @InjectModel(Room.name, 'primary')
        readonly roomModel: Model<RoomDocument>,
    ) {
        super(roomModel);
    }

    async findByMember(userId: string, options: QueryOptions = {}): Promise<RoomDocument[]> {
        const filter = {
            'members.userId': { $eq: new Types.ObjectId(userId) }
        };

        return this.findMany(filter as unknown as SafeFilter<RoomDocument>, {
            select: '_id name description icon members',
            ...options
        });
    }

    async findByIdAndMember(roomId: string, userId: string): Promise<RoomDocument | null> {
        const validatedRoomId = this.validateId(roomId);
        const validatedUserId = this.validateId(userId);

        return this.findOne({
            _id: { $eq: validatedRoomId },
            'members.userId': { $eq: validatedUserId }
        } as unknown as SafeFilter<RoomDocument>);
    }

    async findByInviteCode(inviteCode: string): Promise<RoomDocument | null> {
        return this.findOne({
            inviteCode: { $eq: inviteCode as any }
        } as unknown as SafeFilter<RoomDocument>);
    }

    async updateInviteCode(roomId: string, inviteCode: string): Promise<RoomDocument | null> {
        return this.updateById(roomId, { $set: { inviteCode } } as any);
    }

    async addMember(
        roomId: string,
        userId: string,
        role: 'owner' | 'admin' | 'member',
        encryptedRoomKey: string
    ): Promise<RoomDocument | null> {
        return this.updateById(roomId, {
            $push: {
                members: { userId: new Types.ObjectId(userId), role, encryptedRoomKey }
            }
        } as any);
    }

    async isMember(roomId: string, userId: string): Promise<boolean> {
        const room = await this.findOne({
            _id: { $eq: new Types.ObjectId(roomId) },
            'members.userId': { $eq: new Types.ObjectId(userId) }
        } as unknown as SafeFilter<RoomDocument>);
        return room !== null;
    }

    async removeMember(roomId: string, userId: string): Promise<RoomDocument | null> {
        return this.updateById(roomId, {
            $pull: {
                members: { userId: new Types.ObjectId(userId) }
            }
        } as any);
    }
}
