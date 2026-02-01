import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GpaService } from './gpa.service';
import { GpaController } from './gpa.controller';
import { Course, CourseSchema } from './schemas/course.schema';
import { GpaRepository } from './gpa.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
    UsersModule,
  ],
  controllers: [GpaController],
  providers: [GpaService, GpaRepository],
  exports: [GpaService],
})
export class GpaModule {}
