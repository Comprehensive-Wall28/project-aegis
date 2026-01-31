import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Task, TaskDocument } from '../schemas/task.schema';

@Injectable()
export class TaskRepository extends BaseRepository<TaskDocument> {
    constructor(@InjectModel(Task.name) model: Model<TaskDocument>) {
        super(model);
    }

    async findByUserId(userId: string, filter?: any): Promise<TaskDocument[]> {
        return this.findMany({ userId, ...filter }, { sort: { status: 1, order: 1 } });
    }

    async getMaxOrderInColumn(userId: string, status: string): Promise<number> {
        const task = await this.findOne({ userId, status }, { sort: { order: -1 } });
        return task ? task.order : 0;
    }

    async reorderBulk(userId: string, updates: { id: string; order: number; status?: string }[]): Promise<void> {
        const session = await this.model.db.startSession();
        session.startTransaction();
        try {
            for (const { id, order, status } of updates) {
                const updateData: any = { order };
                if (status) updateData.status = status;

                await this.updateOne({ _id: id, userId }, { $set: updateData }, { session } as any);
            }
            await session.commitTransaction();
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    async findUpcoming(userId: string, limit: number): Promise<TaskDocument[]> {
        return this.findMany({
            userId,
            status: { $ne: 'done' },
            dueDate: { $exists: true, $ne: null }
        }, {
            sort: { dueDate: 1 },
            limit
        });
    }
}
