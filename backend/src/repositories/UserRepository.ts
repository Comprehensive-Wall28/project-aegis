import { BaseRepository } from './base/BaseRepository';
import User, { IUser } from '../models/User';
import { SafeFilter } from './base/types';

/**
 * UserRepository handles all User database operations
 */
export class UserRepository extends BaseRepository<IUser> {
    constructor() {
        super(User);
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<IUser | null> {
        return this.findOne({
            email: { $eq: email }
        } as unknown as SafeFilter<IUser>);
    }

    /**
     * Find user by username
     */
    async findByUsername(username: string): Promise<IUser | null> {
        return this.findOne({
            username: { $eq: username }
        } as unknown as SafeFilter<IUser>);
    }

    /**
     * Find user by email or username
     */
    async findByEmailOrUsername(email: string, username: string): Promise<IUser[]> {
        return this.findMany({
            $or: [
                { email: { $eq: email } },
                { username: { $eq: username } }
            ]
        } as unknown as SafeFilter<IUser>);
    }

    /**
     * Check if username is taken by another user
     */
    async isUsernameTaken(username: string, excludeUserId: string): Promise<boolean> {
        return this.exists({
            username: { $eq: username },
            _id: { $ne: excludeUserId }
        } as unknown as SafeFilter<IUser>);
    }

    /**
     * Check if email is taken by another user
     */
    async isEmailTaken(email: string, excludeUserId: string): Promise<boolean> {
        return this.exists({
            email: { $eq: email },
            _id: { $ne: excludeUserId }
        } as unknown as SafeFilter<IUser>);
    }

    /**
     * Update user's current challenge for WebAuthn
     */
    async updateChallenge(userId: string, challenge: string | undefined): Promise<IUser | null> {
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
    ): Promise<IUser | null> {
        return this.updateById(userId, {
            $push: { webauthnCredentials: credential },
            $unset: { currentChallenge: 1 }
        } as any);
    }

    /**
     * Remove WebAuthn credential
     */
    async removeWebAuthnCredential(userId: string, credentialID: string): Promise<IUser | null> {
        return this.updateById(userId, {
            $pull: { webauthnCredentials: { credentialID } }
        } as any);
    }

    /**
     * Update password hash
     */
    async updatePasswordHash(userId: string, passwordHash: string | undefined): Promise<IUser | null> {
        if (passwordHash === undefined) {
            return this.updateById(userId, { $unset: { passwordHash: 1 } } as any);
        }
        return this.updateById(userId, { $set: { passwordHash } } as any);
    }

    /**
     * Find user for sharing (public key only)
     */
    async findForSharing(email: string): Promise<Pick<IUser, 'username' | 'pqcPublicKey'> | null> {
        const user = await this.findOne(
            { email: { $eq: email } } as unknown as SafeFilter<IUser>,
            { select: 'pqcPublicKey username' }
        );
        return user ? { username: user.username, pqcPublicKey: user.pqcPublicKey } : null;
    }
}
