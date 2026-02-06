import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoomResponseDto } from './dto/room-response.dto';
import { CreateRoomRequestDto } from './dto/create-room-request.dto';

@Controller('api/social/rooms')
export class SocialController {
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
}
