import {
    Box,
    Typography,
    IconButton,
    alpha,
    useTheme,
    Paper,
    Stack
} from '@mui/material';
import { Close as XIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthForm } from './useAuthForm';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { TwoFactorPrompt } from './TwoFactorPrompt';

interface AuthDialogProps {
    open: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

const MotionPaper = motion.create(Paper);

export function AuthDialog({ open, onClose, initialMode = 'login' }: AuthDialogProps) {
    const theme = useTheme();
    const { state, actions } = useAuthForm(open, initialMode, onClose);

    // Animation variants
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    } as const;

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 30 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: "spring",
                damping: 25,
                stiffness: 300
            }
        },
        exit: {
            opacity: 0,
            scale: 0.9,
            y: 30,
            transition: {
                duration: 0.2
            }
        }
    } as const;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            zIndex: theme.zIndex.modal
                        }}
                    />

                    {/* Modal Container */}
                    <Box
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: theme.zIndex.modal + 1,
                            pointerEvents: 'none',
                            p: 2
                        }}
                    >
                        {/* Animated Card */}
                        <MotionPaper
                            key="modal"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                pointerEvents: 'auto',
                                width: '100%',
                                maxWidth: 420,
                                borderRadius: 4,
                                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5)`,
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                            variant="solid"
                        >
                            {/* Close Button */}
                            <IconButton
                                onClick={onClose}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    right: 16,
                                    top: 16,
                                    color: 'text.secondary',
                                    zIndex: 10,
                                    '&:hover': {
                                        color: 'text.primary',
                                        bgcolor: alpha(theme.palette.action.hover, 0.1)
                                    }
                                }}
                            >
                                <XIcon fontSize="small" />
                            </IconButton>

                            <Box sx={{ p: 4 }}>
                                {/* Header */}
                                <Box sx={{ textAlign: 'center', mb: 3 }}>
                                    <Typography
                                        variant="h5"
                                        sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 1 }}
                                    >
                                        {state.isRegisterMode ? 'Create Your Vault' : 'Access Your Vault'}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary', fontWeight: 500, px: 2, lineHeight: 1.5 }}
                                    >
                                        {state.isRegisterMode
                                            ? 'Generate a new PQC identity. Your keys never leave this device.'
                                            : 'Enter your credentials to access your vault.'}
                                    </Typography>
                                </Box>

                                {/* Form Content */}
                                <Stack
                                    component="form"
                                    id={state.isRegisterMode ? 'register-form' : 'login-form'}
                                    method="post"
                                    action="#"
                                    data-1p-ignore="false"
                                    data-lpignore="false"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (state.show2FA) {
                                            actions.handleComplete2FA();
                                        } else {
                                            actions.handleAuth();
                                        }
                                    }}
                                    sx={{ gap: 2.5 }}
                                >
                                    {state.show2FA ? (
                                        <TwoFactorPrompt
                                            loading={state.loading}
                                            onCancel={() => actions.setShow2FA(false)}
                                        />
                                    ) : state.isRegisterMode ? (
                                        <RegisterForm
                                            email={state.email}
                                            onEmailChange={actions.setEmail}
                                            username={state.username}
                                            onUsernameChange={actions.setUsername}
                                            password={state.password}
                                            onPasswordChange={actions.setPassword}
                                            loading={state.loading}
                                            error={state.error}
                                            success={state.success}
                                            onToggleMode={actions.toggleMode}
                                            openCount={state.openCount}
                                        />
                                    ) : (
                                        <LoginForm
                                            email={state.email}
                                            onEmailChange={actions.setEmail}
                                            password={state.password}
                                            onPasswordChange={actions.setPassword}
                                            loading={state.loading}
                                            error={state.error}
                                            success={state.success}
                                            onToggleMode={actions.toggleMode}
                                        />
                                    )}
                                </Stack>
                            </Box>
                        </MotionPaper>
                    </Box>
                </>
            )}
        </AnimatePresence>
    );
}
