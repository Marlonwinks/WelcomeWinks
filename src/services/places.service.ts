import { performanceCache } from '../lib/performance';

export interface PlacesSearchRequest {
  latitude: number;
  longitude: number;
  radius?: number;
  types?: string[];
}

export interface PlacesSearchResult {
  places: google.maps.places.PlaceResult[];
  status: string;
}

class PlacesService {
  private userInteracted = false;
  private interactionListenersAttached = false;

  constructor() {
    this.setupInteractionListeners();
  }

  private setupInteractionListeners() {
    if (typeof window !== 'undefined' && !this.interactionListenersAttached) {
      const handleInteraction = () => {
        this.userInteracted = true;
        // Remove listeners once interacted
        ['click', 'keydown', 'touchstart', 'scroll'].forEach(event =>
          window.removeEventListener(event, handleInteraction)
        );
      };

      ['click', 'keydown', 'touchstart', 'scroll'].forEach(event =>
        window.addEventListener(event, handleInteraction, { passive: true, once: true })
      );
      this.interactionListenersAttached = true;
    }
  }

  private isBot(): boolean {
    if (typeof navigator === 'undefined') return false;

    // Check for WebDriver
    if ((navigator as any).webdriver) return true;

    // Check User Agent
    const botAgents = ['bot', 'crawler', 'spider', 'ping', 'google', 'baidu', 'bing', 'yandex', 'lighthouse', 'gtmetrix'];
    const userAgent = navigator.userAgent.toLowerCase();
    if (botAgents.some(bot => userAgent.includes(bot))) return true;

    // Check for headless Chrome
    if (userAgent.includes('headless')) return true;

    return false;
  }

  private isGoogleMapsLoaded(): boolean {
    return typeof window !== 'undefined' &&
      !!window.google &&
      !!window.google.maps &&
      !!window.google.maps.places;
  }

  private waitForGoogleMaps(timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isGoogleMapsLoaded()) {
        resolve();
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.isGoogleMapsLoaded()) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Google Maps API failed to load within timeout'));
        }
      }, 100);
    });
  }

  async searchNearbyPlaces(request: PlacesSearchRequest): Promise<PlacesSearchResult> {
    try {
      // 1. Bot Detection (Relaxed - only log warning)
      if (this.isBot()) {
        console.warn('🤖 PlacesService: Potential bot behavior detected. Proceeding with caution.');
        // We don't block anymore to prevent false positives
      }

      // 2. Check Cache
      const cacheKey = `nearby_${this.createLocationKey(request.latitude, request.longitude)}`;
      const cachedResult = performanceCache.get(cacheKey);

      if (cachedResult) {
        console.log('📦 PlacesService: Returning cached results for:', cacheKey);
        // Add source flag for debugging
        return { ...cachedResult, fromCache: true };
      }

      // Wait for Google Maps to be available
      await this.waitForGoogleMaps();

      console.log('🔍 PlacesService: Starting API search for:', request);

      // Create a temporary div for the PlacesService
      const tempDiv = document.createElement('div');
      // Use visibility hidden and absolute positioning instead of display: none
      // because Google Maps might try to observe it
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      try {
        const service = new google.maps.places.PlacesService(tempDiv);

        const searchRequest = {
          location: new google.maps.LatLng(request.latitude, request.longitude),
          radius: request.radius || 5000,
          types: request.types || [
            'restaurant',
            'cafe',
            'bar',
            'book_store',
            'clothing_store',
            'grocery_or_supermarket',
            'pharmacy',
            'gas_station',
            'beauty_salon'
          ],
        };

        return new Promise((resolve) => {
          service.nearbySearch(searchRequest, (results, status) => {
            console.log('🔍 PlacesService: API response:', status, results?.length || 0, 'results');

            // Clean up the temporary div
            document.body.removeChild(tempDiv);

            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              // Filter results to ensure they have proper place_ids and names
              const validResults = results.filter(result =>
                result.place_id && result.name && result.geometry?.location
              );

              const resultData = {
                places: validResults,
                status: status
              };

              // 3. Save to Cache (24 hours)
              performanceCache.set(cacheKey, resultData, 24 * 60 * 60 * 1000);

              resolve(resultData);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              const resultData = { places: [], status: status };
              // Also cache empty results to prevent retries
              performanceCache.set(cacheKey, resultData, 60 * 60 * 1000); // 1 hour for empty
              resolve(resultData);
            } else {
              console.error('🔍 PlacesService: Search failed with status:', status);
              resolve({
                places: [],
                status: status
              });
            }
          });
        });
      } catch (error) {
        // Clean up the temporary div in case of error
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
        throw error;
      }
    } catch (error) {
      console.error('🔍 PlacesService: Error during search:', error);
      return {
        places: [],
        status: 'ERROR'
      };
    }
  }

  // Helper method to check if a location has changed significantly
  hasLocationChanged(
    oldLat: number,
    oldLng: number,
    newLat: number,
    newLng: number,
    threshold = 0.001 // ~100 meters
  ): boolean {
    const latDiff = Math.abs(oldLat - newLat);
    const lngDiff = Math.abs(oldLng - newLng);
    return latDiff > threshold || lngDiff > threshold;
  }

  // Create a location key for caching (rounded to ~11m precision to increase cache hits)
  createLocationKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  }
}

export const placesService = new PlacesService();