import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Utensils, DollarSign, Leaf, Music, MapPin, Star, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RelevanceScore } from '@/types/businessAttributes';
import { DiningPreferences } from '@/types/preferences';

interface PreferenceMatchDetailsProps {
  score: RelevanceScore;
  preferences: DiningPreferences;
}

export const PreferenceMatchDetails: React.FC<PreferenceMatchDetailsProps> = ({
  score,
  preferences,
}) => {
  const { breakdown, matchedPreferences, unmatchedPreferences } = score;

  // Category icons mapping
  const categoryIcons: Record<string, React.ReactNode> = {
    cuisine: <Utensils className="h-4 w-4" />,
    price: <DollarSign className="h-4 w-4" />,
    dietary: <Leaf className="h-4 w-4" />,
    ambiance: <Music className="h-4 w-4" />,
    distance: <MapPin className="h-4 w-4" />,
    rating: <Star className="h-4 w-4" />,
    features: <Wifi className="h-4 w-4" />,
  };

  // Category labels mapping
  const categoryLabels: Record<string, string> = {
    cuisine: 'Cuisine Type',
    price: 'Price Range',
    dietary: 'Dietary Options',
    ambiance: 'Ambiance',
    distance: 'Distance',
    rating: 'Rating',
    features: 'Features',
  };

  // Get score color class with enhanced contrast for accessibility
  const getScoreColor = (categoryScore: number) => {
    if (categoryScore >= 80) return 'text-green-700 dark:text-green-300 contrast-more:text-green-900 contrast-more:dark:text-green-100';
    if (categoryScore >= 60) return 'text-blue-700 dark:text-blue-300 contrast-more:text-blue-900 contrast-more:dark:text-blue-100';
    if (categoryScore >= 40) return 'text-amber-800 dark:text-amber-300 contrast-more:text-amber-950 contrast-more:dark:text-amber-100';
    return 'text-gray-700 dark:text-gray-300 contrast-more:text-gray-900 contrast-more:dark:text-gray-100';
  };

  // Get explanation for each category
  const getExplanation = (category: string, categoryScore: number): string => {
    const isMatched = matchedPreferences.includes(category);
    
    switch (category) {
      case 'cuisine':
        if (categoryScore >= 80) return 'Matches your preferred cuisines';
        if (categoryScore >= 50) return 'Partially matches your cuisine preferences';
        return 'Does not match your preferred cuisines';
      
      case 'price':
        if (categoryScore >= 80) return 'Within your preferred price range';
        if (categoryScore >= 50) return 'Close to your preferred price range';
        return 'Outside your preferred price range';
      
      case 'dietary':
        if (categoryScore >= 80) return 'Meets all your dietary requirements';
        if (categoryScore >= 50) return 'Meets some dietary requirements';
        return 'Limited dietary options available';
      
      case 'ambiance':
        if (categoryScore >= 80) return 'Matches your preferred ambiance';
        if (categoryScore >= 50) return 'Neutral ambiance match';
        return 'Different ambiance than preferred';
      
      case 'distance':
        if (categoryScore >= 80) return 'Very close to your location';
        if (categoryScore >= 50) return 'Within reasonable distance';
        return 'Further than preferred';
      
      case 'rating':
        if (categoryScore >= 80) return 'Highly rated by others';
        if (categoryScore >= 50) return 'Good ratings';
        return 'Lower ratings';
      
      case 'features':
        if (categoryScore >= 80) return 'Has all your preferred features';
        if (categoryScore >= 50) return 'Has some preferred features';
        return 'Limited features available';
      
      default:
        return isMatched ? 'Matches your preferences' : 'Does not match preferences';
    }
  };

  // Check if user has set preferences for a category
  const hasPreferenceSet = (category: string): boolean => {
    switch (category) {
      case 'cuisine':
        return preferences.cuisines.preferred.length > 0 || preferences.cuisines.disliked.length > 0;
      case 'price':
        return preferences.priceRange.min > 1 || preferences.priceRange.max < 4;
      case 'dietary':
        return preferences.dietary.restrictions.length > 0;
      case 'ambiance':
        return preferences.ambiance.preferred.length > 0;
      case 'distance':
        return preferences.distance.maxDistance < 10;
      case 'rating':
        return preferences.rating.minRating > 0 || preferences.rating.minWinksScore !== null;
      case 'features':
        return preferences.features.preferred.length > 0;
      default:
        return false;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Preference Match Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          See how this place matches your dining preferences
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        <div className="space-y-3">
          {Object.entries(breakdown).map(([key, value]) => {
            const category = key.replace('Score', '');
            const isMatched = matchedPreferences.includes(category);
            const hasPreference = hasPreferenceSet(category);
            const categoryScore = value as number;

            if (!hasPreference) {
              return null; // Don't show categories without preferences set
            }

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'p-1.5 rounded-md border',
                      isMatched 
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 contrast-more:bg-green-200 contrast-more:dark:bg-green-800 contrast-more:border-green-500' 
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 contrast-more:bg-gray-200 contrast-more:dark:bg-gray-700'
                    )}>
                      {categoryIcons[category]}
                    </div>
                    <span className="font-medium text-sm">
                      {categoryLabels[category]}
                    </span>
                    {isMatched ? (
                      <Check className="h-4 w-4 text-green-700 dark:text-green-400 contrast-more:text-green-900 contrast-more:dark:text-green-200" aria-label="Matched" />
                    ) : (
                      <X className="h-4 w-4 text-gray-500 dark:text-gray-400 contrast-more:text-gray-900 contrast-more:dark:text-gray-200" aria-label="Not matched" />
                    )}
                  </div>
                  <span className={cn('text-sm font-bold', getScoreColor(categoryScore))}>
                    {Math.round(categoryScore)}%
                  </span>
                </div>

                {/* Progress bar with enhanced contrast */}
                <div 
                  className="w-full bg-gray-200 dark:bg-gray-700 contrast-more:bg-gray-300 contrast-more:dark:bg-gray-600 rounded-full h-1.5 overflow-hidden border border-gray-300 dark:border-gray-600"
                  role="progressbar"
                  aria-valuenow={Math.round(categoryScore)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${categoryLabels[category]} match: ${Math.round(categoryScore)}%`}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      categoryScore >= 80 && 'bg-green-600 dark:bg-green-500 contrast-more:bg-green-700 contrast-more:dark:bg-green-400',
                      categoryScore >= 60 && categoryScore < 80 && 'bg-blue-600 dark:bg-blue-500 contrast-more:bg-blue-700 contrast-more:dark:bg-blue-400',
                      categoryScore >= 40 && categoryScore < 60 && 'bg-amber-600 dark:bg-amber-500 contrast-more:bg-amber-700 contrast-more:dark:bg-amber-400',
                      categoryScore < 40 && 'bg-gray-500 dark:bg-gray-400 contrast-more:bg-gray-700 contrast-more:dark:bg-gray-300'
                    )}
                    style={{ width: `${categoryScore}%` }}
                  />
                </div>

                {/* Explanation */}
                <p className="text-xs text-muted-foreground pl-9">
                  {getExplanation(category, categoryScore)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Summary badges with enhanced contrast */}
        <div className="pt-4 border-t">
          <div className="flex flex-wrap gap-2" role="status" aria-label="Preference match summary">
            {matchedPreferences.length > 0 && (
              <Badge 
                variant="default" 
                className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border border-green-300 dark:border-green-700 contrast-more:bg-green-200 contrast-more:text-green-900 contrast-more:dark:bg-green-800 contrast-more:dark:text-green-100"
              >
                <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                {matchedPreferences.length} Matched
              </Badge>
            )}
            {unmatchedPreferences.length > 0 && (
              <Badge 
                variant="secondary" 
                className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 contrast-more:bg-gray-200 contrast-more:text-gray-900 contrast-more:dark:bg-gray-700 contrast-more:dark:text-gray-100"
              >
                <X className="h-3 w-3 mr-1" aria-hidden="true" />
                {unmatchedPreferences.length} Not Matched
              </Badge>
            )}
          </div>
        </div>

        {/* Why prioritized explanation */}
        {score.totalScore >= 60 && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-primary">
              Why this place was prioritized:
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {score.totalScore >= 80
                ? 'This place is an excellent match for your preferences, meeting most of your criteria.'
                : 'This place is a good match for your preferences, meeting several of your key criteria.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
