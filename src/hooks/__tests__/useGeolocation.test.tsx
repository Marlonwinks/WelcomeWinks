import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';
import { mockGeolocationSuccess, mockGeolocationError, mockFetchSuccess, mockFetchError } from '../../test/test-utils';

// Mock the performance cache
vi.mock('../../lib/performance', () => ({
  performanceCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful geolocation', () => {
    it('should detect location using GPS', async () => {
      mockGeolocationSuccess();
      mockFetchSuccess({
        results: [{
          formatted_address: 'New York, NY, USA'
        }]
      });

      const { result } = renderHook(() => useGeolocation());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.location).toMatchObject({
        latitude: 40.7128,
        longitude: -74.0060,
        source: 'gps',
        error: null,
      });
    });

    it('should confirm location when user confirms', async () => {
      mockGeolocationSuccess();
      mockFetchSuccess({
        results: [{
          formatted_address: 'New York, NY, USA'
        }]
      });

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.confirmLocation();

      expect(result.current.location.userConfirmed).toBe(true);
    });

    it('should update manual location', async () => {
      const { result } = renderHook(() => useGeolocation());

      const manualLocation = {
        latitude: 34.0522,
        longitude: -118.2437,
        city: 'Los Angeles, CA',
        address: 'Los Angeles, CA, USA',
      };

      result.current.updateManualLocation(manualLocation);

      expect(result.current.location).toMatchObject({
        ...manualLocation,
        source: 'manual',
        userConfirmed: false,
      });
    });
  });

  describe('geolocation errors', () => {
    it('should handle permission denied error', async () => {
      mockGeolocationError({ code: 1, message: 'User denied geolocation' });
      mockFetchSuccess({
        status: 'success',
        lat: 40.7128,
        lon: -74.0060,
        city: 'New York',
        region: 'NY',
        country: 'USA',
      });

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.location.source).toBe('ip');
      expect(result.current.lastError?.code).toBe('LOCATION_PERMISSION_DENIED');
      expect(result.current.lastError?.retryable).toBe(false);
    });

    it('should handle position unavailable error', async () => {
      mockGeolocationError({ code: 2, message: 'Position unavailable' });
      mockFetchSuccess({
        status: 'success',
        lat: 40.7128,
        lon: -74.0060,
        city: 'New York',
        region: 'NY',
        country: 'USA',
      });

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.location.source).toBe('ip');
      expect(result.current.lastError?.code).toBe('LOCATION_UNAVAILABLE');
      expect(result.current.lastError?.retryable).toBe(true);
    });

    it('should handle timeout error', async () => {
      mockGeolocationError({ code: 3, message: 'Timeout' });
      mockFetchSuccess({
        status: 'success',
        lat: 40.7128,
        lon: -74.0060,
        city: 'New York',
        region: 'NY',
        country: 'USA',
      });

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.location.source).toBe('ip');
      expect(result.current.lastError?.code).toBe('LOCATION_TIMEOUT');
      expect(result.current.lastError?.retryable).toBe(true);
    });
  });

  describe('IP fallback', () => {
    it('should use IP location when GPS fails', async () => {
      mockGeolocationError({ code: 2 });
      mockFetchSuccess({
        status: 'success',
        lat: 40.7128,
        lon: -74.0060,
        city: 'New York',
        region: 'NY',
        country: 'USA',
      });

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.location).toMatchObject({
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York, NY',
        source: 'ip',
        error: null,
      });
    });

    it('should handle IP API failure', async () => {
      mockGeolocationError({ code: 2 });
      mockFetchError('Network error');

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.location.error).toBeTruthy();
      expect(result.current.lastError?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('retry functionality', () => {
    it('should allow retry for retryable errors', async () => {
      mockGeolocationError({ code: 3 }); // Timeout
      mockFetchError('Network error');

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canRetry).toBe(true);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.maxRetries).toBe(3);
    });

    it('should not allow retry for non-retryable errors', async () => {
      mockGeolocationError({ code: 1 }); // Permission denied
      
      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canRetry).toBe(false);
    });

    it('should increment retry count on retry', async () => {
      mockGeolocationError({ code: 3 }); // Timeout
      mockFetchError('Network error');

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock successful retry
      mockGeolocationSuccess();
      mockFetchSuccess({
        results: [{
          formatted_address: 'New York, NY, USA'
        }]
      });

      await result.current.retryLocationDetection();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.retryCount).toBeGreaterThan(0);
    });
  });

  describe('geocoding', () => {
    it('should handle geocoding API failure gracefully', async () => {
      mockGeolocationSuccess();
      mockFetchError('Geocoding API error');

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.location).toMatchObject({
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'Your Location',
        source: 'gps',
      });
    });

    it('should handle empty geocoding results', async () => {
      mockGeolocationSuccess();
      mockFetchSuccess({ results: [] });

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.location).toMatchObject({
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'Your Location',
        source: 'gps',
      });
    });
  });
});