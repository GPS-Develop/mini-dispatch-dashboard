"use client";
import React from 'react';
import Button from '../Button/Button';

interface Props {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class FormErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('FormErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert-error">
          <div className="error-boundary-content">
            <h4 className="heading-sm text-danger">Form Error</h4>
            <p className="text-muted">
              There was an error with the form. Please refresh and try again.
            </p>
            <details className="error-boundary-details">
              <summary className="error-boundary-summary">
                Error details
              </summary>
              <pre className="error-boundary-error-text">
                {this.state.error?.message}
              </pre>
            </details>
            <Button
              onClick={this.resetError}
              variant="secondary"
              aria-label="Try to reset the form"
            >
              Reset Form
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FormErrorBoundary;