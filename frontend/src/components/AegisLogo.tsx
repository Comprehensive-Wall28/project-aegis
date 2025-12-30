import React from 'react';

interface AegisLogoProps {
    size?: number;
    className?: string;
}

export const AegisLogo: React.FC<AegisLogoProps> = ({
    size = 32,
    className = ''
}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 40 40"
            fill="none"
            width={size}
            height={size}
            className={className}
        >
            {/* Simple geometric arrow icon - exactly like Arcana style */}

            {/* Back piece - darker blue */}
            <path
                d="M8 32 L8 14 L20 14"
                stroke="#1E3A8A"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* Front piece - brighter blue arrow */}
            <path
                d="M14 26 L32 8 M32 8 L32 20 M32 8 L20 8"
                stroke="#3B82F6"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
};

export default AegisLogo;
