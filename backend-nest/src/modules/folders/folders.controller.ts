import { Controller, Get, Post, Put, Body, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto, UpdateFolderDto, MoveFilesDto } from './dto/folder.dto';
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

    @Put('move-files')
    async moveFiles(@Request() req: any, @Body() moveFilesDto: MoveFilesDto) {
        const modifiedCount = await this.foldersService.moveFiles(req.user._id.toString(), moveFilesDto);
        return {
            message: `Moved ${modifiedCount} file(s)`,
            modifiedCount
        };
    }

    @Get(':id')
    getFolder(@Request() req: any, @Param('id') id: string) {
        return this.foldersService.getFolder(req.user._id.toString(), id);
    }

    @Post()
    create(@Request() req: any, @Body() createFolderDto: CreateFolderDto) {
        return this.foldersService.createFolder(req.user._id.toString(), createFolderDto, req);
    }

    @Put(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateFolderDto: UpdateFolderDto) {
        return this.foldersService.updateFolder(req.user._id.toString(), id, updateFolderDto, req);
    }

    @Delete(':id')
    async remove(@Request() req: any, @Param('id') id: string) {
        await this.foldersService.deleteFolder(req.user._id.toString(), id, req);
        return { message: 'Folder deleted successfully' };
    }
}
