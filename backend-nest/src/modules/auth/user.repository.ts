import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/database/base.repository';
import { User } from './user.schema';
import { SafeFilter } from '../../common/database/types';

@Injectable()
export class UserRepository extends BaseRepository<User> {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {
        super(userModel);
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.findOne({
            email: { $eq: email }
        } as unknown as SafeFilter<User>);
    }

    /**
     * Find user by username
     */
    async findByUsername(username: string): Promise<User | null> {
        return this.findOne({
            username: { $eq: username }
        } as unknown as SafeFilter<User>);
    }

    /**
     * Find user by email or username
     */
    async findByEmailOrUsername(email: string, username: string): Promise<User[]> {
        return this.findMany({
            $or: [
                { email: { $eq: email } },
                { username: { $eq: username } }
            ]
        } as unknown as SafeFilter<User>);
    }

    /**
     * Check if username is taken by another user
     */
    async isUsernameTaken(username: string, excludeUserId: string): Promise<boolean> {
        const userId = this.validateId(excludeUserId);
        return this.model.exists({
            username: { $eq: username },
            _id: { $ne: userId }
        } as any).then(res => !!res);
    }

    /**
     * Check if email is taken by another user
     */
    async isEmailTaken(email: string, excludeUserId: string): Promise<boolean> {
        const userId = this.validateId(excludeUserId);
        return this.model.exists({
            email: { $eq: email },
            _id: { $ne: userId }
        } as any).then(res => !!res);
    }

    /**
     * Update user's current challenge for WebAuthn
     */
    async updateChallenge(userId: string, challenge: string | undefined): Promise<User | null> {
        // Validation happens in updateById
        return this.updateById(userId, { $set: { currentChallenge: challenge } } as any);
    }

    /**
     * Add WebAuthn credential
     */
    async addWebAuthnCredential(
        userId: string,
        credential: {
            credentialID: string;
            publicKey: string;
            counter: number;
            transports?: string[];
        }
    ): Promise<User | null> {
        return this.updateById(userId, {
            $push: { webauthnCredentials: credential },
            $unset: { currentChallenge: 1 }
        } as any);
    }

    /**
     * Remove WebAuthn credential
     */
    async removeWebAuthnCredential(userId: string, credentialID: string): Promise<User | null> {
        return this.updateById(userId, {
            $pull: { webauthnCredentials: { credentialID } }
        } as any);
    }

    /**
     * Update password hash
     */
    async updatePasswordHash(userId: string, passwordHash: string | undefined): Promise<User | null> {
        if (passwordHash === undefined) {
            return this.updateById(userId, { $unset: { passwordHash: 1 } } as any);
        }
        return this.updateById(userId, { $set: { passwordHash } } as any);
    }

    /**
     * Increment token version to invalidate all existing tokens for a user.
     * Called on logout to ensure old tokens can't be reused.
     */
    async incrementTokenVersion(userId: string): Promise<User | null> {
        return this.updateById(userId, { $inc: { tokenVersion: 1 } } as any);
    }

    /**
     * Find user for sharing (public key only)
     */
    async findForSharing(email: string): Promise<Pick<User, 'username' | 'pqcPublicKey'> | null> {
        const user = await this.findOne(
            { email: { $eq: email } } as unknown as SafeFilter<User>,
            { select: 'pqcPublicKey username' }
        );
        return user ? { username: user.username, pqcPublicKey: user.pqcPublicKey } : null;
    }
}
