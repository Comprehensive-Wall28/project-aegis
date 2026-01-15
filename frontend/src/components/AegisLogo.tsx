import React from 'react';
import { Link } from 'react-router-dom';
import { Typography, Box } from '@mui/material';

interface AegisLogoProps {
    size?: number;
    className?: string;
    disableLink?: boolean;
    showText?: boolean;
    textVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1';
    textColor?: string;
}

export const AegisLogo: React.FC<AegisLogoProps> = ({
    size = 32,
    className = '',
    disableLink = false,
    showText = false,
    textVariant = 'h6',
    textColor = 'inherit'
}) => {
    const icon = (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 40 40"
            fill="none"
            width={size}
            height={size}
            className={className}
        >
            <path
                d="M12 28 L12 16 L22 16"
                stroke="#233d83"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <path
                d="M16 24 L28 12 M28 12 L28 20 M28 12 L20 12"
                stroke="#0ea5e9"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );

    const content = (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
            {icon}
            {showText && (
                <Typography
                    variant={textVariant}
                    sx={{
                        fontWeight: 900,
                        letterSpacing: '-0.02em',
                        color: textColor,
                        lineHeight: 1,
                        fontFamily: 'Outfit, sans-serif'
                    }}
                >
                    Aegis
                </Typography>
            )}
        </Box>
    );

    if (disableLink) return content;

    return (
        <Link
            to="/"
            style={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'opacity 0.2s ease',
                cursor: 'pointer'
            }}
            className="hover:opacity-80"
        >
            {content}
        </Link>
    );
};

export default AegisLogo;
