import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createOnboardingError,
  mapGeolocationError,
  mapGooglePlacesError,
  mapNetworkError,
  shouldRetry,
  calculateRetryDelay,
  getErrorRecoveryActions,
  useOnboardingErrorHandler,
  ERROR_CODES,
} from '../onboarding-errors';

describe('onboarding-errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOnboardingError', () => {
    it('should create a standardized error object', () => {
      const error = createOnboardingError(ERROR_CODES.LOCATION_TIMEOUT);
      
      expect(error).toMatchObject({
        code: ERROR_CODES.LOCATION_TIMEOUT,
        message: 'Location request timed out',
        userMessage: 'Location detection is taking too long. Please try again or enter your location manually.',
        retryable: true,
        severity: 'low',
        timestamp: expect.any(Date),
      });
    });

    it('should accept custom context and message', () => {
      const context = { userId: '123', attempt: 2 };
      const customMessage = 'Custom error message';
      
      const error = createOnboardingError(
        ERROR_CODES.LOCATION_TIMEOUT,
        context,
        customMessage
      );
      
      expect(error.context).toEqual(context);
      expect(error.userMessage).toBe(customMessage);
    });
  });

  describe('mapGeolocationError', () => {
    it('should map PERMISSION_DENIED error', () => {
      const geolocationError = {
        code: 1,
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError;

      const error = mapGeolocationError(geolocationError);
      
      expect(error.code).toBe(ERROR_CODES.LOCATION_PERMISSION_DENIED);
      expect(error.retryable).toBe(false);
    });

    it('should map POSITION_UNAVAILABLE error', () => {
      const geolocationError = {
        code: 2,
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError;

      const error = mapGeolocationError(geolocationError);
      
      expect(error.code).toBe(ERROR_CODES.LOCATION_UNAVAILABLE);
      expect(error.retryable).toBe(true);
    });

    it('should map TIMEOUT error', () => {
      const geolocationError = {
        code: 3,
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError;

      const error = mapGeolocationError(geolocationError);
      
      expect(error.code).toBe(ERROR_CODES.LOCATION_TIMEOUT);
      expect(error.retryable).toBe(true);
    });

    it('should map unknown error codes', () => {
      const geolocationError = {
        code: 999,
        message: 'Unknown error',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError;

      const error = mapGeolocationError(geolocationError);
      
      expect(error.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
    });
  });

  describe('mapGooglePlacesError', () => {
    it('should map OVER_QUERY_LIMIT status', () => {
      const error = mapGooglePlacesError('OVER_QUERY_LIMIT' as any);
      
      expect(error.code).toBe(ERROR_CODES.GOOGLE_PLACES_QUOTA_EXCEEDED);
      expect(error.retryable).toBe(false);
    });

    it('should map REQUEST_DENIED status', () => {
      const error = mapGooglePlacesError('REQUEST_DENIED' as any);
      
      expect(error.code).toBe(ERROR_CODES.GOOGLE_PLACES_INVALID_REQUEST);
      expect(error.retryable).toBe(false);
    });

    it('should map unknown status to generic API error', () => {
      const error = mapGooglePlacesError('UNKNOWN_STATUS' as any);
      
      expect(error.code).toBe(ERROR_CODES.GOOGLE_PLACES_API_ERROR);
    });
  });

  describe('mapNetworkError', () => {
    it('should map AbortError to timeout', () => {
      const networkError = new Error('Request aborted');
      networkError.name = 'AbortError';
      
      const error = mapNetworkError(networkError);
      
      expect(error.code).toBe(ERROR_CODES.NETWORK_TIMEOUT);
    });

    it('should map fetch errors to offline', () => {
      const networkError = new Error('Failed to fetch');
      
      const error = mapNetworkError(networkError);
      
      expect(error.code).toBe(ERROR_CODES.NETWORK_OFFLINE);
    });

    it('should map other errors to server error', () => {
      const networkError = new Error('Internal server error');
      
      const error = mapNetworkError(networkError);
      
      expect(error.code).toBe(ERROR_CODES.NETWORK_SERVER_ERROR);
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retryable errors within retry limit', () => {
      const error = createOnboardingError(ERROR_CODES.LOCATION_TIMEOUT);
      
      expect(shouldRetry(error, 1, 3)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = createOnboardingError(ERROR_CODES.LOCATION_PERMISSION_DENIED);
      
      expect(shouldRetry(error, 1, 3)).toBe(false);
    });

    it('should return false when retry limit is reached', () => {
      const error = createOnboardingError(ERROR_CODES.LOCATION_TIMEOUT);
      
      expect(shouldRetry(error, 3, 3)).toBe(false);
    });

    it('should return false for critical errors', () => {
      const error = {
        ...createOnboardingError(ERROR_CODES.LOCATION_TIMEOUT),
        severity: 'critical' as const,
      };
      
      expect(shouldRetry(error, 1, 3)).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      expect(calculateRetryDelay(0)).toBe(1000);
      expect(calculateRetryDelay(1)).toBe(2000);
      expect(calculateRetryDelay(2)).toBe(4000);
      expect(calculateRetryDelay(3)).toBe(8000);
    });

    it('should cap delay at maximum', () => {
      expect(calculateRetryDelay(10)).toBe(10000);
    });

    it('should accept custom base delay', () => {
      expect(calculateRetryDelay(1, 500)).toBe(1000);
    });
  });

  describe('getErrorRecoveryActions', () => {
    it('should return appropriate actions for permission denied', () => {
      const error = createOnboardingError(ERROR_CODES.LOCATION_PERMISSION_DENIED);
      const actions = getErrorRecoveryActions(error);
      
      expect(actions).toContainEqual({
        label: 'Enter Location Manually',
        action: 'manual-entry',
        primary: true,
      });
      expect(actions).toContainEqual({
        label: 'Enable Location in Browser',
        action: 'enable-location',
      });
    });

    it('should return retry actions for retryable errors', () => {
      const error = createOnboardingError(ERROR_CODES.LOCATION_TIMEOUT);
      const actions = getErrorRecoveryActions(error);
      
      expect(actions).toContainEqual({
        label: 'Try Again',
        action: 'retry',
        primary: true,
      });
    });

    it('should return refresh actions for non-retryable errors', () => {
      const error = createOnboardingError(ERROR_CODES.GOOGLE_PLACES_QUOTA_EXCEEDED);
      const actions = getErrorRecoveryActions(error);
      
      expect(actions).toContainEqual({
        label: 'Try Later',
        action: 'try-later',
        primary: true,
      });
    });
  });

  describe('useOnboardingErrorHandler', () => {
    it('should handle Error objects', () => {
      const { handleError } = useOnboardingErrorHandler();
      const error = new Error('Test error');
      
      const onboardingError = handleError(error);
      
      expect(onboardingError.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(onboardingError.context?.originalError).toBe('Test error');
    });

    it('should handle non-Error objects', () => {
      const { handleError } = useOnboardingErrorHandler();
      const error = 'String error';
      
      const onboardingError = handleError(error);
      
      expect(onboardingError.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(onboardingError.context?.originalError).toBe('String error');
    });

    it('should include custom context', () => {
      const { handleError } = useOnboardingErrorHandler();
      const error = new Error('Test error');
      const context = { component: 'TestComponent' };
      
      const onboardingError = handleError(error, context);
      
      expect(onboardingError.context).toMatchObject(context);
    });
  });
});