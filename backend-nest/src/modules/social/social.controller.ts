import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoomResponseDto } from './dto/room-response.dto';
import { CreateRoomRequestDto } from './dto/create-room-request.dto';
import { InviteCodeResponseDto } from './dto/invite-code-response.dto';
import { InviteInfoResponseDto } from './dto/invite-info-response.dto';
import { JoinRoomRequestDto } from './dto/join-room-request.dto';
import { CreateCollectionRequestDto } from './dto/create-collection-request.dto';
import { UpdateCollectionRequestDto } from './dto/update-collection-request.dto';
import { ReorderCollectionsRequestDto } from './dto/reorder-collections-request.dto';
import { CollectionResponseDto } from './dto/collection-response.dto';
import { GetCollectionLinksQueryDto } from './dto/get-collection-links-query.dto';
import { GetCollectionLinksResponseDto } from './dto/get-collection-links-response.dto';
import { PostLinkRequestDto } from './dto/post-link-request.dto';
import { RoomContentResponseDto } from './dto/room-content-response.dto';
import { GetRoomContentQueryDto } from './dto/get-room-content-query.dto';
import { SearchRoomLinksQueryDto } from './dto/search-room-links-query.dto';
import { SearchRoomLinksResponseDto } from './dto/search-room-links-response.dto';
import { MoveLinkRequestDto } from './dto/move-link-request.dto';
import { ReaderContentResponseDto } from './dto/reader-content-response.dto';
import { CreateAnnotationRequestDto } from './dto/create-annotation-request.dto';

@Controller('api/social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('invite/:inviteCode')
  @Public()
  async getInviteInfo(
    @Param('inviteCode') inviteCode: string,
  ): Promise<InviteInfoResponseDto> {
    return await this.socialService.getInviteInfo(inviteCode);
  }

  @Delete('collections/:collectionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteCollection(
    @CurrentUser() user: any,
    @Param('collectionId') collectionId: string,
  ) {
    return await this.socialService.deleteCollection(user.id, collectionId);
  }

  @Patch('collections/:collectionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateCollection(
    @CurrentUser() user: any,
    @Param('collectionId') collectionId: string,
    @Body() updateDto: UpdateCollectionRequestDto,
  ): Promise<CollectionResponseDto> {
    return await this.socialService.updateCollection(
      user.id,
      collectionId,
      updateDto,
    );
  }

  @Delete('links/:linkId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteLink(
    @CurrentUser() user: any,
    @Param('linkId') linkId: string,
    @Ip() ip: string,
  ) {
    return await this.socialService.deleteLink(user.id, linkId, ip);
  }

  @Patch('links/:linkId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async moveLink(
    @CurrentUser() user: any,
    @Param('linkId') linkId: string,
    @Body() moveLinkDto: MoveLinkRequestDto,
    @Ip() ip: string,
  ) {
    const linkPost = await this.socialService.moveLink(
      user.id,
      linkId,
      moveLinkDto.collectionId,
      ip,
    );
    return { message: 'Link moved successfully', linkPost };
  }
}

@Controller('api/social/rooms')
export class SocialRoomsController {
  constructor(private readonly socialService: SocialService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRoom(
    @CurrentUser() user: any,
    @Body() createRoomDto: CreateRoomRequestDto,
  ) {
    const room = await this.socialService.createRoom(user.id, createRoomDto);
    return {
      _id: room._id.toString(),
      name: room.name,
      description: room.description,
      icon: room.icon,
      members: room.members,
      inviteCode: room.inviteCode,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getRooms(@CurrentUser() user: any): Promise<RoomResponseDto[]> {
    return await this.socialService.getUserRooms(user.id);
  }

  @Post(':roomId/invite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createInvite(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
  ): Promise<InviteCodeResponseDto> {
    return await this.socialService.createInvite(user.id, roomId);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async joinRoom(
    @CurrentUser() user: any,
    @Body() joinRoomDto: JoinRoomRequestDto,
  ) {
    return await this.socialService.joinRoom(user.id, joinRoomDto);
  }

  @Post(':roomId/leave')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async leaveRoom(@CurrentUser() user: any, @Param('roomId') roomId: string) {
    return await this.socialService.leaveRoom(user.id, roomId);
  }

  @Delete(':roomId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteRoom(@CurrentUser() user: any, @Param('roomId') roomId: string) {
    return await this.socialService.deleteRoom(user.id, roomId);
  }

  @Post(':roomId/collections')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createCollection(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Body() createCollectionDto: CreateCollectionRequestDto,
  ): Promise<CollectionResponseDto> {
    return await this.socialService.createCollection(
      user.id,
      roomId,
      createCollectionDto,
    );
  }

  @Patch(':roomId/collections/order')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reorderCollections(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Body() reorderDto: ReorderCollectionsRequestDto,
  ) {
    return await this.socialService.reorderCollections(
      user.id,
      roomId,
      reorderDto,
    );
  }

  @Post(':roomId/links')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async postLink(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Body() postLinkDto: PostLinkRequestDto,
  ) {
    return await this.socialService.postLink(user.id, roomId, postLinkDto);
  }

  @Get(':roomId/collections/:collectionId/links')
  @UseGuards(JwtAuthGuard)
  async getCollectionLinks(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Param('collectionId') collectionId: string,
    @Query() query: GetCollectionLinksQueryDto,
  ): Promise<GetCollectionLinksResponseDto> {
    const beforeCursor =
      query.cursorCreatedAt && query.cursorId
        ? { createdAt: query.cursorCreatedAt, id: query.cursorId }
        : undefined;
    return await this.socialService.getCollectionLinks(
      user.id,
      roomId,
      collectionId,
      query.limit || 12,
      beforeCursor,
    );
  }

  @Get(':roomId/search')
  @UseGuards(JwtAuthGuard)
  async searchRoomLinks(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Query() query: SearchRoomLinksQueryDto,
  ): Promise<SearchRoomLinksResponseDto> {
    return await this.socialService.searchRoomLinks(user.id, roomId, query);
  }

  @Get(':roomId')
  @UseGuards(JwtAuthGuard)
  async getRoomContent(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Query() query: GetRoomContentQueryDto,
  ): Promise<RoomContentResponseDto> {
    return await this.socialService.getRoomContent(
      user.id,
      roomId,
      query.collectionId,
    );
  }

  // Reader Mode Endpoints

  @Get('links/:linkId/reader')
  @UseGuards(JwtAuthGuard)
  async getReaderContent(
    @CurrentUser() user: any,
    @Param('linkId') linkId: string,
  ): Promise<ReaderContentResponseDto> {
    return await this.socialService.getReaderContent(user.id, linkId);
  }

  @Get('links/:linkId/annotations')
  @UseGuards(JwtAuthGuard)
  async getAnnotations(
    @CurrentUser() user: any,
    @Param('linkId') linkId: string,
  ): Promise<any[]> {
    return await this.socialService.getAnnotations(user.id, linkId);
  }

  @Post('links/:linkId/annotations')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAnnotation(
    @CurrentUser() user: any,
    @Param('linkId') linkId: string,
    @Body() createAnnotationDto: CreateAnnotationRequestDto,
    @Ip() ip: string,
  ): Promise<any> {
    return await this.socialService.createAnnotation(
      user.id,
      linkId,
      createAnnotationDto.paragraphId,
      createAnnotationDto.highlightText,
      createAnnotationDto.encryptedContent,
      ip,
    );
  }

  @Delete('annotations/:annotationId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAnnotation(
    @CurrentUser() user: any,
    @Param('annotationId') annotationId: string,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    await this.socialService.deleteAnnotation(user.id, annotationId, ip);
    return { message: 'Annotation deleted successfully' };
  }
}
