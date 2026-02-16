import React, { useState, useCallback } from 'react';
import { MapPin, Edit3, Check, X, Navigation, History, Trash2 } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Separator } from './separator';
import { ScrollArea } from './scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { LocationData } from '../../types/onboarding';
import { useLocation } from '../../contexts/LocationProvider';
import { usePreferencePersistence } from '../../hooks/usePreferencePersistence';
import { usePlacesAutocomplete } from '../../hooks/usePlacesAutocomplete';
import { cn } from '../../lib/utils';

interface LocationModifierProps {
  variant?: 'inline' | 'modal' | 'compact';
  showHistory?: boolean;
  showCurrentLocation?: boolean;
  onLocationChanged?: (location: LocationData) => void;
  className?: string;
}

export const LocationModifier: React.FC<LocationModifierProps> = ({
  variant = 'inline',
  showHistory = true,
  showCurrentLocation = true,
  onLocationChanged,
  className,
}) => {
  const { location, updateManualLocation, detectLocation } = useLocation();
  const { 
    getLocationHistory, 
    rememberLocation, 
    updateLocationPreferences,
    preferences 
  } = usePreferencePersistence();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  
  const {
    suggestions,
    isLoading: isLoadingSuggestions,
    searchPlaces,
    clearSuggestions,
  } = usePlacesAutocomplete();

  const locationHistory = getLocationHistory();

  // Handle location detection
  const handleDetectLocation = useCallback(async () => {
    setIsDetecting(true);
    try {
      await detectLocation();
    } catch (error) {
      console.error('Failed to detect location:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [detectLocation]);

  // Handle manual location update
  const handleLocationUpdate = useCallback((newLocation: LocationData) => {
    updateManualLocation(newLocation);
    rememberLocation(newLocation);
    onLocationChanged?.(newLocation);
    setIsEditing(false);
    setEditValue('');
    clearSuggestions();
  }, [updateManualLocation, rememberLocation, onLocationChanged, clearSuggestions]);

  // Handle edit mode
  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setEditValue(location.city || '');
  }, [location.city]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
    clearSuggestions();
  }, [clearSuggestions]);

  // Handle search input
  const handleSearchChange = useCallback((value: string) => {
    setEditValue(value);
    if (value.trim()) {
      searchPlaces(value);
    } else {
      clearSuggestions();
    }
  }, [searchPlaces, clearSuggestions]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    const newLocation: LocationData = {
      latitude: suggestion.geometry?.location?.lat() || 0,
      longitude: suggestion.geometry?.location?.lng() || 0,
      city: suggestion.name || suggestion.formatted_address,
      address: suggestion.formatted_address,
      source: 'manual',
      accuracy: null,
      timestamp: new Date(),
      userConfirmed: true,
      error: null,
    };
    
    handleLocationUpdate(newLocation);
  }, [handleLocationUpdate]);

  // Handle history item selection
  const handleHistorySelect = useCallback((historicalLocation: LocationData) => {
    handleLocationUpdate({
      ...historicalLocation,
      timestamp: new Date(),
      userConfirmed: true,
    });
  }, [handleLocationUpdate]);

  // Get location display text
  const getLocationDisplayText = () => {
    if (location.error) {
      return 'Location unavailable';
    }
    if (!location.city && location.latitude === null && location.longitude === null) {
      return 'No location set';
    }
    return location.city || `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`;
  };

  // Get location source badge
  const getSourceBadge = () => {
    if (!location.source) return null;
    
    const sourceConfig = {
      gps: { label: 'GPS', variant: 'default' as const, icon: Navigation },
      ip: { label: 'IP', variant: 'secondary' as const, icon: MapPin },
      manual: { label: 'Manual', variant: 'outline' as const, icon: Edit3 },
    };
    
    const config = sourceConfig[location.source];
    if (!config) return null;
    
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="text-xs">
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="flex items-center space-x-1 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="truncate max-w-32">{getLocationDisplayText()}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartEdit}
          className="h-6 w-6 p-0"
        >
          <Edit3 className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  // Render modal variant
  if (variant === 'modal') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className={cn('flex items-center gap-2', className)}
            aria-label="Change location"
          >
            <MapPin className="w-4 h-4" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] uppercase text-muted-foreground">Change Location</span>
              <span className="text-sm font-medium max-w-32 truncate">
                {getLocationDisplayText()}
              </span>
            </div>
            <Edit3 className="w-4 h-4 ml-1" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Location</DialogTitle>
          </DialogHeader>
          <LocationModifier
            variant="inline"
            showHistory={showHistory}
            showCurrentLocation={showCurrentLocation}
            onLocationChanged={onLocationChanged}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Render inline variant (default)
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Your Location</span>
          </div>
          {getSourceBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current location display */}
        {showCurrentLocation && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editValue}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Enter city or address..."
                      className="w-full"
                      autoFocus
                    />
                    
                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <Card className="border shadow-sm">
                        <ScrollArea className="max-h-32">
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionSelect(suggestion)}
                              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                            >
                              <div className="font-medium">{suggestion.name}</div>
                              <div className="text-muted-foreground text-xs">
                                {suggestion.formatted_address}
                              </div>
                            </button>
                          ))}
                        </ScrollArea>
                      </Card>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (editValue.trim()) {
                            // Handle manual text entry
                            const newLocation: LocationData = {
                              latitude: null,
                              longitude: null,
                              city: editValue.trim(),
                              address: editValue.trim(),
                              source: 'manual',
                              accuracy: null,
                              timestamp: new Date(),
                              userConfirmed: true,
                              error: null,
                            };
                            handleLocationUpdate(newLocation);
                          }
                        }}
                        disabled={!editValue.trim()}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{getLocationDisplayText()}</div>
                      {location.address && location.address !== location.city && (
                        <div className="text-sm text-muted-foreground">
                          {location.address}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEdit}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Auto-detect button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetectLocation}
              disabled={isDetecting}
              className="w-full"
            >
              <Navigation className={cn('w-4 h-4 mr-2', isDetecting && 'animate-spin')} />
              {isDetecting ? 'Detecting...' : 'Use Current Location'}
            </Button>
          </div>
        )}

        {/* Location history */}
        {showHistory && locationHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center">
                  <History className="w-4 h-4 mr-2" />
                  Recent Locations
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateLocationPreferences({ locationHistory: [] })}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              
              <ScrollArea className="max-h-32">
                <div className="space-y-1">
                  {locationHistory.slice(0, 5).map((histLocation, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistorySelect(histLocation)}
                      className="w-full text-left px-2 py-1 rounded hover:bg-muted transition-colors text-sm"
                    >
                      <div className="font-medium">{histLocation.city}</div>
                      {histLocation.address && histLocation.address !== histLocation.city && (
                        <div className="text-xs text-muted-foreground truncate">
                          {histLocation.address}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Specialized variants
export const CompactLocationModifier: React.FC<Omit<LocationModifierProps, 'variant'>> = (props) => (
  <LocationModifier {...props} variant="compact" />
);

export const ModalLocationModifier: React.FC<Omit<LocationModifierProps, 'variant'>> = (props) => (
  <LocationModifier {...props} variant="modal" />
);

export const InlineLocationModifier: React.FC<Omit<LocationModifierProps, 'variant'>> = (props) => (
  <LocationModifier {...props} variant="inline" />
);
