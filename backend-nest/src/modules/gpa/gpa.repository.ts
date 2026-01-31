import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Course, CourseDocument } from './schemas/course.schema';

@Injectable()
export class GpaRepository extends BaseRepository<CourseDocument> {
    constructor(@InjectModel(Course.name) model: Model<CourseDocument>) {
        super(model);
    }
}
