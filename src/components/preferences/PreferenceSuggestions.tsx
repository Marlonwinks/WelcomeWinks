import React, { useState, useEffect } from 'react';
import { Lightbulb, X, Check, TrendingUp, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePreferencePersistence } from '@/hooks/usePreferencePersistence';
import { 
  PreferenceSuggestion, 
  preferenceSuggestionsService 
} from '@/services/preferenceSuggestions.service';
import { DiningPreferences } from '@/types/preferences';

interface PreferenceSuggestionsProps {
  /** Whether to show as a compact notification or full card */
  variant?: 'card' | 'notification';
  /** Maximum number of suggestions to show */
  maxSuggestions?: number;
  /** Callback when suggestions are applied */
  onSuggestionsApplied?: () => void;
}

export const PreferenceSuggestions: React.FC<PreferenceSuggestionsProps> = ({
  variant = 'card',
  maxSuggestions = 3,
  onSuggestionsApplied,
}) => {
  const { preferences, updateDiningPreferences } = usePreferencePersistence();
  const { toast } = useToast();
  
  const [suggestions, setSuggestions] = useState<PreferenceSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  // Load suggestions on mount
  useEffect(() => {
    loadSuggestions();
  }, [preferences.dining]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const generated = await preferenceSuggestionsService.generateSuggestions(
        preferences.dining
      );
      setSuggestions(generated.slice(0, maxSuggestions));
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = (suggestion: PreferenceSuggestion) => {
    try {
      // Apply the suggestion based on type
      const updates: Partial<DiningPreferences> = {};

      switch (suggestion.type) {
        case 'cuisine':
          updates.cuisines = {
            ...preferences.dining.cuisines,
            preferred: suggestion.suggestedValue,
          };
          break;

        case 'price':
          updates.priceRange = {
            ...preferences.dining.priceRange,
            ...suggestion.suggestedValue,
          };
          break;

        case 'dietary':
          updates.dietary = {
            ...preferences.dining.dietary,
            restrictions: suggestion.suggestedValue,
          };
          break;

        case 'ambiance':
          updates.ambiance = {
            ...preferences.dining.ambiance,
            preferred: suggestion.suggestedValue,
          };
          break;

        case 'features':
          updates.features = {
            ...preferences.dining.features,
            preferred: suggestion.suggestedValue,
          };
          break;
      }

      updateDiningPreferences(updates);

      // Mark as applied
      setAppliedSuggestions(prev => new Set(prev).add(suggestion.id));

      // Remove from suggestions list
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

      toast({
        title: 'Preference updated',
        description: suggestion.title,
      });

      if (onSuggestionsApplied) {
        onSuggestionsApplied();
      }
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      toast({
        title: 'Failed to update preference',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleDeclineSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    
    if (suggestions.length <= 1) {
      setDismissed(true);
    }
  };

  const handleDismissAll = () => {
    setDismissed(true);
  };

  // Don't show if dismissed or no suggestions
  if (dismissed || (!loading && suggestions.length === 0)) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Notification variant (compact)
  if (variant === 'notification') {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-blue-900">
              {suggestions.length} preference suggestion{suggestions.length !== 1 ? 's' : ''} available
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Based on your recent activity
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            onClick={() => {
              // Scroll to suggestions section or expand
              const element = document.getElementById('preference-suggestions');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            View
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Card variant (full)
  return (
    <Card id="preference-suggestions" className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <Lightbulb className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-blue-900">
                Preference Suggestions
              </CardTitle>
              <CardDescription className="text-blue-700">
                Based on your recent activity
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            onClick={handleDismissAll}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map(suggestion => (
          <SuggestionItem
            key={suggestion.id}
            suggestion={suggestion}
            onAccept={() => handleAcceptSuggestion(suggestion)}
            onDecline={() => handleDeclineSuggestion(suggestion.id)}
            isApplied={appliedSuggestions.has(suggestion.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

interface SuggestionItemProps {
  suggestion: PreferenceSuggestion;
  onAccept: () => void;
  onDecline: () => void;
  isApplied: boolean;
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({
  suggestion,
  onAccept,
  onDecline,
  isApplied,
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-700 border-green-200';
    if (confidence >= 0.6) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };

  if (isApplied) {
    return (
      <div className="p-4 rounded-lg border border-green-200 bg-green-50">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Applied: {suggestion.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-blue-200 bg-white space-y-3">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-medium text-blue-900">{suggestion.title}</h4>
            <p className="text-sm text-blue-700 mt-1">{suggestion.description}</p>
          </div>
          <Badge
            variant="outline"
            className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {getConfidenceLabel(suggestion.confidence)}
          </Badge>
        </div>
        
        <p className="text-xs text-blue-600 italic">
          {suggestion.reason}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onAccept}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Check className="h-4 w-4 mr-1" />
          Apply
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDecline}
          className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <X className="h-4 w-4 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  );
};
