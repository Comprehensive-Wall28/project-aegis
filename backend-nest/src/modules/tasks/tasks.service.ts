import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDTO, UpdateTaskDTO } from './dto/task.dto';
import { BaseService } from '../../common/services/base.service';
import { TaskRepository } from './repositories/task.repository';

@Injectable()
export class TasksService extends BaseService<TaskDocument, TaskRepository> {
    protected readonly logger = new Logger(TasksService.name);

    constructor(private readonly taskRepository: TaskRepository) {
        super(taskRepository);
    }


    async findOne(id: string, userId: string): Promise<Task> {
        const task = await this.taskRepository.findOne({ _id: id, userId });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        return task;
    }

    async update(id: string, userId: string, updateDto: UpdateTaskDTO): Promise<Task> {
        const updatedTask = await this.taskRepository.updateOne(
            { _id: id, userId },
            updateDto as any,
            { returnNew: true }
        );

        if (!updatedTask) {
            throw new NotFoundException('Task not found');
        }
        return updatedTask;
    }

    async remove(id: string, userId: string): Promise<void> {
        const result = await this.taskRepository.deleteOne({ _id: id, userId });
        if (!result) {
            throw new NotFoundException('Task not found');
        }
    }

    async create(userId: string, createDto: CreateTaskDTO): Promise<Task> {
        const { status = 'todo', priority = 'medium' } = createDto;

        // Auto-calculate order: get max order for this status
        const lastOrder = await this.taskRepository.getMaxOrderInColumn(userId, status);

        const order = lastOrder + 1;

        return this.taskRepository.create({
            ...createDto,
            userId: new Types.ObjectId(userId),
            dueDate: createDto.dueDate ? new Date(createDto.dueDate) : undefined,
            order,
            status, // Ensure defaults are applied if not in DTO (though DTO has optional)
            priority
        });
    }

    async findAll(
        userId: string,
        filter?: { status?: string; priority?: string }
    ): Promise<Task[]> {
        return this.taskRepository.findByUserId(userId, filter);
    }

    async reorder(userId: string, updates: { id: string; order: number; status?: string }[]): Promise<void> {
        return this.taskRepository.reorderBulk(userId, updates);
    }

    async findUpcoming(userId: string, limit: number = 10): Promise<Task[]> {
        return this.taskRepository.findUpcoming(userId, limit);
    }
}
