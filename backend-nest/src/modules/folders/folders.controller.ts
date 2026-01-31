import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/schemas/user.schema';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
    constructor(private readonly foldersService: FoldersService) { }

    @Get()
    getFolders(@Request() req: any, @Query('parentId') parentId?: string) {
        return this.foldersService.getFolders(req.user._id.toString(), parentId);
    }

    @Get(':id')
    getFolder(@Request() req: any, @Param('id') id: string) {
        return this.foldersService.getFolder(req.user._id.toString(), id);
    }

    @Post()
    create(@Request() req: any, @Body() createFolderDto: CreateFolderDto) {
        return this.foldersService.createFolder(req.user._id.toString(), createFolderDto);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateFolderDto: UpdateFolderDto) {
        return this.foldersService.updateFolder(req.user._id.toString(), id, updateFolderDto);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.foldersService.deleteFolder(req.user._id.toString(), id);
    }
}
