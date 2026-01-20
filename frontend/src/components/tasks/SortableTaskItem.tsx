import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box } from '@mui/material';
import { TaskCard } from './TaskCard';
import type { DecryptedTask } from '@/stores/useTaskStore';

interface SortableTaskItemProps {
    task: DecryptedTask;
    onTaskClick: (task: DecryptedTask) => void;
}

const SortableTaskItemComponent = ({ task, onTaskClick }: SortableTaskItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task._id,
        data: {
            type: 'Task',
            task,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            sx={{
                mb: 1.5,
                touchAction: 'none',
                position: 'relative',
                zIndex: isDragging ? 100 : 1,
            }}
        >
            <TaskCard
                task={task}
                onClick={() => onTaskClick(task)}
                isDragging={isDragging}
            />
        </Box>
    );
};

// Memoize to prevent re-renders when other tasks are being dragged
export const SortableTaskItem = React.memo(SortableTaskItemComponent);
