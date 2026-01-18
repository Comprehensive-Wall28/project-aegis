import {
    Box,
    Typography,
    Button,
    CircularProgress,
} from '@mui/material';
import {
    Fingerprint as FingerprintIcon,
} from '@mui/icons-material';

interface TwoFactorPromptProps {
    loading: boolean;
    onCancel: () => void;
}

export function TwoFactorPrompt({
    loading,
    onCancel
}: TwoFactorPromptProps) {
    return (
        <Box sx={{ textAlign: 'center', py: 2 }}>
            <FingerprintIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.8 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Two-Factor Authentication
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Please use your registered passkey to complete the login.
            </Typography>
            <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FingerprintIcon />}
                sx={{ py: 1.5, borderRadius: 2.5 }}
            >
                {loading ? 'Verifying...' : 'Tap Passkey'}
            </Button>
            <Button
                variant="text"
                onClick={onCancel}
                sx={{ mt: 2, color: 'text.secondary' }}
            >
                Cancel
            </Button>
        </Box>
    );
}
