import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDTO, UpdateTaskDTO } from './dto/task.dto';
import { BaseService } from '../../common/services/base.service';
import { TaskRepository } from './repositories/task.repository';
import { AuditService } from '../../common/services/audit.service';
import { Request } from 'express';

@Injectable()
export class TasksService extends BaseService<TaskDocument, TaskRepository> {
    protected readonly logger = new Logger(TasksService.name);

    constructor(
        private readonly taskRepository: TaskRepository,
        private readonly auditService: AuditService,
    ) {
        super(taskRepository);
    }


    async findOne(id: string, userId: string): Promise<Task> {
        const task = await this.taskRepository.findOne({ _id: id, userId });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        return task;
    }

    async update(id: string, userId: string, updateDto: UpdateTaskDTO, req?: Request): Promise<Task> {
        const updatedTask = await this.taskRepository.updateOne(
            { _id: id, userId },
            updateDto as any,
            { returnNew: true }
        );

        if (!updatedTask) {
            throw new NotFoundException('Task not found');
        }

        await this.auditService.logAuditEvent(
            userId,
            'TASK_UPDATE',
            'SUCCESS',
            req,
            { taskId: id }
        );

        return updatedTask;
    }

    async remove(id: string, userId: string, req?: Request): Promise<void> {
        const result = await this.taskRepository.deleteOne({ _id: id, userId });
        if (!result) {
            throw new NotFoundException('Task not found');
        }

        await this.auditService.logAuditEvent(
            userId,
            'TASK_DELETE',
            'SUCCESS',
            req,
            { taskId: id }
        );
    }

    async create(userId: string, createDto: CreateTaskDTO, req?: Request): Promise<Task> {
        const { status = 'todo', priority = 'medium' } = createDto;

        // Auto-calculate order: get max order for this status
        const lastOrder = await this.taskRepository.getMaxOrderInColumn(userId, status);

        const order = lastOrder + 1;

        const task = await this.taskRepository.create({
            ...createDto,
            userId: new Types.ObjectId(userId),
            dueDate: createDto.dueDate ? new Date(createDto.dueDate) : undefined,
            order,
            status, // Ensure defaults are applied if not in DTO (though DTO has optional)
            priority
        });

        await this.auditService.logAuditEvent(
            userId,
            'TASK_CREATE',
            'SUCCESS',
            req,
            { taskId: task._id }
        );

        return task;
    }

    async findAll(
        userId: string,
        filter?: { status?: string; priority?: string }
    ): Promise<Task[]> {
        return this.taskRepository.findByUserId(userId, filter);
    }

    async reorder(
        userId: string,
        updates: { id: string; order: number; status?: string }[],
        req?: Request
    ): Promise<void> {
        await this.taskRepository.reorderBulk(userId, updates);

        await this.auditService.logAuditEvent(
            userId,
            'TASK_REORDER',
            'SUCCESS',
            req,
            { count: updates.length }
        );
    }

    async findPaginated(
        userId: string,
        options: { limit: number; cursor?: string }
    ): Promise<{ items: Task[]; nextCursor: string | null }> {
        return this.taskRepository.findPaginated(
            { userId },
            {
                limit: options.limit,
                cursor: options.cursor,
                sortField: '_id',
                sortOrder: -1 // Most recent first (descending)
            }
        );
    }

    async findUpcoming(userId: string, limit: number = 10): Promise<Task[]> {
        return this.taskRepository.findUpcoming(userId, limit);
    }

    async getUpcomingTasks(userId: string, limit: number = 10): Promise<Task[]> {
        return this.findUpcoming(userId, limit);
    }
}
