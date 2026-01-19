import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/marketing/Hero';
import { Features } from '@/components/marketing/Features';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { useEffect, useState, useCallback } from 'react';
import { Box, Fab, alpha, useTheme } from '@mui/material';
import { KeyboardArrowDown as ArrowDownIcon, KeyboardArrowUp as ArrowUpIcon } from '@mui/icons-material';

export function Landing() {
    const theme = useTheme();
    const [currentSection, setCurrentSection] = useState(0);
    const sections = ['hero', 'features', 'security', 'how-it-works'];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Track which section is currently in view
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 2;

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

            {/* Fixed scroll button */}
            <Fab
                size="medium"
                onClick={handleScrollClick}
                sx={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    bgcolor: theme.palette.background.paper,
                    color: 'primary.main',
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                    boxShadow: 'none',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                        borderColor: theme.palette.primary.main,
                        transform: 'scale(1.1)'
                    },
                    zIndex: 1000
                }}
            >
                {isLastSection ? (
                    <ArrowUpIcon sx={{ fontSize: 28 }} />
                ) : (
                    <ArrowDownIcon sx={{ fontSize: 28 }} />
                )}
            </Fab>
        </Box>
    );
}
