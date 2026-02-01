import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { InviteDto, CreateLinkDto } from './dto/share.dto';

@Controller('share')
@UseGuards(JwtAuthGuard)
@UseGuards(CsrfGuard)
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post('invite-file')
  async inviteFile(
    @CurrentUser() user: { id: string },
    @Body() inviteDto: InviteDto,
    @Req() req: FastifyRequest,
  ) {
    // Legacy returned 201
    return this.shareService.inviteToFile(user.id, inviteDto, req);
  }

  @Get('shared-file/:fileId')
  async getSharedFileKey(
    @CurrentUser() user: { id: string },
    @Param('fileId') fileId: string,
  ) {
    return this.shareService.getSharedFileKey(user.id, fileId);
  }

  @Post('link')
  async createLink(
    @CurrentUser() user: { id: string },
    @Body() createLinkDto: CreateLinkDto,
    @Req() req: FastifyRequest,
  ) {
    // Legacy returned 201
    return this.shareService.createLink(user.id, createLinkDto, req);
  }

  @Get('my-links')
  async getMyLinks(
    @CurrentUser() user: { id: string },
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    return this.shareService.getMyLinks(user.id, pageNum, limitNum);
  }

  @Delete('link/:id')
  async revokeLink(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    await this.shareService.revokeLink(user.id, id, req);
    return { message: 'Link revoked successfully' };
  }
}
