// A comment to force a reload
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { SlidersHorizontal, Map as MapIcon, List, ArrowUpDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { PlacesSearchBar } from '@/components/ui/places-search-bar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BusinessCard } from '@/components/business/BusinessCard';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InteractiveMap from '@/components/maps/InteractiveMap';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '@/contexts/LocationProvider';
import { usePreferences } from '@/contexts/PreferencesProvider';
import { getWelcomingLevel } from '@/components/business/ScoreIndicator';
import { RegistrationPrompt, RegistrationForm } from '@/components/onboarding';
import { useRegistrationPrompt } from '@/hooks/useRegistrationPrompt';
import { usePreferenceSetupPrompt } from '@/hooks/usePreferenceSetupPrompt';
import { PreferenceSetupDialog } from '@/components/preferences/PreferenceSetupDialog';
import { DiningPreferences } from '@/types/preferences';
import { ratingsService } from '@/services/ratings.service';
import { Business } from '@/types/firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/services/firebase';
import MobileErrorBoundary from '@/components/mobile/MobileErrorBoundary';
import { getMobileOptimizedSettings, logNetworkInfo, addNetworkListeners } from '@/utils/mobile-network';
import { placesService } from '@/services/places.service';
import { inferBusinessAttributes } from '@/utils/businessAttributesInference';
import {
  calculateRelevanceScore,
  hasPreferencesSet,
  sortBusinessesWithFallback,
  BusinessWithScore
} from '@/services/prioritization.service';
import { useScreenReaderAnnouncement } from '@/hooks/useScreenReaderAnnouncement';

// Simple in-memory cache to persist places across navigation
let placesCache: google.maps.places.PlaceResult[] | null = null;

const quickFilters = [
  'Nearest', 'Very Welcoming', 'Moderately Welcoming', 'Not Yet Rated', 'Food', 'Bars'
];

type SortOption = 'best-match' | 'nearest' | 'score-high' | 'score-low' | 'rating-high' | 'name';

const ExplorePage: React.FC = () => {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { location, isInitialized } = useLocation();
  const { preferences, updateUIPreferences, updateDiningPreferences, updateOnboardingPreferences, isLoaded: preferencesLoaded } = usePreferences();

  // Initialize sort based on preferences - default to best-match if preferences are set
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    // Check if user has explicitly saved a sort preference
    const savedSort = preferences.ui.exploreSortBy as SortOption | undefined;
    if (savedSort) {
      return savedSort;
    }
    // Default to best-match if preferences are set, otherwise nearest
    return hasPreferencesSet(preferences.dining) ? 'best-match' : 'nearest';
  });

  // Preference setup prompt for new users
  const {
    shouldShowPrompt: shouldShowPreferencePrompt,
    dismissPrompt: dismissPreferencePrompt,
    markPromptShown: markPreferencePromptShown,
  } = usePreferenceSetupPrompt();
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'dual'>(
    isMobile ? 'list' : 'dual' // Default to dual view on desktop/iPad, list on mobile
  );
  const [nearbyPlaces, setNearbyPlaces] = useState<google.maps.places.PlaceResult[]>(placesCache || []);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 }); // Default to NYC
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pageLoadTime, setPageLoadTime] = useState<number>(Date.now());
  const [retryCount, setRetryCount] = useState(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [preferencesRelaxed, setPreferencesRelaxed] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  // Firebase state
  const [firebaseBusinesses, setFirebaseBusinesses] = useState<Business[]>([]);
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);

  // Screen reader announcements
  const { announce } = useScreenReaderAnnouncement();

  // Update view mode when screen size changes
  useEffect(() => {
    if (isMobile) {
      // On mobile, always default to list view
      setViewMode('list');
    } else {
      // On desktop/iPad, default to dual view (List+Maps)
      setViewMode('dual');
    }
  }, [isMobile]);

  // Update sort when preferences change (only if user hasn't explicitly set a preference)
  useEffect(() => {
    if (preferencesLoaded && !preferences.ui.exploreSortBy) {
      const newDefaultSort = hasPreferencesSet(preferences.dining) ? 'best-match' : 'nearest';
      if (sortBy !== newDefaultSort) {
        setSortBy(newDefaultSort);
      }
    }
  }, [preferences.dining, preferencesLoaded, preferences.ui.exploreSortBy]);

  // Network status monitoring - simplified to prevent loops
  useEffect(() => {
    const cleanup = addNetworkListeners(
      () => {
        console.log('📱 Network: Back online');
        setIsOnline(true);
        // Only retry if we have no places and aren't currently loading
        if (nearbyPlaces.length === 0 && !isLoadingPlaces && location.latitude && location.longitude) {
          console.log('📱 Network back online - retrying places load');
          setRetryCount(0); // Reset retry count
        }
      },
      () => {
        console.log('📱 Network: Gone offline');
        setIsOnline(false);
      },
      (networkInfo) => {
        console.log('📱 Network changed:', networkInfo);
      }
    );

    return cleanup;
  }, []); // Empty dependency array to prevent re-registration

  // Registration prompt logic
  const {
    showPrompt,
    showForm,
    isLoading: isRegistrationLoading,
    showRegistrationPrompt,
    handleRegister,
    handleSkip,
    handleRemindLater,
    handleFormSubmit,
    handleFormBack,
    hidePrompt,
    completedGoal,
    // New AccountOptions methods
    handleFullAccount,
    handleCookieAccount,
    handleDeclineAccount,
  } = useRegistrationPrompt();

  useEffect(() => {
    if (location.latitude && location.longitude) {
      setMapCenter({ lat: location.latitude, lng: location.longitude });
    }
  }, [location]);

  // Direct places loading using places service - works in all view modes
  useEffect(() => {
    // Only start loading if we have location and no places yet
    if (!isInitialized) {
      console.log('📍 Location provider not yet initialized - waiting');
      return;
    }

    if (!location.latitude || !location.longitude) {
      console.log('📍 No location available yet, and initialized');
      return;
    }

    // If we already have places, don't reload
    if (nearbyPlaces.length > 0) {
      console.log('📍 Places already loaded:', nearbyPlaces.length);
      return;
    }

    // If already loading, don't start again
    if (isLoadingPlaces) {
      console.log('📍 Already loading places');
      return;
    }

    const loadPlaces = async () => {
      console.log('📍 Starting places loading for location:', location.latitude, location.longitude);
      logNetworkInfo();

      setIsLoadingPlaces(true);
      setHasInitialLoad(true);
      setPageLoadTime(Date.now());

      // Get mobile-optimized timeout
      const mobileSettings = getMobileOptimizedSettings();
      const timeoutDuration = mobileSettings.recommendedTimeout;

      console.log('📱 Using timeout:', timeoutDuration, 'ms for mobile:', mobileSettings.isMobile);

      const timeout = setTimeout(() => {
        console.log('📍 Places loading timeout - resetting loading state');
        setIsLoadingPlaces(false);

        // On mobile, retry once after timeout
        if (mobileSettings.isMobile && retryCount < 1) {
          console.log('📍 Will retry in 2 seconds...');
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            loadPlaces();
          }, 2000);
        }
      }, timeoutDuration);

      setLoadingTimeout(timeout);

      try {
        // Use places service directly - works without map component
        const result = await placesService.searchNearbyPlaces({
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 5000
        });

        // Clear timeout on successful response
        clearTimeout(timeout);
        setLoadingTimeout(null);

        console.log('📍 Places loaded successfully:', result.places.length);
        setNearbyPlaces(result.places);
        placesCache = result.places;
        setIsLoadingPlaces(false);
        setRetryCount(0);

      } catch (error) {
        console.error('📍 Error loading places:', error);
        clearTimeout(timeout);
        setLoadingTimeout(null);
        setIsLoadingPlaces(false);

        // Retry on error if we haven't exceeded retry count
        if (retryCount < 1) {
          console.log('📍 Will retry after error in 2 seconds...');
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            loadPlaces();
          }, 2000);
        }
      }
    };

    loadPlaces();
  }, [location.latitude, location.longitude, nearbyPlaces.length, isLoadingPlaces, retryCount, isInitialized]);

  // Safety mechanism: Force stop loading after 2 minutes regardless
  useEffect(() => {
    if (isLoadingPlaces) {
      const safetyTimeout = setTimeout(() => {
        console.log('🚨 Safety timeout: Force stopping places loading');
        setIsLoadingPlaces(false);
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          setLoadingTimeout(null);
        }
      }, 120000); // 2 minutes safety timeout

      return () => clearTimeout(safetyTimeout);
    }
  }, [isLoadingPlaces, loadingTimeout]);

  // Disabled manual loading - real-time listener handles everything
  // This prevents conflicts that cause rating flashing

  // Real-time listener for business ratings - single source of truth
  useEffect(() => {
    if (!location.latitude || !location.longitude) return;

    console.log('📡 Setting up real-time listener for ratings');
    setIsLoadingRatings(true);

    // Calculate approximate bounding box for the radius (5km)
    const latDelta = 5 / 111; // Rough conversion: 1 degree ≈ 111 km
    const lngDelta = 5 / (111 * Math.cos(location.latitude * Math.PI / 180));

    const minLat = location.latitude - latDelta;
    const maxLat = location.latitude + latDelta;

    // Set up real-time listener for businesses in the area
    const businessesRef = collection(db, 'businesses');
    const q = query(
      businessesRef,
      where('location.latitude', '>=', minLat),
      where('location.latitude', '<=', maxLat),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('📡 Real-time snapshot received:', snapshot.size, 'docs');

        const businesses: Business[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Convert Firestore timestamps to dates
          businesses.push({
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Business);
        });

        // Filter by longitude and exact distance
        const filteredBusinesses = businesses.filter(business => {
          const distance = calculateDistance(
            location.latitude!,
            location.longitude!,
            business.location.latitude,
            business.location.longitude
          );
          return distance <= 5; // 5km radius
        });

        console.log('📡 Filtered businesses:', filteredBusinesses.length);
        setFirebaseBusinesses(filteredBusinesses);
        setIsLoadingRatings(false);
        setRatingsError(null);
      },
      (error) => {
        console.error('Real-time listener error:', error);
        setRatingsError('Failed to sync business ratings');
        setIsLoadingRatings(false);
      }
    );

    return () => {
      console.log('📡 Cleaning up real-time listener');
      unsubscribe();
    };
  }, [location.latitude, location.longitude]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const handlePlacesFetched = useCallback((places: google.maps.places.PlaceResult[]) => {
    console.log('📍 Places fetched:', places.length, 'places');

    // Always update places and stop loading
    setNearbyPlaces(places);
    placesCache = places; // Update cache
    setIsLoadingPlaces(false);
    setRetryCount(0); // Reset retry count on successful fetch

    // Clear the loading timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }

    console.log('📍 Places loading completed successfully');
  }, [loadingTimeout]);

  // Get Firebase rating data for places
  const placeScores = useMemo(() => {
    const scores: Record<string, number | null> = {};
    const ratingCounts: Record<string, number> = {};

    // First, set all places to null (unrated)
    nearbyPlaces.forEach(place => {
      if (place.place_id) {
        scores[place.place_id] = null;
        ratingCounts[place.place_id] = 0;
      }
    });

    // Then, update with Firebase data where available
    firebaseBusinesses.forEach(business => {
      if (business.businessId && business.status === 'rated') {
        scores[business.businessId] = business.averageScore;
        ratingCounts[business.businessId] = business.totalRatings;
      }
    });

    return { scores, ratingCounts };
  }, [nearbyPlaces, firebaseBusinesses]);

  // Filter and sort places based on selected filters and sort option
  const filteredAndSortedPlaces = useMemo(() => {
    let filtered = [...nearbyPlaces];

    // Apply filters
    if (selectedFilters.includes('Very Welcoming')) {
      filtered = filtered.filter(place => {
        const score = place.place_id ? placeScores.scores[place.place_id] : null;
        return getWelcomingLevel(score) === 'very-welcoming';
      });
    }
    if (selectedFilters.includes('Moderately Welcoming')) {
      filtered = filtered.filter(place => {
        const score = place.place_id ? placeScores.scores[place.place_id] : null;
        return getWelcomingLevel(score) === 'moderately-welcoming';
      });
    }
    if (selectedFilters.includes('Not Yet Rated')) {
      filtered = filtered.filter(place => {
        const score = place.place_id ? placeScores.scores[place.place_id] : null;
        return getWelcomingLevel(score) === 'unrated';
      });
    }
    if (selectedFilters.includes('Food')) {
      filtered = filtered.filter(place =>
        place.types?.some(type => ['restaurant', 'cafe', 'food'].includes(type))
      );
    }
    if (selectedFilters.includes('Bars')) {
      filtered = filtered.filter(place =>
        place.types?.some(type => ['bar', 'night_club'].includes(type))
      );
    }

    // Apply sorting
    // If "best-match" is selected and user has preferences, use prioritization
    if (sortBy === 'best-match' && hasPreferencesSet(preferences.dining)) {
      try {
        // Clear any previous errors
        setPreferencesError(null);

        // Infer business attributes and calculate relevance scores
        const businessesWithScores: BusinessWithScore[] = filtered.map(place => {
          const attributes = inferBusinessAttributes(place, location.latitude && location.longitude ? {
            latitude: location.latitude,
            longitude: location.longitude,
          } : undefined);

          const googleRating = place.rating;
          const winksScore = place.place_id ? placeScores.scores[place.place_id] || undefined : undefined;

          const score = calculateRelevanceScore(
            attributes,
            googleRating,
            winksScore,
            preferences.dining,
            undefined,
            place.name || ''
          );

          // Set the businessId
          score.businessId = place.place_id || '';

          return {
            business: place,
            attributes,
            score,
            googleRating,
            winksScore,
          };
        });

        // Sort with fallback logic
        const { sorted, relaxed } = sortBusinessesWithFallback(businessesWithScores, preferences.dining);
        setPreferencesRelaxed(relaxed);

        return sorted.map(item => item.business);
      } catch (error) {
        console.error('Error applying preference-based prioritization:', error);
        setPreferencesError('Failed to apply preferences. Showing default results.');

        // Fallback to default sorting on error
        filtered.sort((a, b) => {
          // Sort by Google rating first
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;

          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }

          // Then keep original order (distance)
          return 0;
        });

        return filtered;
      }
    } else {
      // Reset relaxed state when not using best-match
      setPreferencesRelaxed(false);

      // Apply traditional sorting
      switch (sortBy) {
        case 'score-high':
          filtered.sort((a, b) => {
            const scoreA = a.place_id ? placeScores.scores[a.place_id] || -999 : -999;
            const scoreB = b.place_id ? placeScores.scores[b.place_id] || -999 : -999;
            return scoreB - scoreA;
          });
          break;
        case 'score-low':
          filtered.sort((a, b) => {
            const scoreA = a.place_id ? placeScores.scores[a.place_id] || 999 : 999;
            const scoreB = b.place_id ? placeScores.scores[b.place_id] || 999 : 999;
            return scoreA - scoreB;
          });
          break;
        case 'rating-high':
          filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'name':
          filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          break;
        case 'nearest':
        case 'best-match': // Fallback to nearest if no preferences
        default:
          // Keep original order (nearest first from Google Places API)
          break;
      }

      return filtered;
    }
  }, [nearbyPlaces, selectedFilters, sortBy, placeScores, preferences.dining, location.latitude, location.longitude]);

  // Announce result count changes to screen readers
  useEffect(() => {
    if (filteredAndSortedPlaces.length > 0) {
      const count = filteredAndSortedPlaces.length;
      const sortDescription = sortBy === 'best-match' && hasPreferencesSet(preferences.dining)
        ? 'prioritized by your preferences'
        : sortBy === 'nearest'
          ? 'sorted by distance'
          : sortBy === 'rating-high'
            ? 'sorted by rating'
            : sortBy === 'score-high'
              ? 'sorted by Winks score'
              : 'sorted';

      announce(
        `${count} ${count === 1 ? 'place' : 'places'} found, ${sortDescription}`,
        'polite'
      );
    } else if (!isLoadingPlaces && nearbyPlaces.length > 0) {
      announce('No places match your current filters', 'polite');
    }
  }, [filteredAndSortedPlaces.length, sortBy, preferences.dining, isLoadingPlaces, nearbyPlaces.length, announce]);

  // Announce when results are re-prioritized
  useEffect(() => {
    if (sortBy === 'best-match' && hasPreferencesSet(preferences.dining) && filteredAndSortedPlaces.length > 0) {
      if (preferencesRelaxed) {
        announce('Results re-prioritized with relaxed preferences to show more options', 'polite');
      } else {
        announce('Results re-prioritized based on your preferences', 'polite');
      }
    }
  }, [sortBy, preferencesRelaxed, filteredAndSortedPlaces.length, preferences.dining, announce]);

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleBusinessSelect = (business: any) => {
    navigate(`/business/${business.place_id || business.name.replace(/\s+/g, '-').toLowerCase()}`);

    // Track business views and show registration prompt after viewing a few businesses
    const viewCount = parseInt(localStorage.getItem('business-view-count') || '0', 10) + 1;
    localStorage.setItem('business-view-count', viewCount.toString());

    // Show registration prompt after viewing 3 businesses
    if (viewCount >= 3) {
      setTimeout(() => {
        showRegistrationPrompt('find-welcoming');
      }, 1000); // Delay to let navigation complete
    }
  };

  // Handle preference setup completion
  const handlePreferenceSetupComplete = (diningPreferences: DiningPreferences) => {
    updateDiningPreferences(diningPreferences);
    updateOnboardingPreferences({
      completedSteps: [...preferences.onboarding.completedSteps, 'preferences-setup'],
    });
    markPreferencePromptShown();
  };

  // Handle preference setup skip
  const handlePreferenceSetupSkip = () => {
    markPreferencePromptShown();
    dismissPreferencePrompt();
  };

  return (
    <MobileErrorBoundary>
      <>
        {/* Preference Setup Dialog for new users */}
        <PreferenceSetupDialog
          open={shouldShowPreferencePrompt}
          onOpenChange={(open) => {
            if (!open) {
              handlePreferenceSetupSkip();
            }
          }}
          onComplete={handlePreferenceSetupComplete}
          initialPreferences={preferences.dining}
        />

        <div className="min-h-screen pb-20 md:pb-0">
          {/* Enhanced Header */}
          <div className="sticky top-0 z-20 bg-gradient-to-r from-background via-background/98 to-background backdrop-blur-xl border-b border-border/50 shadow-sm">
            <div className="max-w-6xl mx-auto p-4 space-y-4">
              {/* Search and View Toggle Row */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <PlacesSearchBar
                    placeholder="Search places, restaurants, cafes..."
                    inputClassName="bg-background/80 border-border/60 shadow-sm hover:shadow-md transition-shadow"
                    onPlaceSelect={(place) => {
                      navigate(`/business/${place.place_id || place.name?.replace(/\s+/g, '-').toLowerCase()}`);
                    }}
                    onTextChange={(text) => {
                      console.log('Search text:', text);
                    }}
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-muted/50 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => {
                      setViewMode('list');
                      updateUIPreferences({ defaultView: 'list' });
                    }}
                  >
                    <List className="h-4 w-4 mr-1" />
                    {!isMobile && <span className="text-xs">List</span>}
                  </Button>

                  {!isMobile && (
                    <Button
                      variant={viewMode === 'dual' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => {
                        setViewMode('dual');
                        updateUIPreferences({ defaultView: 'dual' });
                      }}
                    >
                      <div className="flex items-center gap-1 mr-1">
                        <List className="h-3 w-3" />
                        <MapIcon className="h-3 w-3" />
                      </div>
                      <span className="text-xs">Both</span>
                    </Button>
                  )}

                  <Button
                    variant={viewMode === 'map' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => {
                      setViewMode('map');
                      updateUIPreferences({ defaultView: 'map' });
                    }}
                  >
                    <MapIcon className="h-4 w-4 mr-1" />
                    {!isMobile && <span className="text-xs">Map</span>}
                  </Button>
                </div>
              </div>

              {/* Filters and Sort Row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2 overflow-x-auto pb-1 flex-1 scrollbar-hide">
                  {quickFilters.map((filter) => (
                    <Badge
                      key={filter}
                      variant={selectedFilters.includes(filter) ? "default" : "outline"}
                      className="cursor-pointer whitespace-nowrap text-xs px-3 py-1.5 hover:scale-105 transition-transform shadow-sm hover:shadow-md"
                      onClick={() => toggleFilter(filter)}
                    >
                      {filter}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select
                    value={sortBy}
                    onValueChange={(value: SortOption) => {
                      setSortBy(value);
                      // Save sort preference permanently
                      updateUIPreferences({ exploreSortBy: value });
                    }}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs bg-background/80 border-border/60">
                      <ArrowUpDown className="h-3 w-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hasPreferencesSet(preferences.dining) && (
                        <SelectItem value="best-match">Best Match</SelectItem>
                      )}
                      <SelectItem value="nearest">Nearest</SelectItem>
                      <SelectItem value="score-high">Score: High</SelectItem>
                      <SelectItem value="score-low">Score: Low</SelectItem>
                      <SelectItem value="rating-high">Rating: High</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => navigate('/profile')}
                    title="Edit dining preferences"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Preference-aware UI indicators */}
          {sortBy === 'best-match' && hasPreferencesSet(preferences.dining) && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary rounded-lg px-4 py-2 border border-primary/20">
                <SlidersHorizontal className="h-3 w-3" />
                <span className="font-medium">
                  {preferencesRelaxed
                    ? 'Showing best matches (some preferences relaxed)'
                    : 'Results prioritized by your preferences'}
                </span>
              </div>
            </div>
          )}

          {!hasPreferencesSet(preferences.dining) && nearbyPlaces.length > 0 && preferencesLoaded && (
            <div className="px-4 py-2">
              <div className="flex items-center justify-between gap-2 text-xs bg-muted/50 rounded-lg px-4 py-2 border border-border/30">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {!preferences.onboarding.completedSteps.includes('preferences-setup')
                      ? 'New here? Set up your dining preferences to get personalized results'
                      : 'Set your dining preferences to get personalized results'}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => navigate('/profile')}
                >
                  Set Preferences
                </Button>
              </div>
            </div>
          )}

          {/* Subtle Loading States - Mobile Optimized */}
          {(isLoadingRatings || isLoadingPlaces) && (
            <div className="px-4 py-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground/80 bg-gradient-to-r from-muted/20 to-muted/10 rounded-full px-4 py-1.5 border border-border/30">
                <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
                <span>
                  {isLoadingPlaces && isLoadingRatings ? 'Loading...' :
                    isLoadingPlaces ? (isMobile ? 'Finding nearby places...' : 'Finding places...') : 'Syncing ratings...'}
                </span>
                {isLoadingPlaces && retryCount > 0 && (
                  <span className="text-xs text-muted-foreground/60">(Retry {retryCount})</span>
                )}
              </div>
            </div>
          )}

          {/* Offline Indicator */}
          {!isOnline && (
            <div className="px-4 py-2">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You're currently offline. Some features may not work properly.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {ratingsError && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{ratingsError}</AlertDescription>
              </Alert>
            </div>
          )}

          {preferencesError && (
            <div className="px-4 py-2">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{preferencesError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Content */}
          {isMobile ? (
            <div className="p-4">
              {viewMode === 'map' && (
                <Card>
                  <CardContent className="p-0">
                    <InteractiveMap
                      height="60vh"
                      center={mapCenter}
                      places={filteredAndSortedPlaces}
                      placeScores={placeScores.scores}
                      onPlacesFetched={handlePlacesFetched}
                      onBusinessSelect={handleBusinessSelect}
                    />
                  </CardContent>
                </Card>
              )}
              {viewMode === 'list' && (
                <div className="space-y-3">
                  {filteredAndSortedPlaces.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between px-1 mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {filteredAndSortedPlaces.length} places found
                        </h3>
                      </div>
                      {filteredAndSortedPlaces.map((business) => (
                        <div
                          key={business.place_id}
                          onClick={() => handleBusinessSelect(business)}
                          className="transform hover:scale-[1.01] transition-all duration-200 hover:shadow-md"
                        >
                          <BusinessCard
                            name={business.name || ''}
                            category={business.types?.[0] || ''}
                            address={business.vicinity || ''}
                            googleRating={business.rating}
                            winksScore={business.place_id ? placeScores.scores[business.place_id] : null}
                            totalMarks={business.place_id ? placeScores.ratingCounts[business.place_id] : 0}
                            googleTotalMarks={business.user_ratings_total}
                          />
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4 shadow-sm">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                      </div>
                      <h3 className="font-medium text-lg mb-2">
                        {nearbyPlaces.length === 0 ? 'Finding nearby places...' : 'No businesses found'}
                      </h3>
                      <p className="text-muted-foreground mb-6 text-sm">
                        {nearbyPlaces.length === 0
                          ? (isMobile
                            ? 'This may take a moment on mobile networks. Please wait...'
                            : 'Please wait while we find businesses near you.')
                          : sortBy === 'best-match' && hasPreferencesSet(preferences.dining)
                            ? 'No businesses match your preferences. Try adjusting your preferences or clearing filters.'
                            : 'Try adjusting your filters or search area'}
                      </p>

                      <div className="space-y-2">
                        {nearbyPlaces.length > 0 && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedFilters(['Nearest'])}
                              className="shadow-sm hover:shadow-md transition-shadow w-full"
                            >
                              Clear Filters
                            </Button>
                            {sortBy === 'best-match' && hasPreferencesSet(preferences.dining) && (
                              <Button
                                variant="outline"
                                onClick={() => navigate('/profile')}
                                className="shadow-sm hover:shadow-md transition-shadow w-full"
                              >
                                <SlidersHorizontal className="h-4 w-4 mr-2" />
                                Adjust Preferences
                              </Button>
                            )}
                          </>
                        )}

                        {nearbyPlaces.length === 0 && (
                          <Button
                            variant="outline"
                            onClick={async () => {
                              console.log('🔄 Manual refresh triggered');
                              setIsLoadingPlaces(false);
                              setRetryCount(0);
                              setNearbyPlaces([]);
                              placesCache = null;

                              // Clear any existing timeout
                              if (loadingTimeout) {
                                clearTimeout(loadingTimeout);
                                setLoadingTimeout(null);
                              }

                              // Force a reload by clearing and resetting
                              setTimeout(() => {
                                setIsLoadingPlaces(true);
                              }, 100);
                            }}
                            className="shadow-sm hover:shadow-md transition-shadow w-full"
                            disabled={isLoadingPlaces}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPlaces ? 'animate-spin' : ''}`} />
                            {isLoadingPlaces ? 'Loading...' : 'Refresh'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="h-[calc(100vh-150px)]">
              {viewMode === 'list' ? (
                <div className="overflow-y-auto p-6 space-y-4">
                  {filteredAndSortedPlaces.length > 0 ? (
                    filteredAndSortedPlaces.map((business) => (
                      <div key={business.place_id} onClick={() => handleBusinessSelect(business)}>
                        <BusinessCard
                          name={business.name || ''}
                          category={business.types?.[0] || ''}
                          address={business.vicinity || ''}
                          googleRating={business.rating}
                          winksScore={business.place_id ? placeScores.scores[business.place_id] : null}
                          totalMarks={business.place_id ? placeScores.ratingCounts[business.place_id] : 0}
                          googleTotalMarks={business.user_ratings_total}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-lg mb-2">No businesses found</h3>
                      <p className="text-muted-foreground mb-4">
                        {sortBy === 'best-match' && hasPreferencesSet(preferences.dining)
                          ? 'No businesses match your preferences. Try adjusting your preferences or clearing filters.'
                          : 'No businesses match your current filters.'}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedFilters(['Nearest'])}
                        >
                          Clear Filters
                        </Button>
                        {sortBy === 'best-match' && hasPreferencesSet(preferences.dining) && (
                          <Button
                            variant="outline"
                            onClick={() => navigate('/profile')}
                          >
                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                            Adjust Preferences
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : viewMode === 'map' ? (
                <InteractiveMap
                  height="100%"
                  center={mapCenter}
                  places={filteredAndSortedPlaces}
                  placeScores={placeScores.scores}
                  onPlacesFetched={handlePlacesFetched}
                  onBusinessSelect={handleBusinessSelect}
                />
              ) : (
                // Enhanced Dual view - side by side with better styling
                <div className="flex h-full bg-gradient-to-r from-background/50 to-background overflow-hidden">
                  <div className="w-[450px] flex-shrink-0 border-r border-border/50 overflow-y-auto bg-background/50 backdrop-blur-sm">
                    <div className="p-4 space-y-3">
                      {filteredAndSortedPlaces.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-sm font-medium text-muted-foreground">
                              {filteredAndSortedPlaces.length} places found
                            </h3>
                          </div>
                          {filteredAndSortedPlaces.map((business) => (
                            <div
                              key={business.place_id}
                              onClick={() => handleBusinessSelect(business)}
                              className="transform hover:scale-[1.01] transition-all duration-200"
                            >
                              <BusinessCard
                                name={business.name || ''}
                                category={business.types?.[0] || ''}
                                address={business.vicinity || ''}
                                googleRating={business.rating}
                                winksScore={business.place_id ? placeScores.scores[business.place_id] : null}
                                totalMarks={business.place_id ? placeScores.ratingCounts[business.place_id] : 0}
                                googleTotalMarks={business.user_ratings_total}
                              />
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4 shadow-sm">
                            <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                          </div>
                          <h3 className="font-medium text-lg mb-2">No businesses found</h3>
                          <p className="text-muted-foreground mb-6 text-sm">Try adjusting your filters or search area</p>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedFilters(['Nearest'])}
                            className="shadow-sm hover:shadow-md transition-shadow"
                          >
                            Clear Filters
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 relative h-full">
                    <InteractiveMap
                      height="100%"
                      center={mapCenter}
                      places={filteredAndSortedPlaces}
                      placeScores={placeScores.scores}
                      onPlacesFetched={handlePlacesFetched}
                      onBusinessSelect={handleBusinessSelect}
                    />
                    {/* Map overlay for better integration */}
                    <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-border/50 z-10">
                      <span className="text-xs text-muted-foreground font-medium">
                        {filteredAndSortedPlaces.length} locations on map
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Registration Prompt */}
          {showPrompt && completedGoal && (
            <RegistrationPrompt
              completedGoal={completedGoal}
              onFullAccount={handleFullAccount}
              onCookieAccount={handleCookieAccount}
              onDeclineAccount={handleDeclineAccount}
              onClose={hidePrompt}
              // Backward compatibility
              onRegister={handleRegister}
              onSkip={handleSkip}
              onRemindLater={handleRemindLater}
            />
          )}

          {/* Registration Form */}
          {showForm && (
            <RegistrationForm
              onSubmit={handleFormSubmit}
              onBack={handleFormBack}
              isLoading={isRegistrationLoading}
            />
          )}
        </div>
      </>
    </MobileErrorBoundary>
  );

};

export default ExplorePage;
