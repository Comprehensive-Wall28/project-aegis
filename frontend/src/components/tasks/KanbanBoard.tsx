import { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import {
    CheckCircle,
    Schedule,
    RadioButtonUnchecked,
} from '@mui/icons-material';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    defaultDropAnimationSideEffects,
    type DropAnimation,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';

import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import type { DecryptedTask } from '@/stores/useTaskStore';
import { TASK_COLUMNS_CONFIG, TASK_STATUS } from '@/constants/taskDefaults';
import { useKanbanLogic } from '@/hooks/useKanbanLogic';

export type SortMode = 'manual' | 'priority' | 'date';

import { DeleteZone, type DeleteStatus } from './DeleteZone';

interface KanbanBoardProps {
    tasks: DecryptedTask[];
    onTaskClick: (task: DecryptedTask) => void;
    onAddTask: (status: 'todo' | 'in_progress' | 'done') => void;
    onTaskMove: (updates: { id: string; status: string; order: number }[]) => void;
    onDeleteTask?: (id: string) => void;
    sortMode: SortMode;
    isDragDisabled?: boolean;
    deleteStatus?: DeleteStatus;
}

const COLUMN_ICONS = {
    [TASK_STATUS.TODO]: <RadioButtonUnchecked />,
    [TASK_STATUS.IN_PROGRESS]: <Schedule />,
    [TASK_STATUS.DONE]: <CheckCircle />,
};

const ALL_COLUMNS = TASK_COLUMNS_CONFIG.map(col => ({
    ...col,
    icon: COLUMN_ICONS[col.id],
}));

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

const styles = {
    boardContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    columnsGrid: {
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: 3,
        flex: 1,
        minHeight: 0,
    },
    columnWrapper: {
        height: '100%',
    },
} as const;

const KanbanBoardComponent = ({ tasks, onTaskClick, onAddTask, onTaskMove, onDeleteTask, sortMode, isDragDisabled, deleteStatus = 'idle' }: KanbanBoardProps) => {
    const {
        sensors,
        activeId,
        activeTask,
        overColumnId,
        tasksByStatus,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
    } = useKanbanLogic({
        tasks,
        sortMode,
        isDragDisabled,
        onTaskMove,
        onDeleteTask,
    });

    const columnList = useMemo(() => ALL_COLUMNS.map((column) => (
        <Box
            key={column.id}
            component={motion.div}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            sx={styles.columnWrapper}
        >
            <KanbanColumn
                id={column.id}
                title={column.title}
                icon={column.icon}
                color={column.color}
                tasks={tasksByStatus[column.id] || []}
                onTaskClick={onTaskClick}
                onAddTask={onAddTask}
                isOverParent={overColumnId === column.id}
            />
        </Box>
    )), [tasksByStatus, onTaskClick, onAddTask, overColumnId]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <Box sx={styles.boardContainer}>
                <Box sx={styles.columnsGrid}>
                    {columnList}
                </Box>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? (
                        <TaskCard
                            task={activeTask}
                            onClick={() => { }}
                            isDragging={true}
                        />
                    ) : null}
                </DragOverlay>

                <DeleteZone isVisible={activeId !== null} status={deleteStatus} />
            </Box>
        </DndContext>
    );
};

export const KanbanBoard = memo(KanbanBoardComponent);
