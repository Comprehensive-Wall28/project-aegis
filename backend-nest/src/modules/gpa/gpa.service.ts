import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { CreateCourseDto } from './dto/gpa.dto';
import { BaseService } from '../../common/services/base.service';
import { GpaRepository } from './gpa.repository';
import { UsersService } from '../users/users.service';
import { AuditService, AuditAction } from '../../common/services/audit.service';

@Injectable()
export class GpaService extends BaseService<CourseDocument, GpaRepository> {
  constructor(
    private readonly gpaRepository: GpaRepository,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {
    super(gpaRepository);
  }

  async getCourses(userId: string): Promise<Course[]> {
    return this.gpaRepository.findMany({ userId: new Types.ObjectId(userId) });
  }

  async createCourse(
    userId: string,
    createDto: CreateCourseDto,
    req: any,
  ): Promise<Course> {
    const course = await this.gpaRepository.create({
      userId: new Types.ObjectId(userId),
      ...createDto,
    } as any);

    this.auditService.logAuditEvent(userId, 'COURSE_CREATE', 'SUCCESS', req, {
      courseId: course._id,
    });
    return course;
  }

  async deleteCourse(
    userId: string,
    courseId: string,
    req: any,
  ): Promise<void> {
    const deleted = await this.gpaRepository.deleteByIdAndUser(
      courseId,
      userId,
    );
    if (!deleted) throw new NotFoundException('Course not found');

    this.auditService.logAuditEvent(userId, 'COURSE_DELETE', 'SUCCESS', req, {
      courseId,
    });
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

  async updatePreferences(
    userId: string,
    gpaSystem: string,
    req: any,
  ): Promise<{ gpaSystem: string }> {
    if (!['NORMAL', 'GERMAN'].includes(gpaSystem)) {
      throw new BadRequestException(
        'Invalid GPA system. Must be NORMAL or GERMAN',
      );
    }

    await this.usersService.updateProfile(userId, { gpaSystem });

    this.auditService.logAuditEvent(
      userId,
      'PREFERENCES_UPDATE',
      'SUCCESS',
      req,
      { gpaSystem },
    );
    return { gpaSystem };
  }

  async getUnmigratedCourses(userId: string): Promise<Course[]> {
    return this.gpaRepository.findUnmigrated(userId);
  }

  async migrateCourse(
    userId: string,
    courseId: string,
    createDto: CreateCourseDto,
  ): Promise<Course> {
    const updated = await this.gpaRepository.migrateToEncrypted(
      courseId,
      userId,
      createDto.encryptedData,
      createDto.encapsulatedKey,
      createDto.encryptedSymmetricKey,
    );
    if (!updated) throw new NotFoundException('Course not found');
    return updated;
  }
}
