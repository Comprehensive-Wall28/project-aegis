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
import { FolderService } from './folder.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { MoveFilesDto } from './dto/move-files.dto';
import { GetFoldersQueryDto } from './dto/get-folders-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FolderController {
    constructor(private readonly folderService: FolderService) { }

    @Get()
    async getFolders(
        @CurrentUser() user: any,
        @Query() query: GetFoldersQueryDto
    ) {
        // Normalize parentId from query
        let parentId: string | null = null;
        const rawParentId = query.parentId;

        if (rawParentId && rawParentId !== 'null' && typeof rawParentId === 'string') {
            parentId = rawParentId;
        }

        return this.folderService.getFolders(user.id, parentId);
    }

    @Get(':id')
    async getFolder(
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        return this.folderService.getFolder(user.id, id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createFolder(
        @CurrentUser() user: any,
        @Body() createFolderDto: CreateFolderDto
    ) {
        return this.folderService.createFolder(user.id, createFolderDto);
    }

    @Put(':id')
    async updateFolder(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() updateFolderDto: UpdateFolderDto
    ) {
        return this.folderService.updateFolder(user.id, id, updateFolderDto);
    }

    @Delete(':id')
    async deleteFolder(
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        await this.folderService.deleteFolder(user.id, id);
        return { message: 'Folder deleted successfully' };
    }

    @Put('move-files')
    async moveFiles(
        @CurrentUser() user: any,
        @Body() moveFilesDto: MoveFilesDto
    ) {
        const modifiedCount = await this.folderService.moveFiles(
            user.id,
            moveFilesDto.updates,
            moveFilesDto.folderId || null
        );

        return {
            message: `Moved ${modifiedCount} file(s)`,
            modifiedCount
        };
    }
}
