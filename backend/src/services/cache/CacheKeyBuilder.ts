export class CacheKeyBuilder {
  private static readonly PREFIX = 'aegis';

  /**
   * Coerce a value to a string at runtime to prevent type confusion attacks.
   * Express may pass arrays instead of strings when duplicate query params are sent.
   */
  private static ensureString(value: unknown): string {
    if (typeof value === 'string') return value;
    return String(value);
  }

  static userFiles(userId: string, folderId?: string | null, search?: string): string {
    const parts = [this.PREFIX, userId, 'files', 'list'];
    if (folderId) parts.push(`folder_${this.ensureString(folderId)}`);
    if (search) parts.push(`search_${this.hashString(this.ensureString(search))}`);
    return parts.join(':');
  }

  static userFile(userId: string, fileId: string): string {
    return `${this.PREFIX}:${userId}:files:item:${this.ensureString(fileId)}`;
  }

  static userStorageStats(userId: string): string {
    return `${this.PREFIX}:${userId}:storage:stats`;
  }

  static calendarRange(userId: string, start: string, end: string): string {
    return `${this.PREFIX}:${userId}:calendar:range:${this.ensureString(start)}_${this.ensureString(end)}`;
  }

  static calendarPaginated(userId: string, cursor?: string): string {
    return `${this.PREFIX}:${userId}:calendar:list:${cursor ? this.ensureString(cursor) : 'first'}`;
  }

  static taskList(userId: string, status?: string): string {
    const parts = [this.PREFIX, userId, 'tasks', 'list'];
    if (status) parts.push(`status_${this.ensureString(status)}`);
    return parts.join(':');
  }

  static upcomingTasks(userId: string): string {
    return `${this.PREFIX}:${userId}:tasks:upcoming`;
  }

  static noteList(userId: string, folderId?: string): string {
    const parts = [this.PREFIX, userId, 'notes', 'list'];
    if (folderId) parts.push(`folder_${this.ensureString(folderId)}`);
    return parts.join(':');
  }

  static userTags(userId: string): string {
    return `${this.PREFIX}:${userId}:notes:tags`;
  }

  static noteFolders(userId: string): string {
    return `${this.PREFIX}:${userId}:notes:folders`;
  }

  static folderList(userId: string, parentId?: string | null): string {
    return `${this.PREFIX}:${userId}:folders:list:parent_${parentId ? this.ensureString(parentId) : 'root'}`;
  }

  static userProfile(userId: string): string {
    return `${this.PREFIX}:${userId}:profile:me`;
  }

  private static hashString(str: string): string {
    const safeStr = this.ensureString(str);
    let hash = 0;
    for (let i = 0; i < safeStr.length; i++) {
      const char = safeStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export default CacheKeyBuilder;
