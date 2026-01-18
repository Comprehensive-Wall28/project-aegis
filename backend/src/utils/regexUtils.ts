/**
 * Escapes special characters in a string for use in a regular expression
 * @param string The string to escape
 * @returns The escaped string safe for use in new RegExp()
 */
export function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
