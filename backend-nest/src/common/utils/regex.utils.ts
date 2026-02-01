/**
 * Escapes characters in a string to be used in a regular expression
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
