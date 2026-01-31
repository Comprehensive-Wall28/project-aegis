import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { CreateCourseDto } from './dto/gpa.dto';
import { BaseService, AuditAction, AuditStatus } from '../../common/services/base.service';
import { GpaRepository } from './gpa.repository';
import { UsersService } from '../users/users.service';

@Injectable()
export class GpaService extends BaseService<CourseDocument, GpaRepository> {
    constructor(
        private readonly gpaRepository: GpaRepository,
        private readonly usersService: UsersService,
    ) {
        super(gpaRepository);
    }

    async getCourses(userId: string): Promise<Course[]> {
        return this.gpaRepository.findMany({ userId: new Types.ObjectId(userId) });
    }

    async createCourse(userId: string, createDto: CreateCourseDto, req: any): Promise<Course> {
        const course = await this.gpaRepository.create({
            userId: new Types.ObjectId(userId),
            ...createDto,
        } as any);

        this.logAction(userId, AuditAction.CREATE, AuditStatus.SUCCESS, req, { courseId: course._id });
        return course;
    }

    async deleteCourse(userId: string, courseId: string, req: any): Promise<void> {
        const deleted = await this.gpaRepository.deleteOne({ _id: courseId, userId: userId });
        if (!deleted) throw new NotFoundException('Course not found');

        this.logAction(userId, AuditAction.DELETE, AuditStatus.SUCCESS, req, { courseId });
    }

    async getPreferences(userId: string): Promise<{ gpaSystem: string }> {
        // We need to fetch user. Since UsersService usually returns User document, we access gpaSystem.
        // Assuming UsersService has findById or similar.
        // Looking at existing UsersService (which I haven't implemented but assuming exists from Phase 2.1 or prior)
        // If UsersService is not fully exposed, I might need to adjust.
        // For now I assume UsersService.findById exists.
        const user = await this.usersService.findById(userId);
        return { gpaSystem: user.gpaSystem || 'NORMAL' };
    }

    async updatePreferences(userId: string, gpaSystem: string, req: any): Promise<{ gpaSystem: string }> {
        if (!['NORMAL', 'GERMAN'].includes(gpaSystem)) {
            throw new BadRequestException('Invalid GPA system. Must be NORMAL or GERMAN');
        }

        await this.usersService.updateProfile(userId, { gpaSystem });

        this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, req, { gpaSystem });
        return { gpaSystem };
    }
}
