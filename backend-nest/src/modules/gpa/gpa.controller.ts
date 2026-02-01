import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { GpaService } from './gpa.service';
import { CreateCourseDto, UpdatePreferencesDto } from './dto/gpa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('gpa')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class GpaController {
  constructor(private readonly gpaService: GpaService) {}

  @Get('courses')
  getCourses(@Request() req: any) {
    return this.gpaService.getCourses(req.user.userId);
  }

  @Get('courses/unmigrated')
  getUnmigratedCourses(@Request() req: any) {
    return this.gpaService.getUnmigratedCourses(req.user.userId);
  }

  @Post('courses')
  createCourse(@Request() req: any, @Body() createDto: CreateCourseDto) {
    return this.gpaService.createCourse(req.user.userId, createDto, req);
  }

  @Delete('courses/:id')
  deleteCourse(@Request() req: any, @Param('id') id: string) {
    return this.gpaService.deleteCourse(req.user.userId, id, req);
  }

  @Put('courses/:id/migrate')
  migrateCourse(
    @Request() req: any,
    @Param('id') id: string,
    @Body() createDto: CreateCourseDto,
  ) {
    return this.gpaService.migrateCourse(req.user.userId, id, createDto);
  }

  @Get('preferences')
  getPreferences(@Request() req: any) {
    return this.gpaService.getPreferences(req.user.userId);
  }

  @Put('preferences')
  updatePreferences(@Request() req: any, @Body() body: UpdatePreferencesDto) {
    return this.gpaService.updatePreferences(
      req.user.userId,
      body.gpaSystem,
      req,
    );
  }
}
