export class CacheKeyBuilder {
  private static readonly PREFIX = 'aegis';

  static userFiles(userId: string, folderId?: string | null, search?: string): string {
    const parts = [this.PREFIX, userId, 'files', 'list'];
    if (folderId) parts.push(`folder_${folderId}`);
    if (search) parts.push(`search_${this.hashString(search)}`);
    return parts.join(':');
  }

  static userFile(userId: string, fileId: string): string {
    return `${this.PREFIX}:${userId}:files:item:${fileId}`;
  }

  static userStorageStats(userId: string): string {
    return `${this.PREFIX}:${userId}:storage:stats`;
  }

  static calendarRange(userId: string, start: string, end: string): string {
    return `${this.PREFIX}:${userId}:calendar:range:${start}_${end}`;
  }

  static calendarPaginated(userId: string, cursor?: string): string {
    return `${this.PREFIX}:${userId}:calendar:list:${cursor || 'first'}`;
  }

  static taskList(userId: string, status?: string): string {
    const parts = [this.PREFIX, userId, 'tasks', 'list'];
    if (status) parts.push(`status_${status}`);
    return parts.join(':');
  }

  static upcomingTasks(userId: string): string {
    return `${this.PREFIX}:${userId}:tasks:upcoming`;
  }

  static noteList(userId: string, folderId?: string): string {
    const parts = [this.PREFIX, userId, 'notes', 'list'];
    if (folderId) parts.push(`folder_${folderId}`);
    return parts.join(':');
  }

  static userTags(userId: string): string {
    return `${this.PREFIX}:${userId}:notes:tags`;
  }

  static noteFolders(userId: string): string {
    return `${this.PREFIX}:${userId}:notes:folders`;
  }

  static folderList(userId: string, parentId?: string | null): string {
    return `${this.PREFIX}:${userId}:folders:list:parent_${parentId || 'root'}`;
  }

  static userProfile(userId: string): string {
    return `${this.PREFIX}:${userId}:profile:me`;
  }

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export default CacheKeyBuilder;
