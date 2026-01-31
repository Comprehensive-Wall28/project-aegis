import { useState } from 'react';

export function useContextMenu() {
    const [contextMenu, setContextMenu] = useState<{
        open: boolean;
        position: { x: number; y: number } | null;
        target: { type: 'file' | 'folder' | 'empty'; id?: string } | null;
    }>({
        open: false,
        position: null,
        target: null,
    });

    const handleContextMenu = (
        e: React.MouseEvent,
        target: { type: 'file' | 'folder' | 'empty'; id?: string }
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            open: true,
            position: { x: e.clientX, y: e.clientY },
            target,
        });
    };

    const closeContextMenu = () => {
        setContextMenu({ open: false, position: null, target: null });
    };

    return {
        contextMenu,
        handleContextMenu,
        closeContextMenu,
    };
}
