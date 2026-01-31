
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersRepository extends BaseRepository<UserDocument> {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
        super(userModel);
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.findOne({ email: email.toLowerCase().trim() });
    }

    async findByUsername(username: string): Promise<UserDocument | null> {
        return this.findOne({ username: username.trim() });
    }

    async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
        const query: any = { email: email.toLowerCase().trim() };
        if (excludeUserId) {
            query._id = { $ne: excludeUserId };
        }
        return this.exists(query);
    }

    async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
        const query: any = { username: username.trim() };
        if (excludeUserId) {
            query._id = { $ne: excludeUserId };
        }
        return this.exists(query);
    }

    async findForSharing(email: string): Promise<{ username: string; pqcPublicKey: string } | null> {
        return this.findOne(
            { email: email.toLowerCase().trim() },
            { select: 'username pqcPublicKey' }
        ) as any;
    }

    async updatePasswordHash(userId: string, hash: string | undefined): Promise<void> {
        await this.updateById(userId, {
            $set: { passwordHash: hash }
        } as any);
    }
}
