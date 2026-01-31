import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { SocialService } from './social.service';
import { CreateRoomDto, JoinRoomDto, RoomResponseDto } from './dto/room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FastifyRequest } from 'fastify';

@Controller('social')
export class SocialController {
    constructor(private readonly socialService: SocialService) { }

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
}
