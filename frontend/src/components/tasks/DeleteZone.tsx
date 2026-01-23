import { useDroppable } from '@dnd-kit/core';
import { Box, Typography, alpha, useTheme, CircularProgress } from '@mui/material';
import {
    DeleteOutline as DeleteIcon,
    DeleteForever as DeleteForeverIcon,
    CheckCircleOutline as SuccessIcon,
    ErrorOutline as ErrorIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export type DeleteStatus = 'idle' | 'deleting' | 'success' | 'error';

interface DeleteZoneProps {
    isVisible: boolean;
    status?: DeleteStatus;
}

export const DeleteZone = ({ isVisible, status = 'idle' }: DeleteZoneProps) => {
    const theme = useTheme();
    const { setNodeRef, isOver } = useDroppable({
        id: 'delete-zone',
    });

    const isShown = isVisible || status !== 'idle';

    const getStatusStyles = () => {
        switch (status) {
            case 'success':
                return {
                    color: theme.palette.success.main,
                    bgcolor: alpha(theme.palette.success.main, 0.2),
                    border: `2px solid ${theme.palette.success.main}`,
                    icon: <SuccessIcon sx={{ fontSize: 36 }} />,
                    label: 'Deleted'
                };
            case 'error':
                return {
                    color: theme.palette.error.main,
                    bgcolor: alpha(theme.palette.error.main, 0.2),
                    border: `2px solid ${theme.palette.error.main}`,
                    icon: <ErrorIcon sx={{ fontSize: 36 }} />,
                    label: 'Failed'
                };
            case 'deleting':
                return {
                    color: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                    border: `2px dashed ${theme.palette.primary.main}`,
                    icon: <CircularProgress size={30} color="inherit" thickness={5} />,
                    label: 'Deleting'
                };
            default:
                return {
                    color: isOver ? theme.palette.error.main : alpha(theme.palette.error.main, 0.7),
                    bgcolor: alpha(isOver ? theme.palette.error.main : theme.palette.background.paper, isOver ? 0.2 : 0.1),
                    border: `2px dashed ${alpha(theme.palette.error.main, isOver ? 0.8 : 0.4)}`,
                    icon: isOver ? <DeleteForeverIcon sx={{ fontSize: 36 }} /> : <DeleteIcon sx={{ fontSize: 30 }} />,
                    label: isOver ? 'Delete' : 'Trash'
                };
        }
    };

    const styles = getStatusStyles();

    return (
        <AnimatePresence>
            {isShown && (
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.9, y: 30, x: 10 }}
                    animate={{
                        opacity: 1,
                        scale: isOver ? 1.08 : 1,
                        y: 0,
                        x: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.9, y: 30, x: 10 }}
                    transition={{
                        type: 'tween',
                        ease: [0.4, 0, 0.2, 1],
                        duration: 0.3
                    }}
                    ref={setNodeRef}
                    sx={{
                        position: 'fixed',
                        bottom: 32,
                        right: 32,
                        width: 90,
                        height: 90,
                        borderRadius: '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: styles.color,
                        bgcolor: styles.bgcolor,
                        border: styles.border,
                        boxShadow: (isOver || status !== 'idle') ? `0 0 25px ${alpha(styles.color, 0.3)}` : 'none',
                        zIndex: 2000,
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    <Box
                        component={motion.div}
                        animate={{
                            rotate: (isOver && status === 'idle') ? [0, -10, 10, -10, 10, 0] : 0,
                            scale: status !== 'idle' ? [1, 1.2, 1] : 1
                        }}
                        transition={{
                            rotate: { duration: 0.5, repeat: isOver ? Infinity : 0 },
                            scale: { duration: 0.3 }
                        }}
                    >
                        {styles.icon}
                    </Box>
                    <Typography
                        variant="caption"
                        sx={{
                            mt: 0.2,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: '0.55rem'
                        }}
                    >
                        {styles.label}
                    </Typography>
                </Box>
            )}
        </AnimatePresence>
    );
};
