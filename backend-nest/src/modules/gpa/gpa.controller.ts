import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Patch } from '@nestjs/common';
import { GpaService } from './gpa.service';
import { CreateCourseDto, UpdatePreferencesDto } from './dto/gpa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('gpa')
@UseGuards(JwtAuthGuard)
export class GpaController {
    constructor(private readonly gpaService: GpaService) { }

    @Get('courses')
    getCourses(@Request() req: any) {
        return this.gpaService.getCourses(req.user.userId);
    }

    @Post('courses')
    createCourse(@Request() req: any, @Body() createDto: CreateCourseDto) {
        return this.gpaService.createCourse(req.user.userId, createDto, req);
    }

    @Delete('courses/:id')
    deleteCourse(@Request() req: any, @Param('id') id: string) {
        return this.gpaService.deleteCourse(req.user.userId, id, req);
    }

    @Get('preferences')
    getPreferences(@Request() req: any) {
        return this.gpaService.getPreferences(req.user.userId);
    }

    @Patch('preferences')
    updatePreferences(@Request() req: any, @Body() body: UpdatePreferencesDto) {
        return this.gpaService.updatePreferences(req.user.userId, body.gpaSystem, req);
    }
}
