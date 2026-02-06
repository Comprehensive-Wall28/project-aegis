import { Controller, Get, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoomResponseDto } from './dto/room-response.dto';

@Controller('api/social/rooms')
export class SocialController {
    constructor(
        private readonly socialService: SocialService,
    ) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getRooms(
        @CurrentUser() user: any,
    ): Promise<RoomResponseDto[]> {
        return await this.socialService.getUserRooms(user.id);
    }
}
