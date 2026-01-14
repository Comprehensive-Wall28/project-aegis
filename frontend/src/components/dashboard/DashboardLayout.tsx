import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { SystemStatusBar } from './SystemStatusBar';
import { motion } from 'framer-motion';
import { Box, alpha, useTheme, Paper } from '@mui/material';
import { refreshCsrfToken } from '@/services/api';

export function DashboardLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const theme = useTheme();

    // Fetch CSRF token when dashboard loads
    useEffect(() => {
        refreshCsrfToken();
    }, []);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', overflow: 'hidden', position: 'relative' }}>
            {/* Animated Background */}
            <Box sx={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: '-25%',
                        left: '-25%',
                        width: '50%',
                        height: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: '50%',
                        filter: 'blur(100px)',
                        animation: 'mesh 20s infinite alternate'
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: '-25%',
                        right: '-25%',
                        width: '50%',
                        height: '50%',
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        borderRadius: '50%',
                        filter: 'blur(100px)',
                        animation: 'mesh-delayed 25s infinite alternate'
                    }}
                />
            </Box>

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
                    transition: theme.transitions.create('margin', {
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
                <Box sx={{ flexGrow: 1, m: { xs: 1, sm: 2 }, mt: { xs: 0, sm: 1 }, overflow: 'hidden' }}>
                    <Paper
                        variant="translucent"
                        component={motion.div}
                        layout
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: theme.shadows[10]
                        }}
                    >
                        <Box
                            sx={{
                                flexGrow: 1,
                                p: { xs: 1.5, sm: 3, md: 6 },
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
