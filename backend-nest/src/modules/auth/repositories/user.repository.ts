import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserRepository extends BaseRepository<UserDocument> {
  constructor(
    @InjectModel(User.name, 'primary') userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.findOne({ email: { $eq: email } });
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return await this.findOne({ username: { $eq: username } });
  }

  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    const query: any = { email: { $eq: email } };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    return await this.exists(query);
  }

  async isUsernameTaken(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const query: any = { username: { $eq: username } };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    return await this.exists(query);
  }

  async findForSharing(email: string): Promise<UserDocument | null> {
    return await this.model
      .findOne({ email: { $eq: email } }, { username: 1, pqcPublicKey: 1 })
      .exec();
  }
  async updateChallenge(userId: string, challenge: string): Promise<void> {
    await this.updateById(userId, {
      $set: { currentChallenge: challenge },
    } as any);
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await this.updateById(userId, {
      $inc: { tokenVersion: 1 },
    } as any);
  }
}
