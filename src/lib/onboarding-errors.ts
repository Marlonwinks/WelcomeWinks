/**
 * Comprehensive error handling utilities for the onboarding flow
 */

export interface OnboardingError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  timestamp: Date;
}

export const ERROR_CODES = {
  // Location errors
  LOCATION_PERMISSION_DENIED: 'LOCATION_PERMISSION_DENIED',
  LOCATION_UNAVAILABLE: 'LOCATION_UNAVAILABLE',
  LOCATION_TIMEOUT: 'LOCATION_TIMEOUT',
  LOCATION_NETWORK_ERROR: 'LOCATION_NETWORK_ERROR',
  GEOCODING_FAILED: 'GEOCODING_FAILED',
  
  // API errors
  GOOGLE_PLACES_API_ERROR: 'GOOGLE_PLACES_API_ERROR',
  GOOGLE_PLACES_QUOTA_EXCEEDED: 'GOOGLE_PLACES_QUOTA_EXCEEDED',
  GOOGLE_PLACES_INVALID_REQUEST: 'GOOGLE_PLACES_INVALID_REQUEST',
  
  // Network errors
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_SERVER_ERROR: 'NETWORK_SERVER_ERROR',
  
  // Component errors
  COMPONENT_RENDER_ERROR: 'COMPONENT_RENDER_ERROR',
  COMPONENT_STATE_ERROR: 'COMPONENT_STATE_ERROR',
  
  // Storage errors
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_ACCESS_DENIED: 'STORAGE_ACCESS_DENIED',
  
  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

const ERROR_DEFINITIONS: Record<ErrorCode, Omit<OnboardingError, 'timestamp' | 'context'>> = {
  [ERROR_CODES.LOCATION_PERMISSION_DENIED]: {
    code: ERROR_CODES.LOCATION_PERMISSION_DENIED,
    message: 'User denied location access permission',
    userMessage: 'Location access was denied. Please enable location permissions or enter your location manually.',
    retryable: false,
    severity: 'medium',
  },
  [ERROR_CODES.LOCATION_UNAVAILABLE]: {
    code: ERROR_CODES.LOCATION_UNAVAILABLE,
    message: 'Location information is unavailable',
    userMessage: 'Your location could not be determined. Please check your device settings or enter your location manually.',
    retryable: true,
    severity: 'medium',
  },
  [ERROR_CODES.LOCATION_TIMEOUT]: {
    code: ERROR_CODES.LOCATION_TIMEOUT,
    message: 'Location request timed out',
    userMessage: 'Location detection is taking too long. Please try again or enter your location manually.',
    retryable: true,
    severity: 'low',
  },
  [ERROR_CODES.LOCATION_NETWORK_ERROR]: {
    code: ERROR_CODES.LOCATION_NETWORK_ERROR,
    message: 'Network error during location detection',
    userMessage: 'Network connection issue. Please check your internet connection and try again.',
    retryable: true,
    severity: 'medium',
  },
  [ERROR_CODES.GEOCODING_FAILED]: {
    code: ERROR_CODES.GEOCODING_FAILED,
    message: 'Failed to convert coordinates to address',
    userMessage: 'We found your location but couldn\'t get the address. You can still continue.',
    retryable: true,
    severity: 'low',
  },
  [ERROR_CODES.GOOGLE_PLACES_API_ERROR]: {
    code: ERROR_CODES.GOOGLE_PLACES_API_ERROR,
    message: 'Google Places API error',
    userMessage: 'Location search is temporarily unavailable. Please try again later.',
    retryable: true,
    severity: 'medium',
  },
  [ERROR_CODES.GOOGLE_PLACES_QUOTA_EXCEEDED]: {
    code: ERROR_CODES.GOOGLE_PLACES_QUOTA_EXCEEDED,
    message: 'Google Places API quota exceeded',
    userMessage: 'Location search is temporarily limited. Please try again later.',
    retryable: false,
    severity: 'high',
  },
  [ERROR_CODES.GOOGLE_PLACES_INVALID_REQUEST]: {
    code: ERROR_CODES.GOOGLE_PLACES_INVALID_REQUEST,
    message: 'Invalid request to Google Places API',
    userMessage: 'There was an issue with your search. Please try a different location.',
    retryable: false,
    severity: 'low',
  },
  [ERROR_CODES.NETWORK_OFFLINE]: {
    code: ERROR_CODES.NETWORK_OFFLINE,
    message: 'Device is offline',
    userMessage: 'You appear to be offline. Please check your internet connection.',
    retryable: true,
    severity: 'high',
  },
  [ERROR_CODES.NETWORK_TIMEOUT]: {
    code: ERROR_CODES.NETWORK_TIMEOUT,
    message: 'Network request timed out',
    userMessage: 'The request is taking too long. Please check your connection and try again.',
    retryable: true,
    severity: 'medium',
  },
  [ERROR_CODES.NETWORK_SERVER_ERROR]: {
    code: ERROR_CODES.NETWORK_SERVER_ERROR,
    message: 'Server error occurred',
    userMessage: 'A server error occurred. Please try again in a few moments.',
    retryable: true,
    severity: 'high',
  },
  [ERROR_CODES.COMPONENT_RENDER_ERROR]: {
    code: ERROR_CODES.COMPONENT_RENDER_ERROR,
    message: 'Component failed to render',
    userMessage: 'Something went wrong loading this page. Please refresh and try again.',
    retryable: true,
    severity: 'high',
  },
  [ERROR_CODES.COMPONENT_STATE_ERROR]: {
    code: ERROR_CODES.COMPONENT_STATE_ERROR,
    message: 'Component state error',
    userMessage: 'An unexpected error occurred. Please refresh the page.',
    retryable: true,
    severity: 'medium',
  },
  [ERROR_CODES.STORAGE_QUOTA_EXCEEDED]: {
    code: ERROR_CODES.STORAGE_QUOTA_EXCEEDED,
    message: 'Browser storage quota exceeded',
    userMessage: 'Your browser storage is full. Please clear some data and try again.',
    retryable: false,
    severity: 'medium',
  },
  [ERROR_CODES.STORAGE_ACCESS_DENIED]: {
    code: ERROR_CODES.STORAGE_ACCESS_DENIED,
    message: 'Browser storage access denied',
    userMessage: 'Cannot save your preferences. Please check your browser settings.',
    retryable: false,
    severity: 'low',
  },
  [ERROR_CODES.UNKNOWN_ERROR]: {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'An unknown error occurred',
    userMessage: 'Something unexpected happened. Please try again.',
    retryable: true,
    severity: 'medium',
  },
};

/**
 * Creates a standardized onboarding error
 */
export const createOnboardingError = (
  code: ErrorCode,
  context?: Record<string, any>,
  customMessage?: string
): OnboardingError => {
  const definition = ERROR_DEFINITIONS[code];
  
  return {
    ...definition,
    userMessage: customMessage || definition.userMessage,
    context,
    timestamp: new Date(),
  };
};

/**
 * Maps browser geolocation errors to onboarding errors
 */
export const mapGeolocationError = (error: GeolocationPositionError): OnboardingError => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return createOnboardingError(ERROR_CODES.LOCATION_PERMISSION_DENIED, { 
        originalError: error.message 
      });
    case error.POSITION_UNAVAILABLE:
      return createOnboardingError(ERROR_CODES.LOCATION_UNAVAILABLE, { 
        originalError: error.message 
      });
    case error.TIMEOUT:
      return createOnboardingError(ERROR_CODES.LOCATION_TIMEOUT, { 
        originalError: error.message 
      });
    default:
      return createOnboardingError(ERROR_CODES.UNKNOWN_ERROR, { 
        originalError: error.message,
        originalCode: error.code 
      });
  }
};

/**
 * Maps Google Places API errors to onboarding errors
 */
export const mapGooglePlacesError = (status: google.maps.places.PlacesServiceStatus): OnboardingError => {
  switch (status) {
    case google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT:
      return createOnboardingError(ERROR_CODES.GOOGLE_PLACES_QUOTA_EXCEEDED);
    case google.maps.places.PlacesServiceStatus.REQUEST_DENIED:
      return createOnboardingError(ERROR_CODES.GOOGLE_PLACES_INVALID_REQUEST);
    case google.maps.places.PlacesServiceStatus.INVALID_REQUEST:
      return createOnboardingError(ERROR_CODES.GOOGLE_PLACES_INVALID_REQUEST);
    default:
      return createOnboardingError(ERROR_CODES.GOOGLE_PLACES_API_ERROR, { 
        status 
      });
  }
};

/**
 * Maps network errors to onboarding errors
 */
export const mapNetworkError = (error: Error): OnboardingError => {
  if (error.name === 'AbortError') {
    return createOnboardingError(ERROR_CODES.NETWORK_TIMEOUT);
  }
  
  if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
    return createOnboardingError(ERROR_CODES.NETWORK_OFFLINE);
  }
  
  return createOnboardingError(ERROR_CODES.NETWORK_SERVER_ERROR, { 
    originalError: error.message 
  });
};

/**
 * Determines if an error should trigger a retry
 */
export const shouldRetry = (error: OnboardingError, currentRetryCount: number, maxRetries: number): boolean => {
  return error.retryable && currentRetryCount < maxRetries && error.severity !== 'critical';
};

/**
 * Calculates retry delay with exponential backoff
 */
export const calculateRetryDelay = (retryCount: number, baseDelay = 1000): number => {
  return Math.min(baseDelay * Math.pow(2, retryCount), 10000); // Max 10 seconds
};

/**
 * Logs error for debugging and monitoring
 */
export const logOnboardingError = (error: OnboardingError): void => {
  const logLevel = error.severity === 'critical' || error.severity === 'high' ? 'error' : 'warn';
  
  console[logLevel]('Onboarding Error:', {
    code: error.code,
    message: error.message,
    severity: error.severity,
    retryable: error.retryable,
    context: error.context,
    timestamp: error.timestamp,
  });
  
  // In production, you might want to send this to an error reporting service
  // Example: sendToErrorReporting(error);
};

/**
 * Creates user-friendly error recovery suggestions
 */
export const getErrorRecoveryActions = (error: OnboardingError): Array<{
  label: string;
  action: string;
  primary?: boolean;
}> => {
  const actions = [];
  
  switch (error.code) {
    case ERROR_CODES.LOCATION_PERMISSION_DENIED:
      actions.push(
        { label: 'Enter Location Manually', action: 'manual-entry', primary: true },
        { label: 'Enable Location in Browser', action: 'enable-location' }
      );
      break;
      
    case ERROR_CODES.LOCATION_TIMEOUT:
    case ERROR_CODES.LOCATION_UNAVAILABLE:
      actions.push(
        { label: 'Try Again', action: 'retry', primary: true },
        { label: 'Enter Location Manually', action: 'manual-entry' }
      );
      break;
      
    case ERROR_CODES.NETWORK_OFFLINE:
      actions.push(
        { label: 'Check Connection', action: 'check-connection', primary: true },
        { label: 'Try Again', action: 'retry' }
      );
      break;
      
    case ERROR_CODES.GOOGLE_PLACES_QUOTA_EXCEEDED:
      actions.push(
        { label: 'Try Later', action: 'try-later', primary: true },
        { label: 'Enter Location Manually', action: 'manual-entry' }
      );
      break;
      
    default:
      if (error.retryable) {
        actions.push(
          { label: 'Try Again', action: 'retry', primary: true },
          { label: 'Refresh Page', action: 'refresh' }
        );
      } else {
        actions.push(
          { label: 'Refresh Page', action: 'refresh', primary: true },
          { label: 'Go to Home', action: 'go-home' }
        );
      }
  }
  
  return actions;
};

/**
 * Hook for handling onboarding errors consistently
 */
export const useOnboardingErrorHandler = () => {
  const handleError = (error: unknown, context?: Record<string, any>) => {
    let onboardingError: OnboardingError;
    
    if (error instanceof Error) {
      // Try to map known error types
      if (error.name === 'GeolocationPositionError') {
        onboardingError = mapGeolocationError(error as any);
      } else if (error.message.includes('Places')) {
        onboardingError = mapNetworkError(error);
      } else {
        onboardingError = createOnboardingError(ERROR_CODES.UNKNOWN_ERROR, {
          ...context,
          originalError: error.message,
          stack: error.stack,
        });
      }
    } else {
      onboardingError = createOnboardingError(ERROR_CODES.UNKNOWN_ERROR, {
        ...context,
        originalError: String(error),
      });
    }
    
    logOnboardingError(onboardingError);
    return onboardingError;
  };
  
  return { handleError };
};