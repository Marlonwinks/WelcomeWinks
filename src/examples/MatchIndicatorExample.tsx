import React, { useState } from 'react';
import { BusinessCard } from '@/components/business/BusinessCard';
import { PreferenceMatchDetails } from '@/components/business/PreferenceMatchDetails';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RelevanceScore } from '@/types/businessAttributes';
import { DiningPreferences, DEFAULT_DINING_PREFERENCES } from '@/types/preferences';

/**
 * Example component demonstrating the match indicator integration
 * This shows how BusinessCard displays match quality and opens detailed breakdown
 */
export const MatchIndicatorExample: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  // Example relevance score
  const exampleScore: RelevanceScore = {
    businessId: 'example-123',
    totalScore: 85,
    breakdown: {
      cuisineScore: 100,
      priceScore: 75,
      dietaryScore: 90,
      ambianceScore: 80,
      distanceScore: 95,
      ratingScore: 85,
      featuresScore: 70,
    },
    matchedPreferences: ['cuisine', 'dietary', 'distance', 'rating'],
    unmatchedPreferences: ['price', 'ambiance', 'features'],
  };

  // Example user preferences
  const examplePreferences: DiningPreferences = {
    ...DEFAULT_DINING_PREFERENCES,
    cuisines: {
      preferred: ['italian', 'mexican'],
      disliked: [],
      importance: 'high',
    },
    dietary: {
      restrictions: ['vegetarian-options'],
      importance: 'must-have',
    },
    distance: {
      maxDistance: 5,
      importance: 'high',
    },
  };

  return (
    <div className="p-8 space-y-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Match Indicator Example</h2>
        <p className="text-muted-foreground mb-6">
          Click the match indicator badge to see detailed preference breakdown
        </p>

        <BusinessCard
          name="Bella Italia Restaurant"
          category="italian_restaurant"
          address="123 Main Street, Downtown"
          googleRating={4.5}
          googleTotalMarks={250}
          winksScore={4.2}
          totalMarks={45}
          relevanceScore={exampleScore}
          onMatchClick={() => setShowDetails(true)}
        />
      </div>

      {/* Match Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bella Italia Restaurant</DialogTitle>
          </DialogHeader>
          <PreferenceMatchDetails
            score={exampleScore}
            preferences={examplePreferences}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
