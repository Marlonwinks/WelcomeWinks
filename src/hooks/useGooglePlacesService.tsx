
import { useState, useEffect } from 'react';

export const useGooglePlacesService = () => {
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    const checkGoogle = () => {
      if (window.google?.maps?.places) {
        const map = new google.maps.Map(document.createElement('div'));
        setPlacesService(new google.maps.places.PlacesService(map));
      } else {
        // If not ready, check again shortly.
        setTimeout(checkGoogle, 100);
      }
    };

    checkGoogle();
  }, []);

  return placesService;
};
