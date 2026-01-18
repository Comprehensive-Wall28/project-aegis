import { useState, useCallback } from 'react';
import type { FileMetadata } from '@/services/vaultService';

export function useFileSelection(files: FileMetadata[]) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(prev => {
            if (prev.size === files.length) return new Set();
            return new Set(files.map(f => f._id));
        });
    }, [files]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    return {
        selectedIds,
        setSelectedIds,
        toggleSelect,
        selectAll,
        clearSelection
    };
}
