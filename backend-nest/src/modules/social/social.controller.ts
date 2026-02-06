import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
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
import { CollectionResponseDto } from './dto/collection-response.dto';

@Controller('api/social')
export class SocialController {
    constructor(
        private readonly socialService: SocialService,
    ) { }

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
}

@Controller('api/social/rooms')
export class SocialRoomsController {
    constructor(
        private readonly socialService: SocialService,
    ) { }

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
            inviteCode: room.inviteCode
        };
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getRooms(
        @CurrentUser() user: any,
    ): Promise<RoomResponseDto[]> {
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
    async leaveRoom(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
    ) {
        return await this.socialService.leaveRoom(user.id, roomId);
    }

    @Delete(':roomId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async deleteRoom(
        @CurrentUser() user: any,
        @Param('roomId') roomId: string,
    ) {
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
        return await this.socialService.createCollection(user.id, roomId, createCollectionDto);
    }
}
