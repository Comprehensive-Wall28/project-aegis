import { Controller, Get, Post, Patch, Body, Param, Delete, UseGuards, Req, Query, Res } from '@nestjs/common';
import { SocialService } from './social.service';
import { LinkService } from './link.service';
import { CommentService } from './comment.service';
import { ImageProxyService } from './image-proxy.service';
import { CreateRoomDto, JoinRoomDto, RoomResponseDto } from './dto/room.dto';
import { CreateCollectionDto, UpdateCollectionDto, ReorderCollectionsDto } from './dto/collection.dto';
import { PostLinkDto, MoveLinkDto, CursorQueryDto, SearchQueryDto, ProxyImageQueryDto } from './dto/link.dto';
import { CreateCommentDto } from './dto/comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FastifyRequest, FastifyReply } from 'fastify';

@Controller('social')
export class SocialController {
    constructor(
        private readonly socialService: SocialService,
        private readonly linkService: LinkService,
        private readonly commentService: CommentService,
        private readonly imageProxyService: ImageProxyService,
    ) { }

    @Get('rooms')
    @UseGuards(JwtAuthGuard)
    async getUserRooms(@CurrentUser() user: any): Promise<RoomResponseDto[]> {
        return this.socialService.getUserRooms(user.id);
    }

    @Post('rooms')
    @UseGuards(JwtAuthGuard)
    async createRoom(
        @CurrentUser() user: any,
        @Body() createRoomDto: CreateRoomDto,
        @Req() req: FastifyRequest,
    ) {
        return this.socialService.createRoom(
            user.id,
            createRoomDto,
            req
        );
    }

    @Post('rooms/:roomId/invite')
    @UseGuards(JwtAuthGuard)
    async createInvite(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
        @Req() req: FastifyRequest,
    ) {
        const inviteCode = await this.socialService.createInvite(
            user.id,
            roomId,
            req
        );
        return { inviteCode };
    }

    @Get('invite/:inviteCode')
    async getInviteInfo(@Param('inviteCode') inviteCode: string) {
        return this.socialService.getInviteInfo(inviteCode);
    }

    @Post('rooms/join')
    @UseGuards(JwtAuthGuard)
    async joinRoom(
        @CurrentUser() user: any,
        @Body() joinRoomDto: JoinRoomDto,
        @Req() req: FastifyRequest,
    ) {
        const roomId = await this.socialService.joinRoom(
            user.id,
            joinRoomDto.inviteCode,
            joinRoomDto.encryptedRoomKey,
            req
        );
        return { message: 'Successfully joined room', roomId };
    }

    @Post('rooms/:roomId/leave')
    @UseGuards(JwtAuthGuard)
    async leaveRoom(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
        @Req() req: FastifyRequest,
    ) {
        await this.socialService.leaveRoom(
            user.id,
            roomId,
            req
        );
        return { message: 'Successfully left room' };
    }

    @Delete('rooms/:roomId')
    @UseGuards(JwtAuthGuard)
    async deleteRoom(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
        @Req() req: FastifyRequest,
    ) {
        await this.socialService.deleteRoom(
            user.id,
            roomId,
            req
        );
        return { message: 'Successfully deleted room' };
    }

    @Get('rooms/:roomId')
    @UseGuards(JwtAuthGuard)
    async getRoomContent(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
        @Query('collectionId') collectionId?: string,
    ) {
        return this.socialService.getRoomContent(user.id, roomId, collectionId);
    }

    // ===== Link Management Endpoints =====

    @Post('rooms/:roomId/links')
    @UseGuards(JwtAuthGuard)
    async postLink(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
        @Body() postLinkDto: PostLinkDto,
        @Req() req: FastifyRequest,
    ) {
        return this.linkService.postLink(user.id, roomId, postLinkDto, req);
    }

    @Patch('links/:linkId/move')
    @UseGuards(JwtAuthGuard)
    async moveLink(
        @CurrentUser() user: any,
        @Param('linkId') linkId: string,
        @Body() moveLinkDto: MoveLinkDto,
        @Req() req: FastifyRequest,
    ) {
        return this.linkService.moveLink(user.id, linkId, moveLinkDto.collectionId, req);
    }

    @Delete('links/:linkId')
    @UseGuards(JwtAuthGuard)
    async deleteLink(
        @CurrentUser() user: any,
        @Param('linkId') linkId: string,
        @Req() req: FastifyRequest,
    ) {
        await this.linkService.deleteLink(user.id, linkId, req);
        return { message: 'Link deleted successfully' };
    }

    @Post('links/:linkId/view')
    @UseGuards(JwtAuthGuard)
    async markLinkViewed(
        @CurrentUser() user: any,
        @Param('linkId') linkId: string,
    ) {
        return this.linkService.markLinkViewed(user.id, linkId);
    }

    @Delete('links/:linkId/view')
    @UseGuards(JwtAuthGuard)
    async unmarkLinkViewed(
        @CurrentUser() user: any,
        @Param('linkId') linkId: string,
    ) {
        return this.linkService.unmarkLinkViewed(user.id, linkId);
    }

    @Get('rooms/:roomId/collections/:collectionId/links')
    @UseGuards(JwtAuthGuard)
    async getCollectionLinks(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
        @Param('collectionId') collectionId: string,
        @Query() query: CursorQueryDto,
    ) {
        const limit = query.limit ? parseInt(query.limit, 10) : 30;
        const cursor =
            query.cursorCreatedAt && query.cursorId
                ? { createdAt: query.cursorCreatedAt, id: query.cursorId }
                : undefined;

        return this.linkService.getCollectionLinks(
            user.id,
            roomId,
            collectionId,
            limit,
            cursor,
        );
    }

    @Get('rooms/:roomId/search')
    @UseGuards(JwtAuthGuard)
    async searchRoomLinks(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
        @Query() query: SearchQueryDto,
    ) {
        const limit = query.limit ? parseInt(query.limit, 10) : 50;
        return this.linkService.searchRoomLinks(user.id, roomId, query.q, limit);
    }

    // ===== Collection Management Endpoints =====

    @Post('rooms/:roomId/collections')
    @UseGuards(JwtAuthGuard)
    async createCollection(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
        @Body() createCollectionDto: CreateCollectionDto,
        @Req() req: FastifyRequest,
    ) {
        return this.socialService.createCollection(user.id, roomId, createCollectionDto, req);
    }

    @Delete('collections/:collectionId')
    @UseGuards(JwtAuthGuard)
    async deleteCollection(
        @CurrentUser() user: any,
        @Param('collectionId') collectionId: string,
        @Req() req: FastifyRequest,
    ) {
        await this.socialService.deleteCollection(user.id, collectionId, req);
        return { message: 'Collection deleted successfully' };
    }

    @Patch('collections/:collectionId')
    @UseGuards(JwtAuthGuard)
    async updateCollection(
        @CurrentUser() user: any,
        @Param('collectionId') collectionId: string,
        @Body() updateCollectionDto: UpdateCollectionDto,
        @Req() req: FastifyRequest,
    ) {
        return this.socialService.updateCollection(user.id, collectionId, updateCollectionDto.name, req);
    }

    @Patch('rooms/:roomId/collections/reorder')
    @UseGuards(JwtAuthGuard)
    async reorderCollections(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
        @Body() reorderDto: ReorderCollectionsDto,
        @Req() req: FastifyRequest,
    ) {
        await this.socialService.reorderCollections(user.id, roomId, reorderDto.collectionIds, req);
        return { message: 'Collections reordered successfully' };
    }

    // ===== Comment Management Endpoints =====

    @Get('links/:linkId/comments')
    @UseGuards(JwtAuthGuard)
    async getComments(
        @CurrentUser() user: any,
        @Param('linkId') linkId: string,
        @Query() query: CursorQueryDto,
    ) {
        const limit = query.limit ? parseInt(query.limit, 10) : 20;
        return this.commentService.getComments(
            user.id,
            linkId,
            limit,
            query.cursorCreatedAt,
            query.cursorId
        );
    }

    @Post('links/:linkId/comments')
    @UseGuards(JwtAuthGuard)
    async postComment(
        @CurrentUser() user: any,
        @Param('linkId') linkId: string,
        @Body() createCommentDto: CreateCommentDto,
        @Req() req: FastifyRequest,
    ) {
        return this.commentService.postComment(user.id, linkId, createCommentDto, req);
    }

    @Delete('comments/:commentId')
    @UseGuards(JwtAuthGuard)
    async deleteComment(
        @CurrentUser() user: any,
        @Param('commentId') commentId: string,
        @Req() req: FastifyRequest,
    ) {
        await this.commentService.deleteComment(user.id, commentId, req);
        return { message: 'Comment deleted successfully' };
    }

    @Get('proxy-image')
    async proxyImage(@Query() query: ProxyImageQueryDto, @Res() reply: FastifyReply) {
        const { stream, contentType } = await this.imageProxyService.proxyImage(query.url);
        reply.header('Content-Type', contentType);
        reply.header('Cache-Control', 'public, max-age=86400'); // 1 day
        reply.send(stream);
    }
}
