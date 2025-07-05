import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error!} 
          resetError={this.resetError} 
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="loading-container">
    <div className="page-container-md">
      <div className="card">
        <div className="error-boundary-content">
          <h2 className="heading-lg text-error">Something went wrong</h2>
          <p className="text-muted error-boundary-description">
            An unexpected error occurred. Please try again.
          </p>
          <details className="error-boundary-details">
            <summary className="error-boundary-summary">
              Error details
            </summary>
            <pre className="error-boundary-error-text">
              {error.message}
            </pre>
          </details>
          <button
            onClick={resetError}
            className="btn-primary"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default ErrorBoundary; 