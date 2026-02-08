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
        const validatedCourseId = this.validateId(courseId);
        const validatedUserId = this.validateId(userId);
        return this.findOne({
            _id: { $eq: validatedCourseId },
            userId: { $eq: validatedUserId }
        } as unknown as SafeFilter<ICourse>);
    }

    /**
     * Delete course by ID and user
     */
    async deleteByIdAndUser(courseId: string, userId: string): Promise<boolean> {
        const validatedCourseId = this.validateId(courseId);
        const validatedUserId = this.validateId(userId);
        return this.deleteOne({
            _id: { $eq: validatedCourseId },
            userId: { $eq: validatedUserId }
        } as unknown as SafeFilter<ICourse>);
    }
}
