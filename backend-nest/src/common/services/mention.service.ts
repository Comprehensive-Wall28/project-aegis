import { Injectable, Logger } from '@nestjs/common';

export interface Backlink {
    id: string;
    type: 'task' | 'event';
    title?: string; // Optional context
}

@Injectable()
export class MentionService {
    private readonly logger = new Logger(MentionService.name);

    // Implement actual logic when repositories are available
    // This will likely need to inject specific repositories or services
    // using 'forwardRef' if circular dependencies arise.

    async getBacklinks(userId: string, targetId: string): Promise<Backlink[]> {
        // Placeholder - will act as aggregator
        return [];
    }
}
