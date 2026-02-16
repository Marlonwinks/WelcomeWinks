import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Utensils, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DiningPreferences, PreferenceImportance } from '@/types/preferences';
import { 
  CUISINE_TYPES, 
  DIETARY_OPTIONS, 
  AMBIANCE_TAGS, 
  FEATURE_OPTIONS 
} from '@/types/businessAttributes';

interface DiningPreferencesManagerProps {
  preferences: DiningPreferences;
  onChange: (preferences: DiningPreferences) => void;
}

export const DiningPreferencesManager: React.FC<DiningPreferencesManagerProps> = ({
  preferences,
  onChange,
}) => {
  const [localPreferences, setLocalPreferences] = useState<DiningPreferences>(preferences);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus management - set focus to first interactive element on mount
  useEffect(() => {
    const firstFocusable = containerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }, []);

  const updatePreferences = (updates: Partial<DiningPreferences>) => {
    const updated = { ...localPreferences, ...updates };
    setLocalPreferences(updated);
    onChange(updated);
  };

  // Cuisine handlers with keyboard support
  const toggleCuisine = useCallback((cuisine: string, type: 'preferred' | 'disliked') => {
    const currentList = localPreferences.cuisines[type];
    const otherType = type === 'preferred' ? 'disliked' : 'preferred';
    const otherList = localPreferences.cuisines[otherType];
    
    let newList: string[];
    let newOtherList = otherList;
    
    if (currentList.includes(cuisine)) {
      newList = currentList.filter(c => c !== cuisine);
    } else {
      newList = [...currentList, cuisine];
      // Remove from other list if present
      newOtherList = otherList.filter(c => c !== cuisine);
    }
    
    updatePreferences({
      cuisines: {
        ...localPreferences.cuisines,
        [type]: newList,
        [otherType]: newOtherList,
      },
    });
  }, [localPreferences.cuisines]);

  // Dietary restrictions handlers with keyboard support
  const toggleDietaryRestriction = useCallback((restriction: string) => {
    const current = localPreferences.dietary.restrictions;
    const updated = current.includes(restriction)
      ? current.filter(r => r !== restriction)
      : [...current, restriction];
    
    updatePreferences({
      dietary: {
        ...localPreferences.dietary,
        restrictions: updated,
      },
    });
  }, [localPreferences.dietary.restrictions]);

  // Ambiance handlers with keyboard support
  const toggleAmbiance = useCallback((ambiance: string) => {
    const current = localPreferences.ambiance.preferred;
    const updated = current.includes(ambiance)
      ? current.filter(a => a !== ambiance)
      : [...current, ambiance];
    
    updatePreferences({
      ambiance: {
        ...localPreferences.ambiance,
        preferred: updated,
      },
    });
  }, [localPreferences.ambiance.preferred]);

  // Features handlers with keyboard support
  const toggleFeature = useCallback((feature: string) => {
    const current = localPreferences.features.preferred;
    const updated = current.includes(feature)
      ? current.filter(f => f !== feature)
      : [...current, feature];
    
    updatePreferences({
      features: {
        ...localPreferences.features,
        preferred: updated,
      },
    });
  }, [localPreferences.features.preferred]);

  // Keyboard navigation handler for badge groups
  const handleBadgeKeyDown = useCallback((
    e: React.KeyboardEvent,
    action: () => void,
    items: readonly string[],
    currentIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      const nextElement = e.currentTarget.parentElement?.children[nextIndex] as HTMLElement;
      nextElement?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
      const prevElement = e.currentTarget.parentElement?.children[prevIndex] as HTMLElement;
      prevElement?.focus();
    }
  }, []);

  // Importance selector component
  const ImportanceSelector: React.FC<{
    value: PreferenceImportance | 'high' | 'medium' | 'low';
    onChange: (value: any) => void;
    allowMustHave?: boolean;
    label?: string;
  }> = ({ value, onChange, allowMustHave = true, label = 'Importance level' }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowMustHave && <SelectItem value="must-have">Must Have</SelectItem>}
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div ref={containerRef} className="space-y-6" role="form" aria-label="Dining preferences form">
      {/* Cuisine Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Cuisine Preferences
            </CardTitle>
            <ImportanceSelector
              value={localPreferences.cuisines.importance}
              onChange={(value: PreferenceImportance) =>
                updatePreferences({
                  cuisines: { ...localPreferences.cuisines, importance: value },
                })
              }
              label="Cuisine preference importance level"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Preferred Cuisines</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Preferred cuisines">
              {CUISINE_TYPES.map((cuisine, index) => {
                const isPreferred = localPreferences.cuisines.preferred.includes(cuisine);
                const isDisliked = localPreferences.cuisines.disliked.includes(cuisine);
                
                return (
                  <Badge
                    key={cuisine}
                    variant={isPreferred ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      isDisliked ? 'opacity-50 line-through' : ''
                    }`}
                    onClick={() => toggleCuisine(cuisine, 'preferred')}
                    onKeyDown={(e) => handleBadgeKeyDown(e, () => toggleCuisine(cuisine, 'preferred'), CUISINE_TYPES, index)}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isPreferred}
                    aria-label={`${cuisine} cuisine ${isPreferred ? 'selected' : 'not selected'}`}
                  >
                    {cuisine}
                  </Badge>
                );
              })}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <Label className="text-sm font-medium mb-2 block">Disliked Cuisines</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Disliked cuisines">
              {CUISINE_TYPES.map((cuisine, index) => {
                const isDisliked = localPreferences.cuisines.disliked.includes(cuisine);
                
                return isDisliked ? (
                  <Badge
                    key={cuisine}
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => toggleCuisine(cuisine, 'disliked')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCuisine(cuisine, 'disliked');
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Remove ${cuisine} from disliked cuisines`}
                  >
                    {cuisine}
                    <X className="h-3 w-3 ml-1" aria-hidden="true" />
                  </Badge>
                ) : null;
              })}
              {localPreferences.cuisines.disliked.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Click any cuisine above to mark as disliked
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Price Range</CardTitle>
            <ImportanceSelector
              value={localPreferences.priceRange.importance}
              onChange={(value: PreferenceImportance) =>
                updatePreferences({
                  priceRange: { ...localPreferences.priceRange, importance: value },
                })
              }
              label="Price range importance level"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Minimum: {'$'.repeat(localPreferences.priceRange.min)}</span>
              <span>Maximum: {'$'.repeat(localPreferences.priceRange.max)}</span>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Label className="text-xs" htmlFor="price-min-slider">Min</Label>
                <Slider
                  id="price-min-slider"
                  value={[localPreferences.priceRange.min]}
                  onValueChange={([value]) =>
                    updatePreferences({
                      priceRange: {
                        ...localPreferences.priceRange,
                        min: Math.min(value, localPreferences.priceRange.max),
                      },
                    })
                  }
                  min={1}
                  max={4}
                  step={1}
                  aria-label={`Minimum price level: ${localPreferences.priceRange.min} out of 4`}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs" htmlFor="price-max-slider">Max</Label>
                <Slider
                  id="price-max-slider"
                  value={[localPreferences.priceRange.max]}
                  onValueChange={([value]) =>
                    updatePreferences({
                      priceRange: {
                        ...localPreferences.priceRange,
                        max: Math.max(value, localPreferences.priceRange.min),
                      },
                    })
                  }
                  min={1}
                  max={4}
                  step={1}
                  aria-label={`Maximum price level: ${localPreferences.priceRange.max} out of 4`}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              $ = Budget-friendly, $$$$ = Fine dining
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dietary Restrictions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dietary Restrictions</CardTitle>
            <ImportanceSelector
              value={localPreferences.dietary.importance}
              onChange={(value: PreferenceImportance) =>
                updatePreferences({
                  dietary: { ...localPreferences.dietary, importance: value },
                })
              }
              label="Dietary restrictions importance level"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DIETARY_OPTIONS.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`dietary-${option}`}
                  checked={localPreferences.dietary.restrictions.includes(option)}
                  onCheckedChange={() => toggleDietaryRestriction(option)}
                />
                <Label
                  htmlFor={`dietary-${option}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.replace(/-/g, ' ')}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ambiance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ambiance</CardTitle>
            <ImportanceSelector
              value={localPreferences.ambiance.importance}
              onChange={(value: 'high' | 'medium' | 'low') =>
                updatePreferences({
                  ambiance: { ...localPreferences.ambiance, importance: value },
                })
              }
              allowMustHave={false}
              label="Ambiance preference importance level"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Ambiance preferences">
            {AMBIANCE_TAGS.map((tag, index) => {
              const isSelected = localPreferences.ambiance.preferred.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleAmbiance(tag)}
                  onKeyDown={(e) => handleBadgeKeyDown(e, () => toggleAmbiance(tag), AMBIANCE_TAGS, index)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${tag} ambiance ${isSelected ? 'selected' : 'not selected'}`}
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Distance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Maximum Distance</CardTitle>
            <ImportanceSelector
              value={localPreferences.distance.importance}
              onChange={(value: 'high' | 'medium' | 'low') =>
                updatePreferences({
                  distance: { ...localPreferences.distance, importance: value },
                })
              }
              allowMustHave={false}
              label="Distance preference importance level"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Distance</span>
              <span className="font-medium" aria-live="polite">{localPreferences.distance.maxDistance} miles</span>
            </div>
            <Slider
              id="distance-slider"
              value={[localPreferences.distance.maxDistance]}
              onValueChange={([value]) =>
                updatePreferences({
                  distance: { ...localPreferences.distance, maxDistance: value },
                })
              }
              min={1}
              max={25}
              step={1}
              aria-label={`Maximum distance: ${localPreferences.distance.maxDistance} miles`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rating Thresholds */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rating Thresholds</CardTitle>
            <ImportanceSelector
              value={localPreferences.rating.importance}
              onChange={(value: 'high' | 'medium' | 'low') =>
                updatePreferences({
                  rating: { ...localPreferences.rating, importance: value },
                })
              }
              allowMustHave={false}
              label="Rating threshold importance level"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm" htmlFor="google-rating-slider">Minimum Google Rating</Label>
            <div className="flex justify-between text-sm mb-1">
              <span>Rating</span>
              <span className="font-medium" aria-live="polite">{localPreferences.rating.minRating.toFixed(1)} stars</span>
            </div>
            <Slider
              id="google-rating-slider"
              value={[localPreferences.rating.minRating]}
              onValueChange={([value]) =>
                updatePreferences({
                  rating: { ...localPreferences.rating, minRating: value },
                })
              }
              min={0}
              max={5}
              step={0.5}
              aria-label={`Minimum Google rating: ${localPreferences.rating.minRating.toFixed(1)} stars out of 5`}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label className="text-sm" htmlFor="winks-score-slider">Minimum Winks Score (Ignored if Political View is set)</Label>
            <div className="flex justify-between text-sm mb-1">
              <span>Score</span>
              <span className="font-medium" aria-live="polite">
                {localPreferences.rating.minWinksScore !== null
                  ? `${localPreferences.rating.minWinksScore.toFixed(1)}`
                  : 'No preference'}
              </span>
            </div>
            <Slider
              id="winks-score-slider"
              value={[localPreferences.rating.minWinksScore ?? 0]}
              onValueChange={([value]) =>
                updatePreferences({
                  rating: { ...localPreferences.rating, minWinksScore: value },
                })
              }
              min={0}
              max={100} // Changed max to 100 based on previous findings
              step={1}
              aria-label={`Minimum Winks score: ${localPreferences.rating.minWinksScore !== null ? localPreferences.rating.minWinksScore.toFixed(1) : '0'} out of 100`}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updatePreferences({
                  rating: { ...localPreferences.rating, minWinksScore: null },
                })
              }
              className="w-full"
            >
              Clear Winks Score Preference
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Political View Preference */}
      <Card>
        <CardHeader>
          <CardTitle>WW Threshold Preference</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-sm font-medium mb-2 block">Political Perspective</Label>
          <Select
            value={localPreferences.politicalView}
            onValueChange={(value: 'liberal' | 'conservative' | 'none') =>
              updatePreferences({ politicalView: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a political perspective" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Use explicit Winks Score)</SelectItem>
              <SelectItem value="liberal">Liberal (Prioritize mid to higher WW ratings)</SelectItem>
              <SelectItem value="conservative">Conservative (Prioritize mid to lower WW ratings)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Choosing a political perspective will dynamically adjust the Winks Score threshold, overriding the explicit "Minimum Winks Score" setting above.
          </p>
        </CardContent>
      </Card>
      {/* Features */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Preferred Features</CardTitle>
            <ImportanceSelector
              value={localPreferences.features.importance}
              onChange={(value: 'high' | 'medium' | 'low') =>
                updatePreferences({
                  features: { ...localPreferences.features, importance: value },
                })
              }
              allowMustHave={false}
              label="Features preference importance level"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {FEATURE_OPTIONS.map((feature) => (
              <div key={feature} className="flex items-center space-x-2">
                <Checkbox
                  id={`feature-${feature}`}
                  checked={localPreferences.features.preferred.includes(feature)}
                  onCheckedChange={() => toggleFeature(feature)}
                />
                <Label
                  htmlFor={`feature-${feature}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {feature.replace(/-/g, ' ')}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
