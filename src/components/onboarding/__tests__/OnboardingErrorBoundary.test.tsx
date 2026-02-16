import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingErrorBoundary } from '../OnboardingErrorBoundary';
import { render } from '../../../test/test-utils';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('OnboardingErrorBoundary', () => {
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('error handling', () => {
    it('should catch and display errors', () => {
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered an error while setting up your experience/)).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should render children when no error occurs', () => {
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={false} />
        </OnboardingErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('should show retry button with remaining attempts', () => {
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      expect(screen.getByText('Try Again (3 attempts left)')).toBeInTheDocument();
    });

    it('should retry when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again (3 attempts left)');
      await user.click(retryButton);

      // After retry, it should try to render the component again
      // Since our component always throws, it should show the error again
      expect(screen.getByText('Try Again (2 attempts left)')).toBeInTheDocument();
    });

    it('should show start over button when max retries reached', async () => {
      const user = userEvent.setup();
      
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      // Click retry 3 times to exhaust attempts
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.getByText(/Try Again/);
        await user.click(retryButton);
      }

      expect(screen.getByText('Start Over')).toBeInTheDocument();
      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();
    });

    it('should reset error state when start over is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      // Exhaust retries
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.getByText(/Try Again/);
        await user.click(retryButton);
      }

      const startOverButton = screen.getByText('Start Over');
      await user.click(startOverButton);

      // Should show retry button again with full attempts
      expect(screen.getByText('Try Again (3 attempts left)')).toBeInTheDocument();
    });
  });

  describe('navigation options', () => {
    it('should provide go to home page option', () => {
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      expect(screen.getByText('Go to Home Page')).toBeInTheDocument();
    });

    it('should navigate to home when home button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock window.location
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      const homeButton = screen.getByText('Go to Home Page');
      await user.click(homeButton);

      expect(mockLocation.href).toBe('/');
    });
  });

  describe('custom fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;
      
      render(
        <OnboardingErrorBoundary fallback={customFallback} onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('development mode', () => {
    it('should show error details in development mode', () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not show error details in production mode', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      // Should have alert role for error message
      expect(screen.getByRole('alert')).toBeInTheDocument();
      
      // Buttons should be properly labeled
      const retryButton = screen.getByText('Try Again (3 attempts left)');
      expect(retryButton).toHaveAttribute('type', 'button');
      
      const homeButton = screen.getByText('Go to Home Page');
      expect(homeButton).toHaveAttribute('type', 'button');
    });

    it('should have proper heading structure', () => {
      render(
        <OnboardingErrorBoundary onError={mockOnError}>
          <ThrowError />
        </OnboardingErrorBoundary>
      );

      // Should have proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Something went wrong');
    });
  });
});