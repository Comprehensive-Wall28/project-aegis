import { Component, type ReactNode } from 'react';
import { WidgetErrorFallback } from './WidgetErrorFallback';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('WidgetErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // Render default fallback with styling matching dashboard cards
            return <WidgetErrorFallback onRetry={this.handleRetry} error={this.state.error} />;
        }

        return this.props.children;
    }
}
