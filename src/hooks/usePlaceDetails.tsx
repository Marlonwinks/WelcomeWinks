import { useState, useEffect } from 'react';

interface PlaceDetailsResult {
  place: google.maps.places.PlaceResult | null;
  isLoading: boolean;
  error: string | null;
}

export const usePlaceDetails = (placeId: string | undefined): PlaceDetailsResult => {
  const [place, setPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placeId) {
      setIsLoading(false);
      setError("No place ID provided.");
      return;
    }

    if (window.google) {
      const dummyDiv = document.createElement('div');
      const service = new google.maps.places.PlacesService(dummyDiv);
      
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: ['place_id', 'name', 'vicinity', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'types', 'website', 'formatted_phone_number', 'photos'],
      };

      service.getDetails(request, (result, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && result) {
          setPlace(result);
        } else {
          setError(`Failed to fetch place details. Status: ${status}`);
        }
        setIsLoading(false);
      });
    } else {
      // Handle the case where Google Maps script is not loaded yet
      // This might happen on a very fast navigation
      setError("Google Maps script is not loaded yet.");
      setIsLoading(false);
    }
  }, [placeId]);

  return { place, isLoading, error };
};
