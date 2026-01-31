
import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UserDocument } from './schemas/user.schema';
import { ServiceError } from '../../common/services/base.service';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private readonly usersRepository: UsersRepository) { }

    async create(data: Partial<UserDocument>): Promise<UserDocument> {
        return this.usersRepository.create(data);
    }

    async findById(id: string): Promise<UserDocument> {
        const user = await this.usersRepository.findById(id);
        if (!user) {
            throw new ServiceError('User not found', 404);
        }
        return user;
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.usersRepository.findByEmail(email);
    }

    async findByUsername(username: string): Promise<UserDocument | null> {
        return this.usersRepository.findByUsername(username);
    }

    async updateProfile(userId: string, data: any): Promise<UserDocument> {
        const user = await this.findById(userId);

        // Check uniqueness if changing
        if (data.username && data.username !== user.username) {
            if (await this.usersRepository.isUsernameTaken(data.username, userId)) {
                throw new ServiceError('Username already taken', 400);
            }
        }

        if (data.email && data.email !== user.email) {
            if (await this.usersRepository.isEmailTaken(data.email, userId)) {
                throw new ServiceError('Email already taken', 400);
            }
        }

        const updated = await this.usersRepository.updateById(userId, { $set: data });
        if (!updated) {
            throw new ServiceError('Failed to update profile', 500);
        }
        return updated;
    }
}
