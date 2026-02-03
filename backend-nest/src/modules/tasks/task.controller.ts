import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    HttpCode
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderTaskDto } from './dto/reorder-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
    constructor(private readonly taskService: TaskService) { }

    @Get()
    async getTasks(
        @CurrentUser() user: any,
        @Query() filters: TaskFilterDto
    ) {
        if (filters.limit !== undefined || filters.cursor !== undefined) {
            return this.taskService.getPaginatedTasks(user.id, {
                limit: filters.limit || 50,
                cursor: filters.cursor
            });
        }

        return this.taskService.getTasks(user.id, filters);
    }

    @Get('upcoming')
    async getUpcomingTasks(
        @CurrentUser() user: any,
        @Query('limit') limit?: number
    ) {
        return this.taskService.getUpcomingTasks(user.id, limit || 10);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createTask(
        @CurrentUser() user: any,
        @Body() createTaskDto: CreateTaskDto
    ) {
        return this.taskService.createTask(user.id, createTaskDto);
    }

    @Put('reorder')
    async reorderTasks(
        @CurrentUser() user: any,
        @Body() reorderDto: ReorderTaskDto
    ) {
        await this.taskService.reorderTasks(user.id, reorderDto.updates);
        return { message: 'Tasks reordered successfully' };
    }

    @Put(':id')
    async updateTask(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() updateTaskDto: UpdateTaskDto
    ) {
        return this.taskService.updateTask(user.id, id, updateTaskDto);
    }

    @Delete(':id')
    async deleteTask(
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        await this.taskService.deleteTask(user.id, id);
        return { message: 'Task deleted successfully' };
    }
}
