import {
    Box,
    Typography,
    Button,
    TextField,
    CircularProgress,
    InputAdornment,
    Link,
    alpha,
    useTheme
} from '@mui/material';
import {
    Lock as LockIcon,
    Person as PersonIcon,
    Email as EmailIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface RegisterFormProps {
    email: string;
    onEmailChange: (val: string) => void;
    username: string;
    onUsernameChange: (val: string) => void;
    password: string;
    onPasswordChange: (val: string) => void;
    loading: boolean;
    error: string;
    success: string;
    onToggleMode: () => void;
    openCount: number;
}

const fieldVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.15, ease: "easeIn" }
    }
} as const;

export function RegisterForm({
    email,
    onEmailChange,
    username,
    onUsernameChange,
    password,
    onPasswordChange,
    loading,
    error,
    success,
    onToggleMode,
    openCount
}: RegisterFormProps) {
    const theme = useTheme();

    return (
        <>
            <AnimatePresence initial={false} mode="sync" key={`register-animations-${openCount}`}>
                <motion.div
                    key="username-field"
                    variants={fieldVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    <TextField
                        fullWidth
                        label="Username"
                        value={username}
                        onChange={(e) => onUsernameChange(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment>,
                        }}
                    />
                </motion.div>
            </AnimatePresence>

            <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment>,
                }}
            />

            <TextField
                fullWidth
                label="Encryption Password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" /></InputAdornment>,
                }}
            />

            {(error || success) && (
                <Box sx={{ minHeight: 24 }}>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Typography variant="caption" sx={{ color: 'error.main', display: 'block', textAlign: 'center', fontWeight: 600 }}>
                                {error}
                            </Typography>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Box
                                sx={{
                                    py: 1,
                                    px: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                    textAlign: 'center'
                                }}
                            >
                                <Typography variant="caption" sx={{ color: 'success.main', display: 'block', fontWeight: 700 }}>
                                    {success}
                                </Typography>
                            </Box>
                        </motion.div>
                    )}
                </Box>
            )}

            <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{
                    py: 1.5,
                    fontWeight: 700,
                    borderRadius: 2.5,
                    mt: 1,
                }}
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Keys & Register'}
            </Button>

            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}>
                Already have a vault?
                <Link
                    component="button"
                    type="button"
                    onClick={onToggleMode}
                    sx={{ ml: 1, fontWeight: 700, textDecoration: 'none', color: 'primary.main' }}
                >
                    Login here
                </Link>
            </Typography>
        </>
    );
}
