import { useDroppable } from '@dnd-kit/core';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { DeleteOutline as DeleteIcon, DeleteForever as DeleteForeverIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface DeleteZoneProps {
    isVisible: boolean;
}

export const DeleteZone = ({ isVisible }: DeleteZoneProps) => {
    const theme = useTheme();
    const { setNodeRef, isOver } = useDroppable({
        id: 'delete-zone',
    });

    return (
        <AnimatePresence>
            {isVisible && (
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
                        color: isOver ? theme.palette.error.main : alpha(theme.palette.error.main, 0.7),
                        bgcolor: alpha(isOver ? theme.palette.error.main : theme.palette.background.paper, isOver ? 0.2 : 0.1),
                        border: `2px dashed ${alpha(theme.palette.error.main, isOver ? 0.8 : 0.4)}`,
                        boxShadow: isOver ? `0 0 25px ${alpha(theme.palette.error.main, 0.3)}` : 'none',
                        zIndex: 1000,
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    <Box
                        component={motion.div}
                        animate={{
                            rotate: isOver ? [0, -10, 10, -10, 10, 0] : 0,
                        }}
                        transition={{ duration: 0.5, repeat: isOver ? Infinity : 0 }}
                    >
                        {isOver ? (
                            <DeleteForeverIcon sx={{ fontSize: 36 }} />
                        ) : (
                            <DeleteIcon sx={{ fontSize: 30 }} />
                        )}
                    </Box>
                    <Typography
                        variant="caption"
                        sx={{
                            mt: 0.2,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: '0.55rem'
                        }}
                    >
                        {isOver ? 'Delete' : 'Trash'}
                    </Typography>
                </Box>
            )}
        </AnimatePresence>
    );
};
