import { Controller, Get, Post, Query, Param, Body, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FolderResponseDto } from './dto/folder-response.dto';
import { CreateFolderRequestDto } from './dto/create-folder-request.dto';

@Controller('api/folders')
export class FoldersController {
    constructor(
        private readonly foldersService: FoldersService,
    ) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getFolders(
        @CurrentUser() user: any,
        @Query('parentId') parentId?: string | null,
    ): Promise<FolderResponseDto[]> {
        return await this.foldersService.getFolders(user.id, parentId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getFolder(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ): Promise<FolderResponseDto> {
        return await this.foldersService.getFolder(user.id, id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async createFolder(
        @CurrentUser() user: any,
        @Body(ValidationPipe) data: CreateFolderRequestDto,
    ): Promise<FolderResponseDto> {
        return await this.foldersService.createFolder(user.id, data);
    }
}
