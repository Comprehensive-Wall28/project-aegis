import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { SystemStatusBar } from './SystemStatusBar';
import { motion } from 'framer-motion';
import { Box, alpha, useTheme, Paper } from '@mui/material';
import { refreshCsrfToken } from '@/services/api';
import UploadManager from '@/components/vault/UploadManager';
import { useVaultUpload } from '@/hooks/useVaultUpload';

export function DashboardLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const theme = useTheme();
    const { activeUploads, globalState, clearCompleted } = useVaultUpload();

    // Fetch CSRF token when dashboard loads
    useEffect(() => {
        refreshCsrfToken();
    }, []);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', overflow: 'hidden', position: 'relative' }}>
            {/* Solid Thematic Background */}
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 0,
                    background: `radial-gradient(circle at 50% -20%, ${alpha(theme.palette.primary.main, 0.4)} 0%, ${theme.palette.background.default} 100%)`,
                    opacity: 0.1, // Deeper, more immersive
                    pointerEvents: 'none'
                }}
            />

            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
                    height: '100vh',
                    position: 'relative',
                    zIndex: 1,
                    minWidth: 0
                }}
            >
                {/* Headers Section */}
                <Box sx={{ zIndex: 10, flexShrink: 0 }}>
                    <TopHeader />
                    <SystemStatusBar />
                </Box>

                {/* Content Area ('The Stage') */}
                <Box sx={{ flexGrow: 1, m: { xs: 1, sm: 2 }, mt: { xs: 0, sm: 0 }, overflow: 'hidden' }}>
                    <Paper
                        elevation={0}
                        component={motion.div}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            // Solid stage for professionalism and performance
                            bgcolor: theme.palette.background.paper,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                            boxShadow: `0 8px 32px -8px ${alpha('#000', 0.5)}`
                        }}
                    >
                        <Box
                            sx={{
                                flexGrow: 1,
                                p: { xs: 2, sm: 3, md: 6 },
                                overflowY: 'auto',
                                '&::-webkit-scrollbar': { width: '6px' },
                                '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.text.primary, 0.1), borderRadius: 3 }
                            }}
                        >
                            <Box sx={{ maxWidth: 1600, mx: 'auto', width: '100%', height: '100%' }}>
                                <Outlet />
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            {/* Persistent Upload Manager */}
            <UploadManager
                uploads={activeUploads}
                globalProgress={globalState.progress}
                onClearCompleted={clearCompleted}
            />

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
        </Box>
    );
}
