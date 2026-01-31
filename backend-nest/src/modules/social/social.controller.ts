import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Query, Res } from '@nestjs/common';
import { SocialService } from './social.service';
import { LinkService } from './link.service';
import { ImageProxyService } from './image-proxy.service';
import { CreateRoomDto, JoinRoomDto, RoomResponseDto } from './dto/room.dto';
import { PostLinkDto, CursorQueryDto, SearchQueryDto, ProxyImageQueryDto } from './dto/link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FastifyRequest, FastifyReply } from 'fastify';

@Controller('social')
export class SocialController {
    constructor(
        private readonly socialService: SocialService,
        private readonly linkService: LinkService,
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

    @Get('proxy-image')
    async proxyImage(@Query() query: ProxyImageQueryDto, @Res() reply: FastifyReply) {
        const { stream, contentType } = await this.imageProxyService.proxyImage(query.url);
        reply.header('Content-Type', contentType);
        reply.header('Cache-Control', 'public, max-age=86400'); // 1 day
        reply.send(stream);
    }
}
