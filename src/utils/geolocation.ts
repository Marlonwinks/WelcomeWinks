/**
 * Geolocation utilities for calculating distances and filtering by radius
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in miles
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if two coordinates are within a specified radius
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @param radiusMiles Radius in miles
 * @returns True if within radius
 */
export function isWithinRadius(coord1: Coordinates, coord2: Coordinates, radiusMiles: number): boolean {
  return calculateDistance(coord1, coord2) <= radiusMiles;
}

/**
 * Parse coordinates from a business address or location string
 * @param locationString Location string that might contain coordinates
 * @returns Parsed coordinates or null if not found
 */
export function parseCoordinatesFromString(locationString: string): Coordinates | null {
  // Try to extract coordinates from various formats
  const coordPatterns = [
    // Pattern: "lat,lng" or "lat, lng"
    /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    // Pattern: "lat lng"
    /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/,
  ];

  for (const pattern of coordPatterns) {
    const match = locationString.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      // Validate coordinate ranges
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  return null;
}

/**
 * Get coordinates from a business object
 * @param business Business object
 * @returns Coordinates or null if not available
 */
export function getBusinessCoordinates(business: any): Coordinates | null {
  // Try different possible location fields
  const locationFields = [
    business.location,
    business.coordinates,
    business.address,
    business.geometry?.location,
  ];

  for (const field of locationFields) {
    if (field) {
      if (typeof field === 'string') {
        const coords = parseCoordinatesFromString(field);
        if (coords) return coords;
      } else if (field.latitude && field.longitude) {
        return {
          latitude: field.latitude,
          longitude: field.longitude
        };
      } else if (field.lat && field.lng) {
        return {
          latitude: field.lat,
          longitude: field.lng
        };
      }
    }
  }

  return null;
}
