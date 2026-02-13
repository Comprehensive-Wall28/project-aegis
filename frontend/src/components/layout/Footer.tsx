import {
    Box,
    Container,
    Typography,
    Link,
    IconButton,
    alpha,
    useTheme,
    Divider,
    Stack
} from '@mui/material';
import {
    GitHub as GitHubIcon,
    Code as CodeIcon,
    Favorite as HeartIcon
} from '@mui/icons-material';
import { AegisLogo } from '@/components/AegisLogo';

export function Footer() {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const version = import.meta.env.VITE_APP_VERSION || '0.0.0';

    return (
        <Box
            id="footer"
            component="footer"
            sx={{
                py: { xs: 6, md: 8 },
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                backdropFilter: 'blur(10px)',
                position: 'relative',
                zIndex: 1,
                mt: 'auto'
            }}
        >
            <Container maxWidth="lg">
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'center', md: 'flex-start' },
                        gap: 4,
                        mb: 6
                    }}
                >
                    {/* Brand Section */}
                    <Box sx={{ textAlign: { xs: 'center', md: 'left' }, maxWidth: 300 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                            <AegisLogo size={32} disableLink />
                            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
                                Aegis
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            A quantum-resistant, end-to-end encrypted productivity suite designed for the future of privacy.
                        </Typography>
                    </Box>

                    {/* Links Section */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 4, sm: 8 }}
                        sx={{ textAlign: { xs: 'center', sm: 'left' } }}
                    >
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                                Product
                            </Typography>
                            <Stack spacing={1}>
                                <Link href="#features" color="inherit" underline="none" sx={{ fontSize: '0.875rem', '&:hover': { color: 'primary.main' } }}>Features</Link>
                                <Link href="#how-it-works" color="inherit" underline="none" sx={{ fontSize: '0.875rem', '&:hover': { color: 'primary.main' } }}>How it Works</Link>
                                <Link href="#security" color="inherit" underline="none" sx={{ fontSize: '0.875rem', '&:hover': { color: 'primary.main' } }}>Security</Link>
                            </Stack>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                                Resources
                            </Typography>
                            <Stack spacing={1}>
                                <Link href="https://github.com/Comprehensive-Wall28/project-aegis" target="_blank" color="inherit" underline="none" sx={{ fontSize: '0.875rem', '&:hover': { color: 'primary.main' } }}>Documentation</Link>
                                <Link href="/pqc-learn" color="inherit" underline="none" sx={{ fontSize: '0.875rem', '&:hover': { color: 'primary.main' } }}>PQC Guide</Link>
                                <Link href="https://github.com/Comprehensive-Wall28/project-aegis/issues" target="_blank" color="inherit" underline="none" sx={{ fontSize: '0.875rem', '&:hover': { color: 'primary.main' } }}>Support</Link>
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Community Section */}
                    <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                            Community
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'center', md: 'flex-end' } }}>
                            <IconButton
                                component="a"
                                href="https://github.com/Comprehensive-Wall28/project-aegis"
                                target="_blank"
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.divider, 0.1),
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }
                                }}
                            >
                                <GitHubIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>

                <Divider sx={{ opacity: 0.1, mb: 4 }} />

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            © {currentYear} Aegis. Built with
                        </Typography>
                        <HeartIcon sx={{ fontSize: 14, color: 'error.main', mx: 0.5 }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            by <Link href="https://github.com/Comprehensive-Wall28" target="_blank" color="primary" sx={{ fontWeight: 600 }}>Comprehensive-Wall28</Link>
                        </Typography>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1.5,
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                color: 'info.main',
                                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                            }}
                        >
                            <CodeIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                                v{version}
                            </Typography>
                        </Box>
                        <Link
                            href="https://github.com/Comprehensive-Wall28/project-aegis"
                            target="_blank"
                            variant="caption"
                            sx={{
                                color: 'text.secondary',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                '&:hover': { color: 'primary.main' }
                            }}
                        >
                            <GitHubIcon sx={{ fontSize: 14 }} />
                            Source
                        </Link>
                    </Stack>
                </Box>
            </Container>
        </Box>
    );
}
