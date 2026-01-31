import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDTO, UpdateTaskDTO } from './dto/task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    async create(@Request() req: any, @Body() createDto: CreateTaskDTO) {
        return this.tasksService.create(req.user.userId, createDto);
    }

    @Get()
    async findAll(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('priority') priority?: string
    ) {
        return this.tasksService.findAll(req.user.userId, { status, priority });
    }

    @Get('upcoming')
    async getUpcoming(@Request() req: any, @Query('limit') limitArg?: string) {
        const limit = limitArg ? parseInt(limitArg, 10) : 10;
        return this.tasksService.findUpcoming(req.user.userId, limit);
    }

    @Get(':id')
    async findOne(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.findOne(id, req.user.userId);
    }

    @Put(':id')
    async update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateDto: UpdateTaskDTO
    ) {
        return this.tasksService.update(id, req.user.userId, updateDto);
    }

    @Delete(':id')
    async remove(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.remove(id, req.user.userId);
    }

    @Post('reorder')
    async reorder(
        @Request() req: any,
        @Body() body: { updates: { id: string; order: number; status?: string }[] }
    ) {
        return this.tasksService.reorder(req.user.userId, body.updates);
    }
}
