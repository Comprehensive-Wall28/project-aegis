import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class SocialRepository extends BaseRepository<RoomDocument> {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
  ) {
    super(roomModel);
  }

  async findByMember(userId: string): Promise<RoomDocument[]> {
    return this.roomModel
      .find({
        'members.userId': new Types.ObjectId(userId),
      })
      .exec();
  }

  async findByInviteCode(inviteCode: string): Promise<RoomDocument | null> {
    return this.roomModel.findOne({ inviteCode }).exec();
  }

  async findByIdAndMember(
    roomId: string,
    userId: string,
  ): Promise<RoomDocument | null> {
    return this.roomModel
      .findOne({
        _id: new Types.ObjectId(roomId),
        'members.userId': new Types.ObjectId(userId),
      })
      .exec();
  }

  async updateInviteCode(roomId: string, inviteCode: string): Promise<void> {
    await this.roomModel
      .updateOne({ _id: new Types.ObjectId(roomId) }, { $set: { inviteCode } })
      .exec();
  }

  async addMember(
    roomId: string,
    userId: string,
    role: string,
    encryptedRoomKey: string,
  ): Promise<void> {
    await this.roomModel
      .updateOne(
        { _id: new Types.ObjectId(roomId) },
        {
          $push: {
            members: {
              userId: new Types.ObjectId(userId),
              role,
              encryptedRoomKey,
            },
          },
        },
      )
      .exec();
  }

  async removeMember(roomId: string, userId: string): Promise<void> {
    await this.roomModel
      .updateOne(
        { _id: new Types.ObjectId(roomId) },
        {
          $pull: {
            members: { userId: new Types.ObjectId(userId) },
          },
        },
      )
      .exec();
  }
}
