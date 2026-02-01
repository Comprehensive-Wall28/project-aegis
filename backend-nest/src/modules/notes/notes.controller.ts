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
  Request,
  Response,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { NotesService } from './notes.service';
import { NoteFolderService } from './note-folders.service';
import {
  CreateNoteDTO,
  CreateFolderDTO,
  UpdateNoteContentDTO,
  UpdateNoteMetadataDTO,
} from './dto/note.dto';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly foldersService: NoteFolderService,
  ) {}

  // --- Folder Routes ---

  @Post('folders')
  async createFolder(@Request() req: any, @Body() createDto: CreateFolderDTO) {
    return this.foldersService.create(req.user.userId, createDto, req);
  }

  @Get('folders')
  async getFolders(@Request() req: any) {
    return this.foldersService.findAll(req.user.userId);
  }

  @Put('folders/:id')
  async updateFolder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    return this.foldersService.update(id, req.user.userId, updateDto, req);
  }

  @Delete('folders/:id')
  async deleteFolder(@Request() req: any, @Param('id') id: string) {
    return this.foldersService.remove(id, req.user.userId, req);
  }

  // --- Note Routes ---

  @Post()
  async createNote(@Request() req: any, @Body() createDto: CreateNoteDTO) {
    return this.notesService.create(req.user.userId, createDto, req);
  }

  @Get('tags')
  async getUserTags(@Request() req: any) {
    return this.notesService.getUserTags(req.user.userId);
  }

  @Get('backlinks/:entityId')
  async getBacklinks(@Request() req: any, @Param('entityId') entityId: string) {
    return this.notesService.getBacklinks(entityId, req.user.userId);
  }

  @Get()
  async getNotes(@Request() req: any) {
    return this.notesService.findAll(req.user.userId);
  }

  @Get(':id')
  async getNote(@Request() req: any, @Param('id') id: string) {
    return this.notesService.findOne(id, req.user.userId);
  }

  @Get(':id/content')
  async getNoteContent(
    @Request() req: any,
    @Param('id') id: string,
    @Response() res: FastifyReply,
  ) {
    const { buffer } = await this.notesService.getContent(id, req.user.userId);
    res.header('Content-Type', 'application/octet-stream');
    res.send(buffer);
  }

  @Get(':id/content/stream')
  async getNoteContentStream(
    @Request() req: any,
    @Param('id') id: string,
    @Response() res: FastifyReply,
  ) {
    const { stream } = await this.notesService.getContentStream(
      id,
      req.user.userId,
    );
    res.header('Content-Type', 'application/octet-stream');
    res.send(stream);
  }

  @Put(':id/metadata')
  async updateNoteMetadata(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateNoteMetadataDTO,
  ) {
    return this.notesService.updateMetadata(
      id,
      req.user.userId,
      updateDto,
      req,
    );
  }

  @Put(':id/content')
  async updateNoteContent(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateNoteContentDTO,
  ) {
    return this.notesService.updateContent(id, req.user.userId, updateDto, req);
  }

  @Delete(':id')
  async deleteNote(@Request() req: any, @Param('id') id: string) {
    return this.notesService.remove(id, req.user.userId, req);
  }
}
