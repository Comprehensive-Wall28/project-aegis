import { useCallback, useState } from 'react';
import { useTheme } from '@mui/material';

interface DragMetaData {
    linkId: string;
    isViewed: boolean;
    previewData: {
        title?: string;
        image?: string;
        favicon?: string;
    };
    url: string;
}

export function useLinkCardDrag(meta: DragMetaData) {
    const theme = useTheme();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = useCallback((e: React.DragEvent) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', meta.linkId);
        e.dataTransfer.effectAllowed = 'move';

        // Helper for proxied image
        const getProxiedUrl = (url: string) => {
            const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
            return `${API_URL}/api/social/proxy-image?url=${encodeURIComponent(url)}`;
        };

        const faviconImage = meta.previewData.favicon ? getProxiedUrl(meta.previewData.favicon) : '';

        // Create a lightweight ghost element for the drag image
        const ghost = document.createElement('div');
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        ghost.style.left = '-1000px';
        ghost.style.width = '240px';
        ghost.style.padding = '12px';
        ghost.style.background = meta.isViewed ? '#1e293b' : '#0f172a';
        ghost.style.border = `1px solid ${theme.palette.divider}`;
        ghost.style.borderRadius = '8px';
        ghost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        ghost.style.display = 'flex';
        ghost.style.alignItems = 'center';
        ghost.style.gap = '12px';
        ghost.style.zIndex = '9999';

        if (faviconImage) {
            const img = document.createElement('img');
            img.src = faviconImage;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.borderRadius = '6px';
            img.style.objectFit = 'cover';
            ghost.appendChild(img);
        } else {
            const icon = document.createElement('div');
            icon.innerHTML = '🔗';
            icon.style.fontSize = '20px';
            ghost.appendChild(icon);
        }

        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '2px';
        content.style.flex = '1';
        content.style.minWidth = '0';

        const title = document.createElement('span');
        title.innerText = meta.previewData.title || 'Untitled Link';
        title.style.fontSize = '14px';
        title.style.fontWeight = '600';
        title.style.color = '#f8fafc';
        title.style.overflow = 'hidden';
        title.style.textOverflow = 'ellipsis';
        title.style.whiteSpace = 'nowrap';
        title.style.display = 'block';
        content.appendChild(title);

        const urlText = document.createElement('span');
        try {
            const urlObj = new URL(meta.url);
            urlText.innerText = urlObj.hostname;
        } catch {
            urlText.innerText = 'Link';
        }
        urlText.style.fontSize = '11px';
        urlText.style.color = '#94a3b8';
        urlText.style.overflow = 'hidden';
        urlText.style.textOverflow = 'ellipsis';
        urlText.style.whiteSpace = 'nowrap';
        urlText.style.display = 'block';
        content.appendChild(urlText);

        ghost.appendChild(content);
        document.body.appendChild(ghost);

        e.dataTransfer.setDragImage(ghost, 20, 25);

        setTimeout(() => {
            if (document.body.contains(ghost)) {
                document.body.removeChild(ghost);
            }
        }, 0);
    }, [meta, theme]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    return {
        isDragging,
        handleDragStart,
        handleDragEnd
    };
}
