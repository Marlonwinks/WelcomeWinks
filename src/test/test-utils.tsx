import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { LocationProvider } from '@/contexts/LocationProvider';
import { OnboardingProvider } from '@/contexts/OnboardingProvider';
import { NavigationProvider } from '@/contexts/NavigationProvider';
import { LocationData, OnboardingState } from '@/types/onboarding';

// Mock location data for testing
export const mockLocationData: LocationData = {
  latitude: 40.7128,
  longitude: -74.0060,
  city: 'New York, NY',
  address: 'New York, NY, USA',
  source: 'gps',
  accuracy: 100,
  timestamp: new Date('2024-01-01T12:00:00Z'),
  userConfirmed: false,
  error: null,
};

export const mockOnboardingState: OnboardingState = {
  hasCompletedOnboarding: false,
  currentStep: 'location',
  selectedGoal: null,
  locationData: mockLocationData,
  preferences: {
    skipLocationDetection: false,
    preferredGoal: null,
  },
  completedAt: null,
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialLocation?: Partial<LocationData>;
  initialOnboardingState?: Partial<OnboardingState>;
  queryClient?: QueryClient;
}

const AllTheProviders: React.FC<{
  children: React.ReactNode;
  initialLocation?: Partial<LocationData>;
  initialOnboardingState?: Partial<OnboardingState>;
  queryClient?: QueryClient;
}> = ({ 
  children, 
  initialLocation, 
  initialOnboardingState,
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  }),
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter 
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <NavigationProvider>
            <LocationProvider initialLocation={initialLocation}>
              <OnboardingProvider initialState={initialOnboardingState}>
                {children}
              </OnboardingProvider>
            </LocationProvider>
          </NavigationProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { 
    initialLocation, 
    initialOnboardingState, 
    queryClient,
    ...renderOptions 
  } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders
        initialLocation={initialLocation}
        initialOnboardingState={initialOnboardingState}
        queryClient={queryClient}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Mock functions for testing
export const mockGeolocationSuccess = (position: Partial<GeolocationPosition> = {}) => {
  const mockPosition: GeolocationPosition = {
    coords: {
      latitude: mockLocationData.latitude!,
      longitude: mockLocationData.longitude!,
      accuracy: mockLocationData.accuracy!,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
    ...position,
  };

  (navigator.geolocation.getCurrentPosition as any).mockImplementation(
    (success: PositionCallback) => {
      setTimeout(() => success(mockPosition), 100);
    }
  );
};

export const mockGeolocationError = (error: Partial<GeolocationPositionError> = {}) => {
  const mockError: GeolocationPositionError = {
    code: 1, // PERMISSION_DENIED
    message: 'User denied geolocation',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
    ...error,
  };

  (navigator.geolocation.getCurrentPosition as any).mockImplementation(
    (success: PositionCallback, error: PositionErrorCallback) => {
      setTimeout(() => error(mockError), 100);
    }
  );
};

export const mockFetchSuccess = (data: any) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
};

export const mockFetchError = (error: string = 'Network error') => {
  (global.fetch as any).mockRejectedValueOnce(new Error(error));
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  // Check for basic accessibility attributes
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    expect(button).toHaveAttribute('type');
  });

  const inputs = container.querySelectorAll('input');
  inputs.forEach(input => {
    if (input.type !== 'hidden') {
      expect(input).toHaveAccessibleName();
    }
  });

  const images = container.querySelectorAll('img');
  images.forEach(img => {
    expect(img).toHaveAttribute('alt');
  });
};

// Wait for async operations
export const waitForLoadingToFinish = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };