import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { SystemStatusBar } from './SystemStatusBar';
import { motion } from 'framer-motion';
import { Box, alpha, useTheme, Paper, Snackbar, Alert } from '@mui/material';
import { refreshCsrfToken } from '@/services/api';
import UploadManager from '@/components/vault/UploadManager';
import { useSocialStore, importRoomKeyFromBase64 } from '@/stores/useSocialStore';

import { usePreferenceStore } from '@/stores/preferenceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useVaultDownload } from '@/hooks/useVaultDownload';
import vaultService from '@/services/vaultService';
import { backgroundCache } from '@/lib/backgroundCache';
import { useGlobalData } from '@/hooks/useGlobalData';

export function DashboardLayout() {
    // Global data hydration
    useGlobalData();

    const isSidebarCollapsed = usePreferenceStore((state) => state.isSidebarCollapsed);
    const toggleSidebar = usePreferenceStore((state) => state.toggleSidebar);
    const backgroundImage = usePreferenceStore((state) => state.backgroundImage);
    const backgroundBlur = usePreferenceStore((state) => state.backgroundBlur);
    const backgroundOpacity = usePreferenceStore((state) => state.backgroundOpacity);
    const [bgUrl, setBgUrl] = useState<string | null>(null);
    const { downloadAndDecrypt } = useVaultDownload();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const theme = useTheme();
    const user = useSessionStore((state) => state.user);
    const location = useLocation();
    const isCalendarPage = location.pathname.includes('/calendar');

    // Sync user preferences to local store on login/update
    useEffect(() => {
        if (user?.preferences) {
            usePreferenceStore.setState({
                backgroundImage: user.preferences.backgroundImage || null,
                backgroundBlur: user.preferences.backgroundBlur ?? 8,
                backgroundOpacity: user.preferences.backgroundOpacity ?? 0.4
            });
        }
    }, [user]);

    useEffect(() => {
        let active = true;
        let objectUrl: string | null = null;

        const loadBackground = async () => {
            if (!backgroundImage) {
                setBgUrl(null);
                return;
            }

            try {
                // 1. Try cache first
                const cachedBlob = await backgroundCache.get(backgroundImage);
                if (cachedBlob && active) {
                    objectUrl = URL.createObjectURL(cachedBlob);
                    setBgUrl(objectUrl);
                    return; // Done
                }

                // 2. Not in cache, download from vault
                const fileMetadata = await vaultService.getFile(backgroundImage);
                const blob = await downloadAndDecrypt(fileMetadata);
                if (blob && active) {
                    objectUrl = URL.createObjectURL(blob);
                    setBgUrl(objectUrl);

                    // 3. Save to cache
                    await backgroundCache.save(backgroundImage, blob);
                }
            } catch (error) {
                console.error('Failed to load background:', error);
            }
        };

        loadBackground();

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [backgroundImage, downloadAndDecrypt]);

    // Fetch CSRF token when dashboard loads
    useEffect(() => {
        refreshCsrfToken();
    }, []);

    // Reset window scroll and lock overflow via data-attribute (more performant than direct style injection)
    useEffect(() => {
        document.documentElement.dataset.dashboardActive = 'true';

        // Force scroll to top after a small delay to ensure layout is final
        const timer = setTimeout(() => {
            window.scrollTo(0, 0);
        }, 20);

        return () => {
            delete document.documentElement.dataset.dashboardActive;
            clearTimeout(timer);
        };
    }, []);

    const navigate = useNavigate();
    const joinRoom = useSocialStore((state) => state.joinRoom);
    const [joinMessage, setJoinMessage] = useState<string | null>(null);

    // Handle pending invite after login
    // ... (rest of the checkPendingInvite logic)
    useEffect(() => {
        const checkPendingInvite = async () => {
            const pendingInvite = sessionStorage.getItem('pendingInvite');
            if (!pendingInvite) return;

            try {
                const { inviteCode, keyBase64 } = JSON.parse(pendingInvite);
                if (inviteCode && keyBase64) {
                    const key = await importRoomKeyFromBase64(keyBase64);
                    await joinRoom(inviteCode, key);
                    setJoinMessage('Successfully joined room from invite');

                    // Clear pending invite
                    sessionStorage.removeItem('pendingInvite');

                    // Navigate to social page after a brief delay
                    setTimeout(() => {
                        navigate(`/dashboard/social`);
                    }, 1000);
                }
            } catch (err) {
                console.error('Failed to process pending invite:', err);
                sessionStorage.removeItem('pendingInvite');
            }
        };

        checkPendingInvite();
    }, [joinRoom, navigate]);

    // Swipe to open sidebar (left swipe on mobile)
    const handlePanEnd = (_: any, info: any) => {
        // Detect swipe to left (negative velocity or offset) from the right side
        if (info.offset.x < -50 && info.velocity.x < -100) {
            setIsMobileMenuOpen(true);
        }
    };

    return (
        <Box
            sx={{
                minHeight: ['100vh', '100dvh'],
                bgcolor: 'background.default',
                display: 'flex',
                overflowX: 'hidden',
                overflowY: { xs: 'auto', lg: 'hidden' },
                position: 'relative'
            }}
        >
            {/* Soft Ambient Background Glow - Fixed 'Orb' issue by using wide ellipse */}
            {/* Soft Ambient Background Glow - Fixed 'Orb' issue by using wide ellipse */}
            <Box
                sx={{
                    position: 'fixed',
                    inset: -10, // Slight overflow to prevent edge artifacts on blur
                    zIndex: 0,
                    background: bgUrl
                        ? `url(${bgUrl}) center/cover no-repeat fixed`
                        : theme.palette.background.default,
                    opacity: bgUrl ? (backgroundOpacity ?? 0.4) : 1,
                    filter: bgUrl ? `blur(${backgroundBlur ?? 8}px) brightness(0.7)` : 'none',
                    transition: 'background 0.5s ease-in-out, opacity 0.5s ease-in-out, filter 0.5s ease-in-out',
                    pointerEvents: 'none'
                }}
            />

            {/* Gesture Strip for Swipe-to-Open (Mobile Only) */}
            <Box
                component={motion.div}
                onPanEnd={handlePanEnd}
                sx={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 30, // Narrow strip on the right edge
                    zIndex: 100, // Above content (1) but below modals (1300) and header actions
                    display: { lg: 'none' },
                    touchAction: 'none',
                    bgcolor: 'transparent'
                }}
            />

            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={toggleSidebar}
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Wrapper */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    ml: { lg: isSidebarCollapsed ? '64px' : '224px' },
                    transition: theme.transitions.create(['margin', 'padding'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.shorter,
                    }),
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: { xs: 'none', lg: '100dvh' },
                    height: { xs: 'auto', lg: '100dvh' },
                    position: 'relative',
                    zIndex: 1,
                    minWidth: 0
                }}
            >
                {/* Headers Section */}
                <Box sx={{ zIndex: 10, flexShrink: 0 }}>
                    <TopHeader onMobileMenuOpen={() => setIsMobileMenuOpen(true)} />
                    <SystemStatusBar />
                </Box>

                {/* Content Area ('The Stage') */}
                <Box sx={{ flexGrow: 1, p: { xs: 1, sm: 2 }, pt: 0, overflow: 'hidden' }}>
                    <Paper
                        elevation={0}
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        sx={{
                            height: { xs: 'auto', lg: '100%' },
                            minHeight: { xs: '100vh', lg: 'auto' },
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: { xs: '0px', sm: '16px' },
                            overflow: { xs: 'visible', lg: 'hidden' },
                            // Solid stage for professionalism and performance
                            bgcolor: theme.palette.background.paper,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.05)}`,
                            boxShadow: `0 8px 32px -8px ${alpha('#000', 0.5)}`,
                        }}
                    >
                        <Box
                            sx={{
                                flexGrow: 1,
                                p: {
                                    xs: isCalendarPage ? 0 : 2,
                                    sm: isCalendarPage ? 0 : 3,
                                    md: isCalendarPage ? 0 : 6
                                },
                                overflowY: { xs: 'visible', lg: isCalendarPage ? 'hidden' : 'auto' },
                                '&::-webkit-scrollbar': { width: '6px' },
                                '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.text.primary, 0.1), borderRadius: 3 }
                            }}
                        >
                            <Box sx={{ maxWidth: isCalendarPage ? 'none' : 1600, mx: 'auto', width: '100%', height: '100%' }}>
                                <Outlet />
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            {/* Persistent Upload Manager */}
            <UploadManager />

            <style>{`
                @keyframes mesh {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(10%, 10%) scale(1.1); }
                }
                @keyframes mesh-delayed {
                    0% { transform: translate(0, 0) scale(1.1); }
                    100% { transform: translate(-10%, -10%) scale(1); }
                }
            `}</style>

            <Snackbar
                open={!!joinMessage}
                autoHideDuration={4000}
                onClose={() => setJoinMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity="success" variant="filled" onClose={() => setJoinMessage(null)}>
                    {joinMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}
