import React from 'react';
import { Box, Paper, LinearProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocial } from './SocialPageContext';
import { RoomCard } from './RoomCards';
import { RoomsEmptyState } from './RoomsEmptyState';
import { SocialErrorBoundary } from './SocialErrorBoundary';
import { SOCIAL_RADIUS_XLARGE } from './constants';

export const RoomsView: React.FC = () => {
    const {
        rooms,
        effectiveIsLoadingRooms,
        isMobile,
        handleSelectRoom
    } = useSocial();

    return (
        <Paper
            elevation={1}
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: SOCIAL_RADIUS_XLARGE,
                bgcolor: 'background.paper',
                overflow: 'hidden',
                mb: 2,
            }}
        >
            <Box
                key="rooms-grid-container"
                sx={{
                    flex: 1,
                    overflowX: 'hidden',
                    overflowY: (rooms.length > 0 || effectiveIsLoadingRooms) ? 'auto' : 'hidden',
                    display: (rooms.length > 0 || effectiveIsLoadingRooms) ? 'block' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: isMobile ? 2 : 3,
                    pb: isMobile ? ((rooms.length > 0 || effectiveIsLoadingRooms) ? 12 : 2) : 3,
                    position: 'relative',
                    height: '100%'
                }}
            >
                <Box
                    key="rooms-grid"
                    component={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                            lg: 'repeat(4, 1fr)',
                        },
                        gap: 2,
                    }}
                >
                    <AnimatePresence>
                        {effectiveIsLoadingRooms && (
                            <Box
                                component={motion.div}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    zIndex: 10,
                                    overflow: 'hidden',
                                    borderRadius: '0 0 4px 4px'
                                }}
                            >
                                <LinearProgress />
                            </Box>
                        )}
                    </AnimatePresence>

                    {rooms.map((room, index) => (
                        <SocialErrorBoundary key={room._id} componentName="Room Card">
                            <RoomCard
                                room={room}
                                onSelect={() => handleSelectRoom(room._id)}
                                index={index}
                            />
                        </SocialErrorBoundary>
                    ))}

                    {!effectiveIsLoadingRooms && rooms.length === 0 && (
                        <Box sx={{ gridColumn: '1 / -1' }}>
                            <RoomsEmptyState />
                        </Box>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};
