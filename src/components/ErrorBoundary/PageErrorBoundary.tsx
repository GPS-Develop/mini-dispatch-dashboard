"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '../Button/Button';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showHomeButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PageErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <PageErrorFallback 
          error={this.state.error!} 
          resetError={this.resetError}
          title={this.props.fallbackTitle}
          message={this.props.fallbackMessage}
          showHomeButton={this.props.showHomeButton}
        />
      );
    }

    return this.props.children;
  }
}

const PageErrorFallback: React.FC<{ 
  error: Error; 
  resetError: () => void;
  title?: string;
  message?: string;
  showHomeButton?: boolean;
}> = ({ error, resetError, title, message, showHomeButton = true }) => {
  const router = useRouter();
  
  return (
    <div className="page-container-md">
      <div className="card">
        <div className="error-boundary-content">
          <h2 className="heading-lg text-danger">
            {title || "Page Error"}
          </h2>
          <p className="text-muted error-boundary-description">
            {message || "An error occurred while loading this page. Please try again."}
          </p>
          <details className="error-boundary-details">
            <summary className="error-boundary-summary">
              Error details
            </summary>
            <pre className="error-boundary-error-text">
              {error.message}
            </pre>
          </details>
          <div className="button-group-horizontal">
            <Button
              onClick={resetError}
              variant="primary"
              aria-label="Try to reload the page"
            >
              Try Again
            </Button>
            {showHomeButton && (
              <Button
                onClick={() => router.push('/')}
                variant="secondary"
                aria-label="Go back to homepage"
              >
                Go Home
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageErrorBoundary;