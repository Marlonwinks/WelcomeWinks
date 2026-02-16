/**
 * Business Attributes Integration Example
 * 
 * This example demonstrates how to integrate the businessAttributesService
 * into the ExplorePage for search result prioritization.
 * 
 * This is a reference implementation - not meant to be used directly.
 */

import { useEffect, useState } from 'react';
import { businessAttributesService } from '@/services';
import { BusinessAttributes } from '@/types/businessAttributes';
import { calculateRelevanceScore } from '@/services/prioritization.service';
import { DiningPreferences } from '@/types/preferences';

/**
 * Example: Load business attributes for a single place
 */
export function useSingleBusinessAttributes(
  place: google.maps.places.PlaceResult | null,
  userLocation?: { latitude: number; longitude: number }
) {
  const [attributes, setAttributes] = useState<BusinessAttributes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!place || !place.place_id) {
      setAttributes(null);
      return;
    }

    const loadAttributes = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const attrs = await businessAttributesService.getBusinessAttributes(
          place.place_id!,
          place,
          userLocation
        );
        setAttributes(attrs);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to load business attributes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAttributes();
  }, [place?.place_id, userLocation?.latitude, userLocation?.longitude]);

  return { attributes, loading, error };
}

/**
 * Example: Batch load business attributes for multiple places
 */
export function useBatchBusinessAttributes(
  places: google.maps.places.PlaceResult[],
  userLocation?: { latitude: number; longitude: number }
) {
  const [attributesMap, setAttributesMap] = useState<Map<string, BusinessAttributes>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!places || places.length === 0) {
      setAttributesMap(new Map());
      return;
    }

    const loadAttributes = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First, try to batch load from Firestore
        const placeIds = places
          .filter(p => p.place_id)
          .map(p => p.place_id!);
        
        const storedAttributes = await businessAttributesService.batchLoadBusinessAttributes(placeIds);
        
        // For places without stored attributes, infer them
        const newAttributesMap = new Map<string, BusinessAttributes>();
        const attributesToSave = new Map<string, BusinessAttributes>();
        
        for (const place of places) {
          if (!place.place_id) continue;
          
          let attrs = storedAttributes.get(place.place_id);
          
          if (!attrs) {
            // Infer attributes for this place
            attrs = businessAttributesService.inferAttributesFromGooglePlaces(
              place,
              userLocation
            );
            attributesToSave.set(place.place_id, attrs);
          }
          
          newAttributesMap.set(place.place_id, attrs);
        }
        
        // Save newly inferred attributes (fire and forget)
        if (attributesToSave.size > 0) {
          businessAttributesService.batchSaveBusinessAttributes(attributesToSave)
            .catch(err => console.warn('Failed to save batch attributes:', err));
        }
        
        setAttributesMap(newAttributesMap);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to load batch business attributes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAttributes();
  }, [places.length, userLocation?.latitude, userLocation?.longitude]);

  return { attributesMap, loading, error };
}

/**
 * Example: Calculate relevance scores with business attributes
 */
export function useBusinessScores(
  places: google.maps.places.PlaceResult[],
  diningPreferences: DiningPreferences,
  userLocation: { latitude: number; longitude: number }
) {
  const { attributesMap, loading: attributesLoading } = useBatchBusinessAttributes(
    places,
    userLocation
  );
  
  const [scores, setScores] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (attributesLoading || attributesMap.size === 0) {
      return;
    }

    setLoading(true);
    
    try {
      const newScores = new Map();
      
      for (const place of places) {
        if (!place.place_id) continue;
        
        const attributes = attributesMap.get(place.place_id);
        if (!attributes) continue;
        
        const score = calculateRelevanceScore(
          attributes,
          place.rating,
          undefined, // winksScore - would come from your ratings system
          diningPreferences
        );
        
        score.businessId = place.place_id;
        
        newScores.set(place.place_id, score);
      }
      
      setScores(newScores);
    } catch (err) {
      console.error('Failed to calculate scores:', err);
    } finally {
      setLoading(false);
    }
  }, [places, attributesMap, diningPreferences, userLocation]);

  return { scores, loading: loading || attributesLoading };
}

/**
 * Example: Integration in ExplorePage component
 * 
 * This shows how to modify the existing ExplorePage to use business attributes
 */
export function ExplorePageIntegrationExample() {
  // Existing ExplorePage state
  const places: google.maps.places.PlaceResult[] = []; // From existing state
  const diningPreferences: DiningPreferences = {} as any; // From PreferencesProvider
  const userLocation = { latitude: 0, longitude: 0 }; // From existing state
  
  // NEW: Load business attributes and calculate scores
  const { scores, loading } = useBusinessScores(
    places,
    diningPreferences,
    userLocation
  );
  
  // NEW: Sort places by relevance score
  const sortedPlaces = [...places].sort((a, b) => {
    const scoreA = scores.get(a.place_id!)?.totalScore || 0;
    const scoreB = scores.get(b.place_id!)?.totalScore || 0;
    return scoreB - scoreA;
  });
  
  return (
    <div>
      {loading && <div>Calculating relevance scores...</div>}
      
      {sortedPlaces.map(place => {
        const score = scores.get(place.place_id!);
        
        return (
          <div key={place.place_id}>
            <h3>{place.name}</h3>
            {score && (
              <div>
                <p>Match Score: {score.totalScore}%</p>
                <p>Matched: {score.matchedPreferences.join(', ')}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Example: Clear cache when user changes location significantly
 */
export function useCacheClearOnLocationChange(
  userLocation: { latitude: number; longitude: number }
) {
  const [lastLocation, setLastLocation] = useState(userLocation);
  
  useEffect(() => {
    // Calculate distance between current and last location
    const distance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      userLocation.latitude,
      userLocation.longitude
    );
    
    // If user moved more than 5 miles, clear cache
    if (distance > 5) {
      businessAttributesService.clearCache();
      setLastLocation(userLocation);
    }
  }, [userLocation]);
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
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
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
