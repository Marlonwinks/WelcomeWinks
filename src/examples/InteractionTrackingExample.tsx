/**
 * Interaction Tracking Example
 * 
 * This example demonstrates how to use the interaction tracking system
 * to monitor user behavior and generate preference suggestions.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePreferencePersistence } from '@/hooks/usePreferencePersistence';
import { preferenceSuggestionsService } from '@/services/preferenceSuggestions.service';
import { PreferenceSuggestion } from '@/services/preferenceSuggestions.service';

export const InteractionTrackingExample: React.FC = () => {
  const {
    preferences,
    trackBusinessView,
    trackBusinessSave,
    trackBusinessRating,
  } = usePreferencePersistence();

  const [suggestions, setSuggestions] = useState<PreferenceSuggestion[]>([]);

  // Example: Track a business view
  const handleTrackView = () => {
    const businessId = 'example-business-123';
    const durationSeconds = 45; // User spent 45 seconds viewing
    
    trackBusinessView(businessId, durationSeconds);
    console.log('Tracked business view:', businessId);
  };

  // Example: Track a business save
  const handleTrackSave = () => {
    const businessId = 'example-business-123';
    
    trackBusinessSave(businessId, 'save');
    console.log('Tracked business save:', businessId);
  };

  // Example: Track a business rating
  const handleTrackRating = () => {
    const businessId = 'example-business-123';
    const rating = 4.5;
    
    trackBusinessRating(businessId, rating);
    console.log('Tracked business rating:', businessId, rating);
  };

  // Example: Generate suggestions
  const handleGenerateSuggestions = async () => {
    try {
      const generated = await preferenceSuggestionsService.generateSuggestions(
        preferences.dining
      );
      setSuggestions(generated);
      console.log('Generated suggestions:', generated);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    }
  };

  // Display interaction statistics
  const stats = {
    totalViews: preferences.dining.learningData.viewedBusinesses?.length || 0,
    totalSaves: preferences.dining.learningData.savedBusinesses?.length || 0,
    totalRatings: preferences.dining.learningData.ratedBusinesses?.length || 0,
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Interaction Tracking Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Interaction Statistics */}
          <div>
            <h3 className="font-medium mb-3">Current Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.totalViews}</div>
                <div className="text-sm text-muted-foreground">Views</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.totalSaves}</div>
                <div className="text-sm text-muted-foreground">Saves</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.totalRatings}</div>
                <div className="text-sm text-muted-foreground">Ratings</div>
              </div>
            </div>
          </div>

          {/* Tracking Actions */}
          <div>
            <h3 className="font-medium mb-3">Track Interactions</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleTrackView} variant="outline">
                Track View
              </Button>
              <Button onClick={handleTrackSave} variant="outline">
                Track Save
              </Button>
              <Button onClick={handleTrackRating} variant="outline">
                Track Rating
              </Button>
              <Button onClick={handleGenerateSuggestions} variant="default">
                Generate Suggestions
              </Button>
            </div>
          </div>

          {/* Suggestions Display */}
          {suggestions.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Generated Suggestions</h3>
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{suggestion.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.description}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {Math.round(suggestion.confidence * 100)}% confident
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {suggestion.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Data Display */}
          <div>
            <h3 className="font-medium mb-3">Learning Data</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Viewed Businesses:</span>{' '}
                {preferences.dining.learningData.viewedBusinesses?.join(', ') || 'None'}
              </div>
              <div>
                <span className="font-medium">Saved Businesses:</span>{' '}
                {preferences.dining.learningData.savedBusinesses?.join(', ') || 'None'}
              </div>
              <div>
                <span className="font-medium">Rated Businesses:</span>{' '}
                {preferences.dining.learningData.ratedBusinesses?.length || 0} ratings
              </div>
            </div>
          </div>

          {/* Usage Notes */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Usage Notes</h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Views are only tracked if duration is 3+ seconds</li>
              <li>Suggestions require at least 5 total interactions</li>
              <li>Confidence levels: High (80%+), Medium (60-80%), Low (&lt;60%)</li>
              <li>All data is stored locally in preferences</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Integration Examples
 */

// Example 1: Track view in BusinessPage
// useEffect(() => {
//   const startTime = new Date();
//   return () => {
//     const endTime = new Date();
//     const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
//     trackBusinessView(businessId, duration);
//   };
// }, [businessId, trackBusinessView]);

// Example 2: Track save action
// const handleSaveClick = () => {
//   const action = isSaved ? 'unsave' : 'save';
//   trackBusinessSave(businessId, action);
//   setIsSaved(!isSaved);
// };

// Example 3: Track rating submission
// const handleSubmitRating = async (rating: number) => {
//   await submitRatingToFirebase(businessId, rating);
//   trackBusinessRating(businessId, rating);
// };

// Example 4: Display suggestions in ProfilePage
// <PreferenceSuggestions
//   variant="card"
//   maxSuggestions={3}
//   onSuggestionsApplied={() => {
//     toast({ title: 'Preferences updated' });
//   }}
// />
