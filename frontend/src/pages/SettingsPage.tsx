import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Snackbar,
    Alert,
    Tabs,
    Tab,
    alpha,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Settings as SettingsIcon,
    Person as PersonIcon,
    Security as SecurityIcon,
    History as HistoryIcon,
    Palette as PaletteIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { AuditTrailView } from '@/components/security/AuditTrailView';

const TAB_MAP = ['account', 'security', 'appearance', 'activity'];

interface NotificationState {
    type: 'success' | 'error';
    message: string;
}

interface TabPanelProps {
    children: React.ReactNode;
    value: number;
    index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            sx={{ pt: { xs: 2, md: 1.5 } }}
        >
            {value === index && children}
        </Box>
    );
}

export function SettingsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Sanitize initial tab from URL
    const getInitialTab = () => {
        const tabParam = searchParams.get('tab');
        if (tabParam) {
            const index = TAB_MAP.indexOf(tabParam.toLowerCase());
            if (index !== -1) return index;
        }
        return 0;
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [notification, setNotification] = useState<NotificationState | null>(null);

    // Handle navigation state (e.g., from LiveActivityWidget "View All" button)
    useEffect(() => {
        if (location.state?.activeTab !== undefined) {
            const newTab = location.state.activeTab;
            setActiveTab(newTab);
            // Also sync search params if navigated via state
            setSearchParams({ tab: TAB_MAP[newTab] }, { replace: true });
        }
    }, [location.state, setSearchParams]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        setSearchParams({ tab: TAB_MAP[newValue] }, { replace: true });
    };

    const handleNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
    };

    const handleCloseNotification = () => setNotification(null);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
    };

    return (
        <Box
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            sx={{ maxWidth: 800, mx: 'auto', px: { xs: 1, md: 3 }, py: { xs: 2, md: 3 } }}
        >
            {/* Page Header */}
            <Box component={motion.div} variants={itemVariants} sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <SettingsIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                    Settings
                </Typography>
                {/* <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Manage your account, security preferences, and activity
                </Typography> */}
            </Box>

            {/* Snackbar Notification */}
            <Snackbar
                open={!!notification}
                autoHideDuration={5000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseNotification} severity={notification?.type || 'success'} variant="filled" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                    {notification?.message}
                </Alert>
            </Snackbar>

            {/* Tabs */}
            <Box component={motion.div} variants={itemVariants}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{
                        mb: { xs: 1, md: 0.5 },
                        bgcolor: alpha(theme.palette.common.white, 0.04),
                        borderRadius: '16px',
                        p: 0.5,
                        width: '100%',
                        mx: 'auto',
                        minHeight: 48,
                        '& .MuiTabs-indicator': {
                            height: '100%',
                            borderRadius: '12px',
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            zIndex: 0,
                        },
                        '& .MuiTabs-flexContainer': {
                            position: 'relative',
                            zIndex: 1,
                        },
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: { xs: '11px', sm: '14px' },
                            color: 'text.secondary',
                            minHeight: isMobile ? 40 : 44,
                            px: { xs: 1, sm: 3 },
                            minWidth: { xs: '0', sm: 120 },
                            transition: 'color 0.2s, background-color 0.2s',
                            zIndex: 2,
                            borderRadius: '12px',
                            '&.Mui-selected': {
                                color: theme.palette.primary.main,
                            },
                            '& .MuiTab-iconWrapper': {
                                mb: isMobile ? 0.5 : 0,
                                mr: isMobile ? 0 : 1,
                                fontSize: isMobile ? 18 : 20,
                            }
                        },
                    }}
                >
                    <Tab
                        icon={<PersonIcon />}
                        iconPosition={isMobile ? "top" : "start"}
                        label="Account"
                    />
                    <Tab
                        icon={<SecurityIcon />}
                        iconPosition={isMobile ? "top" : "start"}
                        label="Security"
                    />
                    <Tab
                        icon={<PaletteIcon />}
                        iconPosition={isMobile ? "top" : "start"}
                        label="Appearance"
                    />
                    <Tab
                        icon={<HistoryIcon />}
                        iconPosition={isMobile ? "top" : "start"}
                        label="Activity"
                    />
                </Tabs>



                {/* Tab Panels */}
                <TabPanel value={activeTab} index={0}>
                    <AccountSettings onNotification={handleNotification} />
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <SecuritySettings onNotification={handleNotification} />
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                    <AppearanceSettings onNotification={handleNotification} />
                </TabPanel>

                <TabPanel value={activeTab} index={3}>
                    <AuditTrailView maxHeight={600} />
                </TabPanel>
            </Box>
        </Box>
    );
}
