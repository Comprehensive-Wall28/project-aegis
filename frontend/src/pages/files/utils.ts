import {
    InsertDriveFile as FileIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    VideoFile as VideoIcon,
    AudioFile as AudioIcon,
    Description as DocIcon,
    TableChart as SpreadsheetIcon,
    Slideshow as PresentationIcon,
    Code as CodeIcon,
    FolderZip as ArchiveIcon,
    TextSnippet as TextIcon,
} from '@mui/icons-material';

export function isPreviewable(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const previewableExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', // Images
        'pdf' // PDF
    ];
    return previewableExtensions.includes(ext);
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getFileIconInfo(fileName: string): { icon: React.ElementType; color: string } {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // PDF
    if (ext === 'pdf') return { icon: PdfIcon, color: '#E53935' };

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext))
        return { icon: ImageIcon, color: '#43A047' };

    // Videos
    if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv'].includes(ext))
        return { icon: VideoIcon, color: '#8E24AA' };

    // Audio
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext))
        return { icon: AudioIcon, color: '#FB8C00' };

    // Documents (Word)
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext))
        return { icon: DocIcon, color: '#1E88E5' };

    // Spreadsheets
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext))
        return { icon: SpreadsheetIcon, color: '#2E7D32' };

    // Presentations
    if (['ppt', 'pptx', 'odp', 'key'].includes(ext))
        return { icon: PresentationIcon, color: '#D84315' };

    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'sql'].includes(ext))
        return { icon: CodeIcon, color: '#00ACC1' };

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext))
        return { icon: ArchiveIcon, color: '#6D4C41' };

    // Text files
    if (['txt', 'md', 'log', 'ini', 'cfg'].includes(ext))
        return { icon: TextIcon, color: '#757575' };

    // Default
    return { icon: FileIcon, color: '#29B6F6' };
}
