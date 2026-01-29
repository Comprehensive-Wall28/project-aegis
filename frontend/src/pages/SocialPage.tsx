import { Box, alpha, useTheme, Typography, Button, Snackbar, Alert } from '@mui/material';
import { Lock as LockIcon, Home as HomeIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { SocialProvider, useSocial } from '@/components/social/SocialPageContext';
import { encryptWithAES, decryptWithAES } from '@/utils/socialCrypto';
import { SocialHeader } from '@/components/social/SocialHeader';
import { SocialPageDialogs } from '@/components/social/SocialPageDialogs';
import { SocialErrorBoundary } from '@/components/social/SocialErrorBoundary';
import { RoomsView } from '@/components/social/RoomsView';
import { RoomContentView } from '@/components/social/RoomContentView';
import { CommentsOverlay } from '@/components/social/CommentsOverlay';
import { ReaderModeOverlay } from '@/components/social/ReaderModeOverlay';
import { ZenModeOverlay } from '@/components/social/ZenModeOverlay';
import { SOCIAL_SNACKBAR_Z_INDEX } from '@/components/social/constants';

function SocialPageContent() {
    const theme = useTheme();
    const {
        error,
        viewMode,
        isMobile,
        optimisticRoomId,
        currentRoom,
        handleExitRoom,
        searchQuery,
        setSearchQuery,
        handleFilterClick,
        selectedUploader,
        handleCopyInvite,
        filterAnchorEl,
        handleFilterClose,
        handleSelectUploader,
        viewFilter,
        setViewFilter,
        uniqueUploaders,
        newLinkUrl,
        setNewLinkUrl,
        handlePostLink,
        isPostingLink,
        sortOrder,
        setSortOrder,
        zenModeOpen,
        toggleOverlay,
        snackbar,
        setSnackbar,
        commentsLink,
        readerLink,
        roomKeys,
        isLoadingLinks,
        isSearchingLinks,
    } = useSocial();

    // const linksContainerRef = useRef<HTMLDivElement>(null); // Removed as it was only used for ZenMode props

    const roomKey = currentRoom ? roomKeys.get(currentRoom._id) : null;

    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                    {error ? (
                        <Box
                            key="error-view"
                            component={motion.div}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                px: 3,
                                gap: 3,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '30px',
                                    bgcolor: alpha(theme.palette.error.main, 0.15),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 1,
                                }}
                            >
                                <LockIcon sx={{ fontSize: 48, color: 'error.main' }} />
                            </Box>

                            <Typography variant="h4" fontWeight="bold" color="text.primary">
                                Access Denied
                            </Typography>

                            <Typography color="text.secondary" sx={{ maxWidth: 400, mb: 2 }}>
                                {error === 'Room not found'
                                    ? "The room you're looking for doesn't exist or has been deleted from the Aegis system."
                                    : "You don't have permission to access this room. It's encrypted and restricted to authorized members only."}
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<HomeIcon />}
                                    onClick={handleExitRoom}
                                    sx={{
                                        borderRadius: '12px',
                                        px: 4,
                                        py: 1.5,
                                        textTransform: 'none',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Return to Social
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Box
                            key="social-content"
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}
                        >
                            <SocialErrorBoundary componentName="Header">
                                <Box sx={{ px: isMobile ? 1 : 0 }}>
                                    <SocialHeader
                                        viewMode={viewMode as any}
                                        isMobile={isMobile}
                                        optimisticRoomId={optimisticRoomId}
                                        currentRoom={currentRoom}
                                        handleExitRoom={handleExitRoom}
                                        searchQuery={searchQuery}
                                        setSearchQuery={setSearchQuery}
                                        handleFilterClick={handleFilterClick}
                                        selectedUploader={selectedUploader}
                                        handleCopyInvite={handleCopyInvite}
                                        filterAnchorEl={filterAnchorEl}
                                        handleFilterClose={handleFilterClose}
                                        handleSelectUploader={handleSelectUploader}
                                        viewFilter={viewFilter}
                                        handleViewFilterChange={setViewFilter}
                                        uniqueUploaders={uniqueUploaders}
                                        newLinkUrl={newLinkUrl}
                                        setNewLinkUrl={setNewLinkUrl}
                                        handlePostLink={handlePostLink}
                                        isPostingLink={isPostingLink}
                                        sortOrder={sortOrder}
                                        handleSortOrderChange={setSortOrder}
                                        isLoadingLinks={isLoadingLinks}
                                        isSearchingLinks={isSearchingLinks}
                                        onToggleZenMode={() => toggleOverlay('zen', !zenModeOpen)}
                                        onCreateRoom={() => toggleOverlay('createRoom', true)}
                                    />
                                </Box>
                            </SocialErrorBoundary>

                            <Box
                                sx={{
                                    flex: 1,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    px: isMobile ? 1 : 0,
                                    height: '100%',
                                }}
                            >
                                {viewMode === 'rooms' ? <RoomsView /> : <RoomContentView />}
                            </Box>
                        </Box>
                    )}
                </AnimatePresence>
            </Box>

            <SocialPageDialogs />

            <CommentsOverlay
                open={!!commentsLink}
                onClose={() => toggleOverlay('comments', null)}
                link={commentsLink as any}
                encryptComment={(d) => roomKey ? encryptWithAES(roomKey, d) : Promise.resolve(d)}
                decryptComment={(d) => roomKey ? decryptWithAES(roomKey, d) : Promise.resolve(d)}
            />
            <ReaderModeOverlay
                open={!!readerLink}
                onClose={() => toggleOverlay('reader', null)}
                link={readerLink as any}
                encryptAnnotation={(d) => roomKey ? encryptWithAES(roomKey, d) : Promise.resolve(d)}
                decryptAnnotation={(d) => roomKey ? decryptWithAES(roomKey, d) : Promise.resolve(d)}
            />
            <ZenModeOverlay
                open={zenModeOpen}
                onClose={() => toggleOverlay('zen', false)}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((prev: any) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ zIndex: SOCIAL_SNACKBAR_Z_INDEX }}
            >
                <Alert
                    onClose={() => setSnackbar((prev: any) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export function SocialPage() {
    return (
        <SocialProvider>
            <SocialPageContent />
        </SocialProvider>
    );
}
