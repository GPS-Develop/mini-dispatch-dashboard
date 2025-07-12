"use client";
import React from 'react';
import Button from '../Button/Button';

interface Props {
  children: React.ReactNode;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ModalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ModalErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-overlay" onClick={this.props.onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="heading-lg text-danger">Modal Error</h2>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                An error occurred in this modal. Please close and try again.
              </p>
              <details className="error-boundary-details">
                <summary className="error-boundary-summary">
                  Error details
                </summary>
                <pre className="error-boundary-error-text">
                  {this.state.error?.message}
                </pre>
              </details>
            </div>
            <div className="modal-footer">
              <div className="button-group-horizontal">
                <Button
                  onClick={this.resetError}
                  variant="secondary"
                  aria-label="Try to reset the modal"
                >
                  Try Again
                </Button>
                {this.props.onClose && (
                  <Button
                    onClick={this.props.onClose}
                    variant="primary"
                    aria-label="Close the modal"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModalErrorBoundary;