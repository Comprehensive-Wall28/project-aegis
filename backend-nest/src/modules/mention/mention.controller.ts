import {
    Controller,
    Get,
    Query,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { MentionService } from './mention.service';

@Controller('mentions')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class MentionController {
    constructor(private readonly mentionService: MentionService) { }

    /**
     * Get all entities (tasks/events/notes) that mention the target ID.
     * Matches GET /api/mentions/backlinks in Express
     */
    @Get('backlinks')
    async getBacklinks(
        @Request() req: any,
        @Query('targetId') targetId: string,
    ) {
        if (!targetId) {
            throw new BadRequestException('Missing targetId query parameter');
        }

        return this.mentionService.getBacklinks(req.user.userId, targetId);
    }

    /**
     * Search for users to mention.
     * Fills gap identified in PARITY_CHECKLIST.md
     */
    @Get('users/search')
    async searchUsers(@Query('q') query: string) {
        return this.mentionService.searchUsers(query);
    }
}
