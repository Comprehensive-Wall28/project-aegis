import React from 'react';
import { Link } from 'react-router-dom';

interface AegisLogoProps {
    size?: number;
    className?: string;
    disableLink?: boolean;
}

export const AegisLogo: React.FC<AegisLogoProps> = ({
    size = 32,
    className = '',
    disableLink = false
}) => {
    const content = (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 40 40"
            fill="none"
            width={size}
            height={size}
            className={className}
        >
            {/* Simple geometric arrow icon - exactly like Arcana style */}

            {/* Back piece - darker blue bracket */}
            <path
                d="M12 28 L12 16 L22 16"
                stroke="#233d83"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* Front piece - brighter blue arrow */}
            <path
                d="M16 24 L28 12 M28 12 L28 20 M28 12 L20 12"
                stroke="#3f84fb"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
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
