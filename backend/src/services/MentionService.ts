import { TaskRepository } from '../repositories/TaskRepository';
import { CalendarEventRepository } from '../repositories/CalendarEventRepository';

export interface Backlink {
    id: string;
    type: 'task' | 'event';
}

/**
 * MentionService handles aggregated cross-entity mention queries.
 */
export class MentionService {
    private taskRepository: TaskRepository;
    private calendarRepository: CalendarEventRepository;

    constructor() {
        this.taskRepository = new TaskRepository();
        this.calendarRepository = new CalendarEventRepository();
    }

    /**
     * Get all entities (tasks/events) that mention the target ID.
     */
    async getBacklinks(userId: string, targetId: string): Promise<Backlink[]> {
        const [taskMentions, eventMentions] = await Promise.all([
            this.taskRepository.findMentionsOf(userId, targetId),
            this.calendarRepository.findMentionsOf(userId, targetId)
        ]);

        const backlinks: Backlink[] = [
            ...taskMentions.map(t => ({ id: t._id.toString(), type: 'task' as const })),
            ...eventMentions.map(e => ({ id: e._id.toString(), type: 'event' as const }))
        ];

        return backlinks;
    }
}
