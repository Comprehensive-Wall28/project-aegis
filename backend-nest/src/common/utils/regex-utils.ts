/**
 * Escapes characters with special meaning in either
 * POSIX extended or standard regular expression languages.
 *
 * @param str The string to escape
 * @returns The escaped string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
