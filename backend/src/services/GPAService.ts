import { Request } from 'express';
import { BaseService, ServiceError } from './base/BaseService';
import { CourseRepository } from '../repositories/CourseRepository';
import { UserRepository } from '../repositories/UserRepository';
import { ICourse } from '../models/Course';
import logger from '../utils/logger';

/**
 * DTO for creating a course
 */
export interface CreateCourseDTO {
    encryptedData: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
}

/**
 * GPAService handles GPA/Course business logic
 */
export class GPAService extends BaseService<ICourse, CourseRepository> {
    private userRepo: UserRepository;

    constructor() {
        super(new CourseRepository());
        this.userRepo = new UserRepository();
    }

    /**
     * Get all courses for user
     */
    async getCourses(userId: string): Promise<ICourse[]> {
        try {
            return await this.repository.findByUser(userId);
        } catch (error) {
            logger.error('Get courses error:', error);
            throw new ServiceError('Failed to fetch courses', 500);
        }
    }

    /**
     * Create a new course
     */
    async createCourse(userId: string, data: CreateCourseDTO, req: Request): Promise<ICourse> {
        try {
            if (!data.encryptedData || !data.encapsulatedKey || !data.encryptedSymmetricKey) {
                throw new ServiceError(
                    'Missing required fields: encryptedData, encapsulatedKey, encryptedSymmetricKey',
                    400
                );
            }

            const course = await this.repository.create({
                userId: userId as any,
                encryptedData: data.encryptedData,
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey
            } as any);


            await this.logAction(userId, 'COURSE_CREATE', 'SUCCESS', req, {
                courseId: course._id.toString()
            });

            return course;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create course error:', error);
            throw new ServiceError('Failed to create course', 500);
        }
    }

    /**
     * Delete a course
     */
    async deleteCourse(userId: string, courseId: string, req: Request): Promise<void> {
        try {
            const deleted = await this.repository.deleteByIdAndUser(courseId, userId);

            if (!deleted) {
                throw new ServiceError('Course not found', 404);
            }


            await this.logAction(userId, 'COURSE_DELETE', 'SUCCESS', req, {
                courseId
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete course error:', error);
            throw new ServiceError('Failed to delete course', 500);
        }
    }

    /**
     * Get user's GPA preferences
     */
    async getPreferences(userId: string): Promise<{ gpaSystem: string }> {
        try {
            const user = await this.userRepo.findById(userId);
            return { gpaSystem: user?.gpaSystem || 'NORMAL' };
        } catch (error) {
            logger.error('Get preferences error:', error);
            throw new ServiceError('Failed to fetch preferences', 500);
        }
    }

    /**
     * Update user's GPA system preference
     */
    async updatePreferences(
        userId: string,
        gpaSystem: string,
        req: Request
    ): Promise<{ gpaSystem: string }> {
        try {
            const normalizedGpaSystem = String(gpaSystem);

            if (!['NORMAL', 'GERMAN'].includes(normalizedGpaSystem)) {
                throw new ServiceError('Invalid GPA system. Must be NORMAL or GERMAN', 400);
            }

            const user = await this.userRepo.updateById(userId, {
                $set: { gpaSystem: normalizedGpaSystem }
            } as any);

            if (!user) {
                throw new ServiceError('User not found', 404);
            }


            await this.logAction(userId, 'PREFERENCES_UPDATE', 'SUCCESS', req, {
                gpaSystem: normalizedGpaSystem
            });

            return { gpaSystem: user.gpaSystem };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Update preferences error:', error);
            throw new ServiceError('Failed to update preferences', 500);
        }
    }
}
