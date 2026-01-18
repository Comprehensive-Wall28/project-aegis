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

export const createDragPreview = (label: string, count: number = 1, icon?: string) => {
    const div = document.createElement('div');
    div.style.padding = '12px 24px';
    div.style.background = '#2A2A2A'; // Dark background
    div.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    div.style.borderRadius = '24px';
    div.style.color = 'white';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '12px';
    // div.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'; // Removed to prevent square artifacts
    div.style.width = 'fit-content';
    div.style.position = 'absolute';
    div.style.top = '-1000px';
    div.style.zIndex = '9999';
    div.style.pointerEvents = 'none';
    div.style.fontFamily = 'Inter, sans-serif';
    div.style.fontWeight = '500';

    // Icon container
    const iconDiv = document.createElement('div');
    iconDiv.style.display = 'flex';
    iconDiv.style.alignItems = 'center';
    iconDiv.style.justifyContent = 'center';
    iconDiv.style.width = '24px';
    iconDiv.style.height = '24px';
    iconDiv.innerHTML = icon || '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
    div.appendChild(iconDiv);

    // Text
    const textNode = document.createElement('span');
    textNode.innerText = count > 1 ? `${count} items` : (label.length > 20 ? label.slice(0, 20) + '...' : label);
    div.appendChild(textNode);

    // Badge for multiple items
    if (count > 1) {
        const badge = document.createElement('div');
        badge.style.background = '#3B82F6'; // Primary blue
        badge.style.borderRadius = '12px';
        badge.style.padding = '2px 8px';
        badge.style.fontSize = '12px';
        badge.style.marginLeft = '8px';
        badge.style.fontWeight = 'bold';
        badge.innerText = count.toString();
        div.appendChild(badge);
    }

    document.body.appendChild(div);
    return div;
};
