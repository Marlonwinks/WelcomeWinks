import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { DiningPreferences, DEFAULT_DINING_PREFERENCES } from '@/types/preferences';

// Available options for each preference category
const CUISINE_OPTIONS = [
  'Italian', 'Mexican', 'Japanese', 'Chinese', 'Indian', 'Thai',
  'American', 'Mediterranean', 'French', 'Korean', 'Vietnamese', 'Greek'
];

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher',
  'Dairy-Free', 'Nut-Free', 'Pescatarian'
];

const AMBIANCE_OPTIONS = [
  'Casual', 'Fine Dining', 'Family-Friendly', 'Romantic',
  'Lively', 'Quiet', 'Trendy', 'Cozy'
];

const FEATURE_OPTIONS = [
  'Outdoor Seating', 'WiFi', 'Parking', 'Wheelchair Accessible',
  'Pet-Friendly', 'Live Music', 'Reservations', 'Takeout'
];

const POLITICAL_OPTIONS = [
  { value: 'liberal', label: 'Liberal / Progressive' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'none', label: 'Moderate / No Preference' }
];

type WizardStep = 'address' | 'political' | 'cuisine' | 'price' | 'dietary' | 'other';

interface PreferenceSetupWizardProps {
  onComplete: (preferences: DiningPreferences) => void;
  onSkip: () => void;
  onHomeAddressChange?: (address: string) => void;
  initialPreferences?: DiningPreferences;
}

export const PreferenceSetupWizard: React.FC<PreferenceSetupWizardProps> = ({
  onComplete,
  onSkip,
  onHomeAddressChange,
  initialPreferences = DEFAULT_DINING_PREFERENCES,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('address');
  const [preferences, setPreferences] = useState<DiningPreferences>(initialPreferences);
  const [homeAddress, setHomeAddress] = useState('');

  // Refs for Google Autocomplete
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const steps: WizardStep[] = ['address', 'political', 'cuisine', 'price', 'dietary', 'other'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Initialize Autocomplete
  useEffect(() => {
    if (currentStep === 'address' && addressInputRef.current && window.google && window.google.maps && window.google.maps.places) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.formatted_address) {
          setHomeAddress(place.formatted_address);
          if (onHomeAddressChange) {
            onHomeAddressChange(place.formatted_address);
          }
        }
      });
    }
  }, [currentStep, onHomeAddressChange]);

  const handleNext = () => {
    if (currentStep === 'address' && onHomeAddressChange) {
      // Ensure current value is saved if user didn't select from dropdown
      onHomeAddressChange(homeAddress);
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    } else {
      onComplete(preferences);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSkipStep = () => {
    handleNext();
  };

  const setPoliticalView = (view: 'liberal' | 'conservative' | 'none') => {
    setPreferences(prev => ({
      ...prev,
      politicalView: view
    }));
  };

  const toggleCuisine = (cuisine: string) => {
    const lowerCuisine = cuisine.toLowerCase();
    setPreferences(prev => ({
      ...prev,
      cuisines: {
        ...prev.cuisines,
        preferred: prev.cuisines.preferred.includes(lowerCuisine)
          ? prev.cuisines.preferred.filter(c => c !== lowerCuisine)
          : [...prev.cuisines.preferred, lowerCuisine],
      },
    }));
  };

  const toggleDietary = (restriction: string) => {
    const lowerRestriction = restriction.toLowerCase();
    setPreferences(prev => ({
      ...prev,
      dietary: {
        ...prev.dietary,
        restrictions: prev.dietary.restrictions.includes(lowerRestriction)
          ? prev.dietary.restrictions.filter(r => r !== lowerRestriction)
          : [...prev.dietary.restrictions, lowerRestriction],
      },
    }));
  };

  const toggleAmbiance = (ambiance: string) => {
    const lowerAmbiance = ambiance.toLowerCase().replace(/\s+/g, '-');
    setPreferences(prev => ({
      ...prev,
      ambiance: {
        ...prev.ambiance,
        preferred: prev.ambiance.preferred.includes(lowerAmbiance)
          ? prev.ambiance.preferred.filter(a => a !== lowerAmbiance)
          : [...prev.ambiance.preferred, lowerAmbiance],
      },
    }));
  };

  const toggleFeature = (feature: string) => {
    const lowerFeature = feature.toLowerCase().replace(/\s+/g, '-');
    setPreferences(prev => ({
      ...prev,
      features: {
        ...prev.features,
        preferred: prev.features.preferred.includes(lowerFeature)
          ? prev.features.preferred.filter(f => f !== lowerFeature)
          : [...prev.features.preferred, lowerFeature],
      },
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'address':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Where do you live?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We'll use this to notify you when you're exploring new areas away from home.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Home Address</Label>
              <Input
                id="address"
                ref={addressInputRef}
                placeholder="Enter your home address..."
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
              />
            </div>
          </div>
        );

      case 'political':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Community Perspective</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the perspective you'd like us to prioritize when showing Welcome scores. This stays private.
              </p>
            </div>
            <div className="grid gap-3">
              {POLITICAL_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${preferences.politicalView === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'}
                  `}
                  onClick={() => setPoliticalView(option.value as any)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.label}</span>
                    {preferences.politicalView === option.value && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cuisine':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">What cuisines do you enjoy?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select all that apply. We'll prioritize restaurants with these cuisines.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map(cuisine => {
                const isSelected = preferences.cuisines.preferred.includes(cuisine.toLowerCase());
                return (
                  <Badge
                    key={cuisine}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer px-4 py-2 text-sm hover:scale-105 transition-transform"
                    onClick={() => toggleCuisine(cuisine)}
                  >
                    {isSelected && <Check className="h-3 w-3 mr-1" />}
                    {cuisine}
                  </Badge>
                );
              })}
            </div>
          </div>
        );

      case 'price':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">What's your preferred price range?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select the price levels you're comfortable with.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Price Range: {preferences.priceRange.min === preferences.priceRange.max
                    ? `${'$'.repeat(preferences.priceRange.min)}`
                    : `${'$'.repeat(preferences.priceRange.min)} - ${'$'.repeat(preferences.priceRange.max)}`}
                </Label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">$</span>
                  <Slider
                    min={1}
                    max={4}
                    step={1}
                    value={[preferences.priceRange.min, preferences.priceRange.max]}
                    onValueChange={([min, max]) => {
                      setPreferences(prev => ({
                        ...prev,
                        priceRange: { ...prev.priceRange, min, max },
                      }));
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">$$$$</span>
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Budget</span>
                  <span>Moderate</span>
                  <span>Upscale</span>
                  <span>Fine Dining</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'dietary':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Any dietary restrictions?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We'll prioritize places that accommodate your dietary needs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map(restriction => {
                const isSelected = preferences.dietary.restrictions.includes(restriction.toLowerCase());
                return (
                  <Badge
                    key={restriction}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer px-4 py-2 text-sm hover:scale-105 transition-transform"
                    onClick={() => toggleDietary(restriction)}
                  >
                    {isSelected && <Check className="h-3 w-3 mr-1" />}
                    {restriction}
                  </Badge>
                );
              })}
            </div>
          </div>
        );

      case 'other':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Additional preferences</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize your experience with ambiance and feature preferences.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Ambiance</Label>
                <div className="flex flex-wrap gap-2">
                  {AMBIANCE_OPTIONS.map(ambiance => {
                    const key = ambiance.toLowerCase().replace(/\s+/g, '-');
                    const isSelected = preferences.ambiance.preferred.includes(key);
                    return (
                      <Badge
                        key={ambiance}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer px-3 py-1.5 text-xs hover:scale-105 transition-transform"
                        onClick={() => toggleAmbiance(ambiance)}
                      >
                        {isSelected && <Check className="h-3 w-3 mr-1" />}
                        {ambiance}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Features</Label>
                <div className="flex flex-wrap gap-2">
                  {FEATURE_OPTIONS.map(feature => {
                    const key = feature.toLowerCase().replace(/\s+/g, '-');
                    const isSelected = preferences.features.preferred.includes(key);
                    return (
                      <Badge
                        key={feature}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer px-3 py-1.5 text-xs hover:scale-105 transition-transform"
                        onClick={() => toggleFeature(feature)}
                      >
                        {isSelected && <Check className="h-3 w-3 mr-1" />}
                        {feature}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>Set Up Your Dining Preferences</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Skip Setup
          </Button>
        </div>
        <CardDescription>
          Step {currentStepIndex + 1} of {steps.length}
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>

      <CardContent className="min-h-[300px]">
        {renderStepContent()}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStepIndex === 0 ? onSkip : handleBack}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {currentStepIndex === 0 ? 'Skip' : 'Back'}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleSkipStep}
          >
            Skip Step
          </Button>
          <Button onClick={handleNext}>
            {currentStepIndex === steps.length - 1 ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Complete
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
