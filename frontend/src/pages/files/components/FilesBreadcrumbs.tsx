import { Breadcrumbs, Link, useTheme, alpha } from '@mui/material';
import { Home as HomeIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import type { Folder } from '@/services/folderService';

interface FilesBreadcrumbsProps {
    folderPath: Folder[];
    onNavigate: (folder: Folder | null) => void;
    dragOverId: string | null;
    setDragOverId: (id: string | null) => void;
    onMove: (targetId: string | null, droppedFileId: string) => void;
}

export function FilesBreadcrumbs({
    folderPath,
    onNavigate,
    dragOverId,
    setDragOverId,
    onMove
}: FilesBreadcrumbsProps) {
    const theme = useTheme();

    return (
        <Breadcrumbs separator={<ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />} sx={{ mb: -2 }}>
            <Link
                component="button"
                underline="hover"
                onClick={() => onNavigate(null)}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverId('root');
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOverId(null);
                    const droppedFileId = e.dataTransfer.getData('fileId');
                    if (droppedFileId) {
                        onMove(null, droppedFileId);
                    }
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontWeight: 600,
                    color: 'text.secondary',
                    p: 0.5,
                    borderRadius: '4px',
                    bgcolor: dragOverId === 'root' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    border: dragOverId === 'root' ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent'
                }}
            >
                <HomeIcon fontSize="small" />
                Home
            </Link>
            {folderPath.map((folder, index) => (
                <Link
                    key={folder._id}
                    component="button"
                    underline="hover"
                    onClick={() => onNavigate(folder)}
                    onDragOver={(e) => {
                        // Don't allow dropping on the current folder (last in path)
                        if (index < folderPath.length - 1) {
                            e.preventDefault();
                            setDragOverId(folder._id);
                        }
                    }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOverId(null);
                        const droppedFileId = e.dataTransfer.getData('fileId');
                        if (droppedFileId) {
                            onMove(folder._id, droppedFileId);
                        }
                    }}
                    sx={{
                        fontWeight: 600,
                        color: index === folderPath.length - 1 ? 'text.primary' : 'text.secondary',
                        p: 0.5,
                        borderRadius: '4px',
                        bgcolor: dragOverId === folder._id ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                        border: dragOverId === folder._id ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent'
                    }}
                >
                    {folder.name}
                </Link>
            ))}
        </Breadcrumbs>
    );
}
