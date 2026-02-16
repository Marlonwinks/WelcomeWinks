import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Mobile Error Boundary caught an error:', error, errorInfo);
    
    // Log mobile-specific error details
    const isMobile = window.innerWidth < 768;
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    console.error('Mobile Error Context:', {
      isMobile,
      isIOS,
      isAndroid,
      userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Force a page reload on mobile for critical errors
    if (window.innerWidth < 768) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isMobile = window.innerWidth < 768;
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isMobile 
                  ? "Something went wrong on mobile. This might be due to network issues or browser compatibility."
                  : "Something went wrong. Please try refreshing the page."
                }
              </AlertDescription>
            </Alert>
            
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold">Oops! Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                {isMobile 
                  ? "Mobile networks can sometimes cause issues. Try refreshing or switching to a different network."
                  : "We're sorry for the inconvenience. Please try again."
                }
              </p>
              
              <div className="space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isMobile ? 'Refresh Page' : 'Try Again'}
                </Button>
                
                {isMobile && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/'}
                    className="w-full"
                  >
                    Go to Home
                  </Button>
                )}
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MobileErrorBoundary;