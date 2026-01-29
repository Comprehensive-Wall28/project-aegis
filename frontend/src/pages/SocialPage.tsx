import { Box, alpha, useTheme, Typography, Button, Snackbar, Alert } from '@mui/material';
import { Lock as LockIcon, Home as HomeIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { SocialProvider, useSocial } from '@/components/social/SocialPageContext';
import { encryptWithAES, decryptWithAES } from '@/utils/socialCrypto';
import type { Room, LinkPost } from '@/services/socialService';
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
    } = useSocial() as unknown as {error?: string; viewMode?: string; isMobile?: boolean; optimisticRoomId?: string; currentRoom: Room | null; handleExitRoom: () => void; searchQuery?: string; setSearchQuery?: (q: string) => void; handleFilterClick?: (e: React.MouseEvent<HTMLElement>) => void; selectedUploader?: string | null; handleCopyInvite: () => void; filterAnchorEl?: HTMLElement | null; handleFilterClose?: () => void; handleSelectUploader?: (id: string | null) => void; viewFilter?: string; setViewFilter?: (f: string) => void; uniqueUploaders?: Array<{id: string; username: string}>; newLinkUrl?: string; setNewLinkUrl?: (url: string) => void; handlePostLink?: () => void; isPostingLink?: boolean; sortOrder?: string; setSortOrder?: (order: string) => void; zenModeOpen?: boolean; toggleOverlay?: (type: string, val?: unknown) => void; snackbar: {open: boolean; message: string; severity?: string}; setSnackbar?: (s: {open: boolean; message: string; severity?: string}) => void; commentsLink?: LinkPost; readerLink?: LinkPost; roomKeys?: Map<string, CryptoKey>; isLoadingLinks?: boolean; isSearchingLinks?: boolean};

    // const linksContainerRef = useRef<HTMLDivElement>(null); // Removed as it was only used for ZenMode props

    const roomKey = currentRoom ? roomKeys?.get(currentRoom._id) : null;

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
                                        viewMode={(viewMode || 'rooms') as 'room-content' | 'rooms'}
                                        isMobile={isMobile || false}
                                        optimisticRoomId={optimisticRoomId || null}
                                        currentRoom={currentRoom}
                                        handleExitRoom={handleExitRoom || (() => {})}
                                        searchQuery={searchQuery || ''}
                                        setSearchQuery={setSearchQuery || (() => {})}
                                        handleFilterClick={handleFilterClick || (() => {})}
                                        selectedUploader={selectedUploader || null}
                                        handleCopyInvite={handleCopyInvite || (() => {})}
                                        filterAnchorEl={filterAnchorEl || null}
                                        handleFilterClose={handleFilterClose || (() => {})}
                                        handleSelectUploader={handleSelectUploader || (() => {})}
                                        viewFilter={(viewFilter || 'all') as 'all' | 'viewed' | 'unviewed'}
                                        handleViewFilterChange={setViewFilter || (() => {})}
                                        uniqueUploaders={(uniqueUploaders || []).map(u => ({ id: u.id, username: u.username || u.id }))}
                                        newLinkUrl={newLinkUrl || ''}
                                        setNewLinkUrl={setNewLinkUrl || (() => {})}
                                        handlePostLink={handlePostLink || (() => {})}
                                        isPostingLink={isPostingLink || false}
                                        sortOrder={(sortOrder || 'latest') as 'latest' | 'oldest'}
                                        handleSortOrderChange={setSortOrder || (() => {})}
                                        isLoadingLinks={isLoadingLinks || false}
                                        isSearchingLinks={isSearchingLinks || false}
                                        onToggleZenMode={() => (toggleOverlay || (() => {}))('zen')}
                                        onCreateRoom={() => (toggleOverlay || (() => {}))('createRoom')}
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

            {commentsLink && (
                <CommentsOverlay
                    open={true}
                    onClose={() => (toggleOverlay || (() => {}))('comments')}
                    link={commentsLink as unknown as LinkPost}
                    encryptComment={(d: string) => roomKey ? encryptWithAES(roomKey, d) : Promise.resolve(d)}
                    decryptComment={(d: string) => roomKey ? decryptWithAES(roomKey, d) : Promise.resolve(d)}
                />
            )}
            {readerLink && (
                <ReaderModeOverlay
                    open={true}
                    onClose={() => (toggleOverlay || (() => {}))('reader')}
                    link={readerLink as unknown as LinkPost}
                    encryptAnnotation={(d: string) => roomKey ? encryptWithAES(roomKey, d) : Promise.resolve(d)}
                    decryptAnnotation={(d: string) => roomKey ? decryptWithAES(roomKey, d) : Promise.resolve(d)}
                />
            )}
            <ZenModeOverlay
                open={zenModeOpen || false}
                onClose={() => (toggleOverlay || (() => {}))('zen')}
            />

            <Snackbar
                open={snackbar?.open || false}
                autoHideDuration={6000}
                onClose={() => (setSnackbar || (() => {}))({ open: false, message: snackbar?.message || '', severity: snackbar?.severity || 'info' })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ zIndex: SOCIAL_SNACKBAR_Z_INDEX }}
            >
                <Alert
                    onClose={() => (setSnackbar || (() => {}))({ open: false, message: snackbar?.message || '', severity: snackbar?.severity || 'info' })}
                    severity={(snackbar?.severity || 'info') as 'success' | 'error' | 'info' | 'warning'}
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
