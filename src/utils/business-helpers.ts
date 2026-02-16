import { Business } from '@/types/firebase';

/**
 * Utility functions for working with business data
 */

/**
 * Convert Google Places PlaceResult to our Business format
 */
export const convertGooglePlacesToBusiness = (
  place: google.maps.places.PlaceResult
): Partial<Business> => {
  if (!place.place_id) {
    throw new Error('Google Places data must include place_id');
  }

  return {
    businessId: place.place_id,
    name: place.name || 'Unknown Business',
    address: place.formatted_address || place.vicinity || 'Address not available',
    location: {
      latitude: place.geometry?.location?.lat() || 0,
      longitude: place.geometry?.location?.lng() || 0,
    },
    googlePlacesData: place,
    averageScore: null,
    totalRatings: 0,
    ratingBreakdown: {
      veryWelcoming: 0,
      moderatelyWelcoming: 0,
      notWelcoming: 0,
    },
    status: 'neutral',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Check if a business has any ratings
 */
export const hasRatings = (business: Business): boolean => {
  return business.totalRatings > 0;
};

/**
 * Get the welcoming level based on average score
 */
export const getWelcomingLevel = (
  averageScore: number | null
): 'very-welcoming' | 'moderately-welcoming' | 'not-welcoming' | 'unrated' => {
  if (averageScore === null) {
    return 'unrated';
  }
  
  if (averageScore >= 4) {
    return 'very-welcoming';
  } else if (averageScore >= -2) {
    return 'moderately-welcoming';
  } else {
    return 'not-welcoming';
  }
};

/**
 * Format business address for display
 */
export const formatBusinessAddress = (business: Business): string => {
  if (!business.address) {
    return 'Address not available';
  }
  
  // If it's a full formatted address, try to shorten it
  const parts = business.address.split(',');
  if (parts.length > 2) {
    // Return first two parts (usually street address and city)
    return parts.slice(0, 2).join(',').trim();
  }
  
  return business.address;
};

/**
 * Get business category from Google Places types
 */
export const getBusinessCategory = (business: Business): string => {
  if (!business.googlePlacesData?.types) {
    return 'Business';
  }

  const types = business.googlePlacesData.types as string[];
  
  // Priority mapping for common business types
  const categoryMap: Record<string, string> = {
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    bar: 'Bar',
    night_club: 'Nightclub',
    store: 'Store',
    shopping_mall: 'Shopping',
    gas_station: 'Gas Station',
    hospital: 'Hospital',
    pharmacy: 'Pharmacy',
    bank: 'Bank',
    gym: 'Gym',
    beauty_salon: 'Beauty Salon',
    hair_care: 'Hair Salon',
    lodging: 'Hotel',
    tourist_attraction: 'Attraction',
    park: 'Park',
    library: 'Library',
    school: 'School',
    university: 'University',
    church: 'Church',
    mosque: 'Mosque',
    synagogue: 'Synagogue',
    hindu_temple: 'Temple',
  };

  // Find the first matching category
  for (const type of types) {
    if (categoryMap[type]) {
      return categoryMap[type];
    }
  }

  // Fallback to the first type, formatted nicely
  const firstType = types[0];
  if (firstType && firstType !== 'establishment' && firstType !== 'point_of_interest') {
    return firstType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'Business';
};

/**
 * Calculate distance between two points using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
};

/**
 * Get business rating summary text
 */
export const getRatingSummary = (business: Business): string => {
  if (!hasRatings(business)) {
    return 'Not yet rated';
  }

  const level = getWelcomingLevel(business.averageScore);
  const count = business.totalRatings;
  
  const levelText = {
    'very-welcoming': 'Very Welcoming',
    'moderately-welcoming': 'Moderately Welcoming',
    'not-welcoming': 'Not Very Welcoming',
    'unrated': 'Not yet rated',
  }[level];

  return `${levelText} (${count} rating${count !== 1 ? 's' : ''})`;
};

/**
 * Check if a business matches search criteria
 */
export const matchesSearchCriteria = (
  business: Business,
  searchTerm: string
): boolean => {
  if (!searchTerm.trim()) {
    return true;
  }

  const term = searchTerm.toLowerCase();
  const name = business.name.toLowerCase();
  const address = business.address.toLowerCase();
  const category = getBusinessCategory(business).toLowerCase();

  return (
    name.includes(term) ||
    address.includes(term) ||
    category.includes(term)
  );
};

/**
 * Filter businesses by welcoming level
 */
export const filterByWelcomingLevel = (
  businesses: Business[],
  levels: ('very-welcoming' | 'moderately-welcoming' | 'not-welcoming' | 'unrated')[]
): Business[] => {
  return businesses.filter(business => {
    const level = getWelcomingLevel(business.averageScore);
    return levels.includes(level);
  });
};

/**
 * Sort businesses by various criteria
 */
export const sortBusinesses = (
  businesses: Business[],
  sortBy: 'nearest' | 'score-high' | 'score-low' | 'rating-high' | 'name',
  userLocation?: { lat: number; lng: number }
): Business[] => {
  const sorted = [...businesses];

  switch (sortBy) {
    case 'score-high':
      return sorted.sort((a, b) => {
        const scoreA = a.averageScore ?? -999;
        const scoreB = b.averageScore ?? -999;
        return scoreB - scoreA;
      });

    case 'score-low':
      return sorted.sort((a, b) => {
        const scoreA = a.averageScore ?? 999;
        const scoreB = b.averageScore ?? 999;
        return scoreA - scoreB;
      });

    case 'rating-high':
      return sorted.sort((a, b) => b.totalRatings - a.totalRatings);

    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));

    case 'nearest':
    default:
      if (userLocation) {
        return sorted.sort((a, b) => {
          const distanceA = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            a.location.latitude,
            a.location.longitude
          );
          const distanceB = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            b.location.latitude,
            b.location.longitude
          );
          return distanceA - distanceB;
        });
      }
      return sorted;
  }
};

/**
 * Validate business data before creation
 */
export const validateBusinessData = (business: Partial<Business>): string[] => {
  const errors: string[] = [];

  if (!business.businessId) {
    errors.push('Business ID is required');
  }

  if (!business.name || business.name.trim().length === 0) {
    errors.push('Business name is required');
  }

  if (!business.address || business.address.trim().length === 0) {
    errors.push('Business address is required');
  }

  if (!business.location) {
    errors.push('Business location is required');
  } else {
    if (typeof business.location.latitude !== 'number' || 
        business.location.latitude < -90 || 
        business.location.latitude > 90) {
      errors.push('Valid latitude is required');
    }

    if (typeof business.location.longitude !== 'number' || 
        business.location.longitude < -180 || 
        business.location.longitude > 180) {
      errors.push('Valid longitude is required');
    }
  }

  return errors;
};

/**
 * Create a business summary for display
 */
export const createBusinessSummary = (business: Business) => {
  return {
    id: business.businessId,
    name: business.name,
    category: getBusinessCategory(business),
    address: formatBusinessAddress(business),
    welcomingLevel: getWelcomingLevel(business.averageScore),
    ratingSummary: getRatingSummary(business),
    hasRatings: hasRatings(business),
    totalRatings: business.totalRatings,
    averageScore: business.averageScore,
    location: business.location,
  };
};