import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import { WarningAmber as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class SocialErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Error caught by SocialErrorBoundary (${this.props.componentName || 'Unknown'}):`, error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Box
                    sx={{
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        height: '100%',
                        minHeight: 200,
                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.05),
                        borderRadius: '20px',
                        border: (theme) => `1px dashed ${alpha(theme.palette.error.main, 0.3)}`,
                    }}
                >
                    <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2, opacity: 0.8 }} />
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Something went wrong
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 300 }}>
                        {this.props.componentName ? `The ${this.props.componentName} component failed to render.` : 'An error occurred while rendering this component.'}
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={this.handleReset}
                        sx={{ borderRadius: '10px', textTransform: 'none' }}
                    >
                        Try Again
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}
