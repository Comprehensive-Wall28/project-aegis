export class ReaderContentResponseDto {
  title: string;

  byline: string | null;

  content: string;

  textContent: string;

  siteName: string | null;

  status: 'success' | 'blocked' | 'failed';

  error?: string;

  annotationCounts: Record<string, number>;
}
