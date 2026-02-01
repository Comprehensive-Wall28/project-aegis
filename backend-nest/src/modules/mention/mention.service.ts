import { Injectable, Logger } from '@nestjs/common';
import { TaskRepository } from '../tasks/repositories/task.repository';
import { CalendarRepository } from '../calendar/calendar.repository';
import { NoteRepository } from '../notes/repositories/note.repository';
import { UsersRepository } from '../users/users.repository';

export interface Backlink {
    id: string;
    type: 'task' | 'calendar' | 'note';
}

@Injectable()
export class MentionService {
    private readonly logger = new Logger(MentionService.name);

    constructor(
        private readonly taskRepository: TaskRepository,
        private readonly calendarRepository: CalendarRepository,
        private readonly noteRepository: NoteRepository,
        private readonly usersRepository: UsersRepository,
    ) { }

    /**
     * Get all entities (tasks/events/notes) that mention the target ID.
     */
    async getBacklinks(userId: string, targetId: string): Promise<Backlink[]> {
        const [taskMentions, eventMentions, noteMentions] = await Promise.all([
            this.taskRepository.findMentionsOf(userId, targetId),
            this.calendarRepository.findMentionsOf(userId, targetId),
            this.noteRepository.findMentionsOf(userId, targetId),
        ]);

        const backlinks: Backlink[] = [
            ...taskMentions.map((t) => ({
                id: (t as any)._id.toString(),
                type: 'task' as const,
            })),
            ...eventMentions.map((e) => ({
                id: (e as any)._id.toString(),
                type: 'calendar' as const,
            })),
            ...noteMentions.map((n) => ({
                id: (n as any)._id.toString(),
                type: 'note' as const,
            })),
        ];

        return backlinks;
    }

    /**
     * Search for users by username or email.
     */
    async searchUsers(query: string) {
        if (!query) return [];

        // Using simple regex search via repository if available, or custom query
        const users = await this.usersRepository.findMany({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ],
        } as any, { limit: 10 });

        return users.map(u => ({
            id: (u as any)._id.toString(),
            username: u.username,
            email: u.email,
        }));
    }
}
