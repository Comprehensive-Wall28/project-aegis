import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/marketing/Hero';
import { Features } from '@/components/marketing/Features';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { useEffect, useState, useCallback } from 'react';
import { Box, Fab, alpha, useTheme } from '@mui/material';
import { KeyboardArrowDown as ArrowDownIcon, KeyboardArrowUp as ArrowUpIcon } from '@mui/icons-material';

export function Landing() {
    const theme = useTheme();
    const [currentSection, setCurrentSection] = useState(0);
    const sections = ['hero', 'features', 'security', 'how-it-works', 'footer'];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Track which section is currently in view
    useEffect(() => {
        const handleScroll = () => {
            // Check if we are at the bottom of the page (with 50px buffer for better desktop detection)
            const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50;
            
            if (isAtBottom) {
                setCurrentSection(sections.length - 1);
                return;
            }

            // Normal section detection
            const scrollPosition = window.scrollY + window.innerHeight / 3; // Use 1/3 for slightly earlier detection

            for (let i = sections.length - 1; i >= 0; i--) {
                const element = document.getElementById(sections[i]) ||
                    (sections[i] === 'hero' ? document.querySelector('section') : null);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const elementTop = rect.top + window.scrollY;
                    if (scrollPosition >= elementTop) {
                        setCurrentSection(i);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Initial check
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isLastSection = currentSection >= sections.length - 1;

    const handleScrollClick = useCallback(() => {
        if (isLastSection) {
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Scroll to next section
            const nextIndex = Math.min(currentSection + 1, sections.length - 1);
            const nextSection = sections[nextIndex];
            const element = document.getElementById(nextSection) ||
                (nextSection === 'hero' ? document.querySelector('section') : null);

            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [currentSection, isLastSection]);

    return (
        <Box
            component="main"
            sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                color: 'text.primary',
                position: 'relative'
            }}
        >
            <Navbar />
            <Hero />
            <Features />
            <HowItWorks />
            <Footer />

            {/* Fixed scroll button */}
            <Fab
                size="small"
                onClick={handleScrollClick}
                sx={{
                    position: 'fixed',
                    bottom: { xs: 20, sm: 32 },
                    right: { xs: 20, sm: 32 },
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    color: 'primary.main',
                    border: `1.5px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    boxShadow: 'none',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                        borderColor: theme.palette.primary.main,
                        transform: 'scale(1.1) translateY(-2px)'
                    },
                    display: { xs: 'flex', md: 'flex' },
                    zIndex: 1000,
                    width: { xs: 40, sm: 48 },
                    height: { xs: 40, sm: 48 },
                    minHeight: 'auto'
                }}
            >
                {isLastSection ? (
                    <ArrowUpIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                ) : (
                    <ArrowDownIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                )}
            </Fab>
        </Box>
    );
}
