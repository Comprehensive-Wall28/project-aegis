import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Course, CourseDocument } from './schemas/course.schema';

@Injectable()
export class GpaRepository extends BaseRepository<CourseDocument> {
    constructor(@InjectModel(Course.name) model: Model<CourseDocument>) {
        super(model);
    }

    async findUnmigrated(userId: string): Promise<CourseDocument[]> {
        return this.findMany({
            userId: new Types.ObjectId(userId),
            name: { $exists: true, $ne: null },
            encryptedData: { $exists: false }
        });
    }

    async findByIdAndUser(courseId: string, userId: string): Promise<CourseDocument | null> {
        return this.findOne({
            _id: courseId,
            userId: new Types.ObjectId(userId)
        });
    }

    async deleteByIdAndUser(courseId: string, userId: string): Promise<boolean> {
        return this.deleteOne({
            _id: courseId,
            userId: new Types.ObjectId(userId)
        });
    }

    async migrateToEncrypted(
        courseId: string,
        userId: string,
        encryptedData: string,
        encapsulatedKey: string,
        encryptedSymmetricKey: string
    ): Promise<CourseDocument | null> {
        return this.model.findOneAndUpdate(
            {
                _id: courseId,
                userId: new Types.ObjectId(userId)
            },
            {
                $set: {
                    encryptedData,
                    encapsulatedKey,
                    encryptedSymmetricKey
                },
                $unset: {
                    name: 1,
                    grade: 1,
                    credits: 1,
                    semester: 1
                }
            },
            { new: true }
        ).exec();
    }
}
