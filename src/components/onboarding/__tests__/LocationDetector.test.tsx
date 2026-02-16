import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationDetector } from '../LocationDetector';
import { render, mockLocationData, mockGeolocationSuccess, mockGeolocationError, checkAccessibility } from '../../../test/test-utils';

// Mock the hooks
vi.mock('../../../hooks/useGeolocation', () => ({
  useGeolocation: vi.fn(),
}));

vi.mock('../../../hooks/usePlacesAutocomplete', () => ({
  usePlacesAutocomplete: vi.fn(),
}));

vi.mock('../../../lib/accessibility', () => ({
  announceToScreenReader: vi.fn(),
  handleKeyboardNavigation: vi.fn(),
  generateId: vi.fn((prefix) => `${prefix}-test-id`),
}));

import { useGeolocation } from '../../../hooks/useGeolocation';
import { usePlacesAutocomplete } from '../../../hooks/usePlacesAutocomplete';

const mockUseGeolocation = useGeolocation as any;
const mockUsePlacesAutocomplete = usePlacesAutocomplete as any;

describe('LocationDetector', () => {
  const mockOnLocationDetected = vi.fn();
  const mockOnLocationError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseGeolocation.mockReturnValue({
      location: { ...mockLocationData, error: null },
      loading: false,
      confirmLocation: vi.fn(),
      updateManualLocation: vi.fn(),
      retryLocationDetection: vi.fn(),
      canRetry: false,
      retryCount: 0,
      maxRetries: 3,
      lastError: null,
    });

    mockUsePlacesAutocomplete.mockReturnValue({
      suggestions: [],
      loading: false,
      searchPlaces: vi.fn(),
      clearSuggestions: vi.fn(),
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when detecting location', () => {
      mockUseGeolocation.mockReturnValue({
        location: mockLocationData,
        loading: true,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      expect(screen.getByText('Detecting Your Location')).toBeInTheDocument();
      expect(screen.getByText('This may take a few seconds...')).toBeInTheDocument();
    });

    it('should be accessible during loading', async () => {
      mockUseGeolocation.mockReturnValue({
        location: mockLocationData,
        loading: true,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
      });

      const { container } = render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      await checkAccessibility(container);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('successful location detection', () => {
    it('should display detected location', () => {
      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      expect(screen.getByText('Location Detected')).toBeInTheDocument();
      expect(screen.getByText(mockLocationData.city!)).toBeInTheDocument();
      expect(screen.getByText('Yes, This is Correct')).toBeInTheDocument();
    });

    it('should show location metadata', () => {
      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      expect(screen.getByText('GPS')).toBeInTheDocument();
      expect(screen.getByText('High Accuracy')).toBeInTheDocument();
      expect(screen.getByText('Accuracy: ±100m')).toBeInTheDocument();
    });

    it('should call onLocationDetected when location is confirmed', async () => {
      const user = userEvent.setup();
      const mockConfirmLocation = vi.fn();
      
      mockUseGeolocation.mockReturnValue({
        location: mockLocationData,
        loading: false,
        confirmLocation: mockConfirmLocation,
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      const confirmButton = screen.getByText('Yes, This is Correct');
      await user.click(confirmButton);

      expect(mockConfirmLocation).toHaveBeenCalled();
    });

    it('should be accessible when location is detected', async () => {
      const { container } = render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      await checkAccessibility(container);
      expect(screen.getByRole('region', { name: /location confirmation/i })).toBeInTheDocument();
    });
  });

  describe('location detection errors', () => {
    it('should display error message', () => {
      const errorLocation = {
        ...mockLocationData,
        error: 'Location access denied',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
        canRetry: false,
        retryCount: 0,
        maxRetries: 3,
        lastError: {
          code: 'LOCATION_PERMISSION_DENIED',
          message: 'Location access denied',
          retryable: false,
        },
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      expect(screen.getByText('Location Detection Failed')).toBeInTheDocument();
      expect(screen.getByText('Location access denied')).toBeInTheDocument();
    });

    it('should show retry button for retryable errors', () => {
      const errorLocation = {
        ...mockLocationData,
        error: 'Location request timed out',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
        canRetry: true,
        retryCount: 1,
        maxRetries: 3,
        lastError: {
          code: 'LOCATION_TIMEOUT',
          message: 'Location request timed out',
          retryable: true,
        },
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      expect(screen.getByText('Try Again (2 left)')).toBeInTheDocument();
      expect(screen.getByText('Attempt 1 of 3')).toBeInTheDocument();
    });

    it('should not show retry button for non-retryable errors', () => {
      const errorLocation = {
        ...mockLocationData,
        error: 'Location access denied',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
        canRetry: false,
        retryCount: 0,
        maxRetries: 3,
        lastError: {
          code: 'LOCATION_PERMISSION_DENIED',
          message: 'Location access denied',
          retryable: false,
        },
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();
      expect(screen.getByText('Enter Location Manually')).toBeInTheDocument();
    });

    it('should call onLocationError when error occurs', () => {
      const errorLocation = {
        ...mockLocationData,
        error: 'Location access denied',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      expect(mockOnLocationError).toHaveBeenCalledWith('Location access denied');
    });
  });

  describe('manual location entry', () => {
    it('should show manual entry form when requested', async () => {
      const user = userEvent.setup();
      const errorLocation = {
        ...mockLocationData,
        error: 'Location access denied',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      const manualEntryButton = screen.getByText('Enter Location Manually');
      await user.click(manualEntryButton);

      expect(screen.getByPlaceholderText('Enter your city or address...')).toBeInTheDocument();
    });

    it('should search for places when typing', async () => {
      const user = userEvent.setup();
      const mockSearchPlaces = vi.fn();
      
      mockUsePlacesAutocomplete.mockReturnValue({
        suggestions: [],
        loading: false,
        searchPlaces: mockSearchPlaces,
        clearSuggestions: vi.fn(),
      });

      const errorLocation = {
        ...mockLocationData,
        error: 'Location access denied',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      const manualEntryButton = screen.getByText('Enter Location Manually');
      await user.click(manualEntryButton);

      const searchInput = screen.getByPlaceholderText('Enter your city or address...');
      await user.type(searchInput, 'New York');

      expect(mockSearchPlaces).toHaveBeenCalledWith('New York');
    });

    it('should display place suggestions', async () => {
      const user = userEvent.setup();
      const mockSuggestions = [
        {
          name: 'New York',
          formatted_address: 'New York, NY, USA',
          place_id: 'place1',
          geometry: {
            location: {
              lat: () => 40.7128,
              lng: () => -74.0060,
            },
          },
        },
      ];

      mockUsePlacesAutocomplete.mockReturnValue({
        suggestions: mockSuggestions,
        loading: false,
        searchPlaces: vi.fn(),
        clearSuggestions: vi.fn(),
      });

      const errorLocation = {
        ...mockLocationData,
        error: 'Location access denied',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      const manualEntryButton = screen.getByText('Enter Location Manually');
      await user.click(manualEntryButton);

      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('New York, NY, USA')).toBeInTheDocument();
    });

    it('should handle place selection', async () => {
      const user = userEvent.setup();
      const mockUpdateManualLocation = vi.fn();
      const mockSuggestions = [
        {
          name: 'New York',
          formatted_address: 'New York, NY, USA',
          place_id: 'place1',
          geometry: {
            location: {
              lat: () => 40.7128,
              lng: () => -74.0060,
            },
          },
        },
      ];

      mockUsePlacesAutocomplete.mockReturnValue({
        suggestions: mockSuggestions,
        loading: false,
        searchPlaces: vi.fn(),
        clearSuggestions: vi.fn(),
      });

      const errorLocation = {
        ...mockLocationData,
        error: 'Location access denied',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: mockUpdateManualLocation,
        retryLocationDetection: vi.fn(),
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      const manualEntryButton = screen.getByText('Enter Location Manually');
      await user.click(manualEntryButton);

      const suggestionButton = screen.getByText('New York');
      await user.click(suggestionButton);

      expect(mockUpdateManualLocation).toHaveBeenCalledWith({
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        address: 'New York, NY, USA',
        source: 'manual',
        accuracy: null,
        userConfirmed: false,
        error: null,
      });
    });
  });

  describe('keyboard navigation', () => {
    it('should handle keyboard navigation in suggestions', async () => {
      const user = userEvent.setup();
      const mockSuggestions = [
        {
          name: 'New York',
          formatted_address: 'New York, NY, USA',
          place_id: 'place1',
          geometry: {
            location: {
              lat: () => 40.7128,
              lng: () => -74.0060,
            },
          },
        },
        {
          name: 'Newark',
          formatted_address: 'Newark, NJ, USA',
          place_id: 'place2',
          geometry: {
            location: {
              lat: () => 40.7357,
              lng: () => -74.1724,
            },
          },
        },
      ];

      mockUsePlacesAutocomplete.mockReturnValue({
        suggestions: mockSuggestions,
        loading: false,
        searchPlaces: vi.fn(),
        clearSuggestions: vi.fn(),
      });

      const errorLocation = {
        ...mockLocationData,
        error: 'Location access denied',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
      });

      render(
        <LocationDetector
          onLocationDetected={mockOnLocationDetected}
          onLocationError={mockOnLocationError}
        />
      );

      const manualEntryButton = screen.getByText('Enter Location Manually');
      await user.click(manualEntryButton);

      const searchInput = screen.getByPlaceholderText('Enter your city or address...');
      
      // Test arrow key navigation
      await user.type(searchInput, '{arrowdown}');
      await user.type(searchInput, '{arrowdown}');
      await user.type(searchInput, '{enter}');

      // The handleKeyboardNavigation mock should have been called
      expect(vi.mocked(require('../../../lib/accessibility').handleKeyboardNavigation)).toHaveBeenCalled();
    });
  });
});