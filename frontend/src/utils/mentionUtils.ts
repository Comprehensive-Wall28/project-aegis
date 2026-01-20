/**
 * Utility functions for handling mentions on the frontend.
 */

// Regex patterns for different mention types
const FILE_MENTION_REGEX = /\[@.*?\]\(aegis-file:\/\/([^\/]+)\/([^\)]+)\)/g;
const TASK_MENTION_REGEX = /\[#.*?\]\(aegis-task:\/\/([^\)]+)\)/g;
const EVENT_MENTION_REGEX = /\[~.*?\]\(aegis-event:\/\/([^\)]+)\)/g;

/**
 * Extracts all unique entity IDs mentioned in the given markdown text.
 * This is used to sync mention metadata with the backend before encryption.
 * 
 * @param text The markdown text to scan for mentions
 * @returns Array of unique IDs (file IDs, task IDs, or event IDs)
 */
export const extractMentionedIds = (text: string | null | undefined): string[] => {
    if (!text) return [];

    const ids = new Set<string>();

    // 1. Extract File IDs
    let match;
    while ((match = FILE_MENTION_REGEX.exec(text)) !== null) {
        if (match[2]) ids.add(match[2]);
    }

    // 2. Extract Task IDs
    while ((match = TASK_MENTION_REGEX.exec(text)) !== null) {
        if (match[1]) ids.add(match[1]);
    }

    // 3. Extract Event IDs
    while ((match = EVENT_MENTION_REGEX.exec(text)) !== null) {
        if (match[1]) ids.add(match[1]);
    }

    return Array.from(ids);
};
