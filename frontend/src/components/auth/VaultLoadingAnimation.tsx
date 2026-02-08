import { Box, alpha, useTheme, Typography } from '@mui/material';
import { motion, type Easing } from 'framer-motion';

interface VaultLoadingAnimationProps {
    text?: string;
    size?: number;
}

const easeLinear: Easing = 'linear';
const easeInOut: Easing = 'easeInOut';

/**
 * A unique vault-themed loading animation featuring:
 * - Concentric rotating rings that simulate a vault lock mechanism
 * - Animated lock pins that "click" into place sequentially
 * - A pulsing core that represents the vault's heart
 */
export function VaultLoadingAnimation({
    text = 'Unlocking...',
    size = 24
}: VaultLoadingAnimationProps) {
    const theme = useTheme();
    const primaryColor = theme.palette.text.secondary;
    const accentColor = theme.palette.primary.main;

    const ringSize = size;
    const ringThickness = size * 0.08;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
                sx={{
                    position: 'relative',
                    width: ringSize,
                    height: ringSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {/* Outer ring with notches */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: easeLinear
                    }}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: `${ringThickness}px solid transparent`,
                        borderTopColor: primaryColor,
                        borderRightColor: alpha(primaryColor, 0.3),
                        boxSizing: 'border-box',
                    }}
                />

                {/* Middle ring - counter-rotating */}
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: easeLinear
                    }}
                    style={{
                        position: 'absolute',
                        width: '70%',
                        height: '70%',
                        borderRadius: '50%',
                        border: `${ringThickness}px solid transparent`,
                        borderTopColor: alpha(accentColor, 0.7),
                        borderLeftColor: alpha(accentColor, 0.3),
                        boxSizing: 'border-box',
                    }}
                />

                {/* Inner ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: easeLinear
                    }}
                    style={{
                        position: 'absolute',
                        width: '40%',
                        height: '40%',
                        borderRadius: '50%',
                        border: `${ringThickness * 0.8}px solid transparent`,
                        borderBottomColor: primaryColor,
                        borderRightColor: alpha(primaryColor, 0.5),
                        boxSizing: 'border-box',
                    }}
                />

                {/* Lock pins - 4 pins positioned around the center */}
                {[0, 1, 2, 3].map((i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scaleY: [1, 0.3, 1],
                            opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: easeInOut
                        }}
                        style={{
                            position: 'absolute',
                            width: ringThickness * 0.6,
                            height: ringSize * 0.15,
                            backgroundColor: accentColor,
                            borderRadius: ringThickness * 0.3,
                            transformOrigin: 'center',
                            transform: `rotate(${i * 90}deg) translateY(${ringSize * 0.16}px)`,
                            boxShadow: `0 0 ${ringSize * 0.1}px ${alpha(accentColor, 0.5)}`,
                        }}
                    />
                ))}

                {/* Central core - pulsing */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 1, 0.6],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: easeInOut
                    }}
                    style={{
                        position: 'absolute',
                        width: ringSize * 0.15,
                        height: ringSize * 0.15,
                        borderRadius: '50%',
                        backgroundColor: accentColor,
                        boxShadow: `0 0 ${ringSize * 0.2}px ${alpha(accentColor, 0.6)}`,
                    }}
                />
            </Box>

            {/* Animated text with staggered letter opacity */}
            <Typography
                variant="body1"
                fontWeight={800}
                sx={{
                    color: 'text.secondary',
                    letterSpacing: '0.02em',
                    display: 'flex',
                    overflow: 'hidden'
                }}
            >
                {text.split('').map((char, i) => (
                    <motion.span
                        key={i}
                        animate={{
                            opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.05,
                            ease: easeInOut
                        }}
                        style={{ display: 'inline-block', whiteSpace: 'pre' }}
                    >
                        {char}
                    </motion.span>
                ))}
            </Typography>
        </Box>
    );
}
