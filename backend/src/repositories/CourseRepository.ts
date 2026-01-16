import { BaseRepository } from './base/BaseRepository';
import Course, { ICourse } from '../models/Course';
import { SafeFilter } from './base/types';

/**
 * CourseRepository handles Course database operations
 */
export class CourseRepository extends BaseRepository<ICourse> {
    constructor() {
        super(Course);
    }

    /**
     * Find all courses by user
     */
    async findByUser(userId: string): Promise<ICourse[]> {
        return this.findMany({
            userId: { $eq: userId }
        } as unknown as SafeFilter<ICourse>, {
            sort: { createdAt: -1 }
        });
    }

    /**
     * Find course by ID and user
     */
    async findByIdAndUser(courseId: string, userId: string): Promise<ICourse | null> {
        return this.findOne({
            _id: { $eq: courseId },
            userId: { $eq: userId }
        } as unknown as SafeFilter<ICourse>);
    }

    /**
     * Delete course by ID and user
     */
    async deleteByIdAndUser(courseId: string, userId: string): Promise<boolean> {
        return this.deleteOne({
            _id: { $eq: courseId },
            userId: { $eq: userId }
        } as unknown as SafeFilter<ICourse>);
    }

    /**
     * Find unmigrated (plaintext) courses
     */
    async findUnmigrated(userId: string): Promise<ICourse[]> {
        return this.findMany({
            userId: { $eq: userId },
            name: { $exists: true, $ne: null },
            encryptedData: { $exists: false }
        } as unknown as SafeFilter<ICourse>, {
            sort: { createdAt: -1 }
        });
    }

    /**
     * Migrate course to encrypted format
     */
    async migrateToEncrypted(
        courseId: string,
        userId: string,
        encryptedData: string,
        encapsulatedKey: string,
        encryptedSymmetricKey: string
    ): Promise<ICourse | null> {
        return this.updateOne(
            {
                _id: { $eq: courseId },
                userId: { $eq: userId }
            } as unknown as SafeFilter<ICourse>,
            {
                $set: { encryptedData, encapsulatedKey, encryptedSymmetricKey },
                $unset: { name: 1, grade: 1, credits: 1, semester: 1 }
            },
            { returnNew: true }
        );
    }
}
