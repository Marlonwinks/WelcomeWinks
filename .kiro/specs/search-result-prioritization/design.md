# Design Document: Search Result Prioritization

## Overview

This feature enhances the 'Find a Place' workflow by implementing an intelligent prioritization system that ranks search results based on user-defined preferences. The system will integrate with the existing ExplorePage, leverage the current PreferencesProvider context, and extend the Firebase data model to store user dining preferences. The prioritization algorithm will calculate relevance scores for each business based on how well they match user preferences, ensuring the most suitable options appear first.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ExplorePage                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Search & Filter UI                                   │  │
│  │  - PlacesSearchBar                                    │  │
│  │  - Quick Filters                                      │  │
│  │  - Sort Options                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Preference-Based Prioritization Engine              │  │
│  │  - Fetch User Preferences                            │  │
│  │  - Calculate Relevance Scores                        │  │
│  │  - Apply Weighting                                   │  │
│  │  - Sort Results                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Results Display                                      │  │
│  │  - BusinessCard with Match Indicators                │  │
│  │  - Match Quality Badges                              │  │
│  │  - Preference Match Details                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│              PreferencesProvider Context                     │
│  - User Dining Preferences                                   │
│  - Preference Weights                                        │
│  - Learning Data                                             │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                  Firebase Firestore                          │
│  - userProfiles/{userId}/diningPreferences                   │
│  - businesses/{businessId} (extended with attributes)        │
└─────────────────────────────────────────────────────────────┘
```

### Component Integration

The feature integrates with existing components:
- **ExplorePage.tsx**: Main integration point for prioritized results
- **PreferencesProvider.tsx**: Extended to include dining preferences
- **BusinessCard.tsx**: Enhanced to show match quality indicators
- **ProfilePage.tsx**: New preferences management UI
- **Firebase**: Extended data models for preferences and business attributes

## Components and Interfaces

### 1. Dining Preferences Data Model

```typescript
// Extension to UserPreferences in usePreferencePersistence.tsx
export interface DiningPreferences {
  // Cuisine preferences
  cuisines: {
    preferred: string[]; // e.g., ['italian', 'mexican', 'japanese']
    disliked: string[]; // e.g., ['seafood']
    importance: 'must-have' | 'high' | 'medium' | 'low';
  };
  
  // Price range preferences
  priceRange: {
    min: number; // 1-4 (Google Places price level)
    max: number; // 1-4
    importance: 'must-have' | 'high' | 'medium' | 'low';
  };
  
  // Dietary restrictions
  dietary: {
    restrictions: string[]; // e.g., ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher']
    importance: 'must-have' | 'high' | 'medium' | 'low';
  };
  
  // Ambiance preferences
  ambiance: {
    preferred: string[]; // e.g., ['casual', 'fine-dining', 'family-friendly', 'romantic', 'lively']
    importance: 'high' | 'medium' | 'low';
  };
  
  // Distance preferences
  distance: {
    maxDistance: number; // in miles
    importance: 'high' | 'medium' | 'low';
  };
  
  // Rating preferences
  rating: {
    minRating: number; // 0-5 (Google rating)
    minWinksScore: number | null; // null means no preference
    importance: 'high' | 'medium' | 'low';
  };
  
  // Features preferences
  features: {
    preferred: string[]; // e.g., ['outdoor-seating', 'wifi', 'parking', 'wheelchair-accessible']
    importance: 'high' | 'medium' | 'low';
  };
  
  // Learning data (for future ML enhancements)
  learningData: {
    viewedBusinesses: string[]; // businessIds
    savedBusinesses: string[]; // businessIds
    ratedBusinesses: Array<{
      businessId: string;
      rating: number;
      timestamp: Date;
    }>;
  };
}
```

### 2. Business Attributes Extension

```typescript
// Extension to Business model in firebase.ts
export interface BusinessAttributes {
  // Cuisine types (from Google Places types + custom)
  cuisineTypes: string[];
  
  // Price level (from Google Places)
  priceLevel: number | null; // 1-4
  
  // Dietary options (inferred or manually tagged)
  dietaryOptions: string[]; // e.g., ['vegetarian-options', 'vegan-options', 'gluten-free-options']
  
  // Ambiance tags (inferred from reviews or manually tagged)
  ambianceTags: string[];
  
  // Features (from Google Places)
  features: string[]; // e.g., ['outdoor-seating', 'wifi', 'parking']
  
  // Distance from user (calculated at query time)
  distanceFromUser?: number; // in miles
}
```

### 3. Relevance Score Calculation

```typescript
export interface RelevanceScore {
  businessId: string;
  totalScore: number; // 0-100
  breakdown: {
    cuisineScore: number;
    priceScore: number;
    dietaryScore: number;
    ambianceScore: number;
    distanceScore: number;
    ratingScore: number;
    featuresScore: number;
  };
  matchedPreferences: string[]; // List of matched preference categories
  unmatchedPreferences: string[]; // List of unmatched preference categories
}

export interface PrioritizationEngine {
  calculateRelevanceScore(
    business: google.maps.places.PlaceResult,
    businessAttributes: BusinessAttributes,
    preferences: DiningPreferences,
    userLocation: { latitude: number; longitude: number }
  ): RelevanceScore;
  
  sortByRelevance(
    businesses: google.maps.places.PlaceResult[],
    scores: Map<string, RelevanceScore>
  ): google.maps.places.PlaceResult[];
  
  filterByMustHaves(
    businesses: google.maps.places.PlaceResult[],
    preferences: DiningPreferences
  ): google.maps.places.PlaceResult[];
}
```

### 4. Preference Management UI Components

```typescript
// New component: PreferencesManager.tsx
export interface PreferencesManagerProps {
  preferences: DiningPreferences;
  onSave: (preferences: DiningPreferences) => void;
  onCancel: () => void;
}

// New component: MatchQualityIndicator.tsx
export interface MatchQualityIndicatorProps {
  score: RelevanceScore;
  compact?: boolean; // For list view vs detail view
}

// New component: PreferenceMatchDetails.tsx
export interface PreferenceMatchDetailsProps {
  score: RelevanceScore;
  preferences: DiningPreferences;
}
```

## Data Models

### Firebase Collections

#### 1. User Profiles Extension
```
userProfiles/{userId}
  ├── diningPreferences: DiningPreferences
  ├── preferenceHistory: Array<{
  │     preferences: DiningPreferences,
  │     timestamp: Date
  │   }>
  └── lastUpdated: Date
```

#### 2. Business Attributes (New Collection)
```
businessAttributes/{businessId}
  ├── cuisineTypes: string[]
  ├── priceLevel: number
  ├── dietaryOptions: string[]
  ├── ambianceTags: string[]
  ├── features: string[]
  ├── lastUpdated: Date
  └── source: 'google' | 'inferred' | 'manual'
```

### Local Storage

Preferences will be cached in localStorage via the existing `usePreferencePersistence` hook:
```typescript
{
  ...existingPreferences,
  dining: DiningPreferences
}
```

## Prioritization Algorithm

### Scoring Algorithm

The relevance score is calculated as a weighted sum of individual category scores:

```
TotalScore = Σ (CategoryScore × CategoryWeight × ImportanceMultiplier)

Where:
- CategoryScore: 0-100 for each category
- CategoryWeight: Base weight for the category
- ImportanceMultiplier:
  - must-have: Filter (exclude if not met)
  - high: 1.5x
  - medium: 1.0x
  - low: 0.5x
```

### Category Scoring Details

1. **Cuisine Score (Weight: 25)**
   - 100: Exact match with preferred cuisines
   - 50: Partial match (some overlap)
   - 0: No match or in disliked list

2. **Price Score (Weight: 15)**
   - 100: Within preferred range
   - 50: One level outside range
   - 0: More than one level outside range

3. **Dietary Score (Weight: 20)**
   - 100: All dietary restrictions met
   - Proportional: Percentage of restrictions met
   - 0: No dietary options available

4. **Ambiance Score (Weight: 15)**
   - 100: Matches preferred ambiance
   - 50: Neutral (no ambiance data)
   - 0: Conflicts with preferences

5. **Distance Score (Weight: 10)**
   - 100: Within 0.5 miles
   - 75: Within 1 mile
   - 50: Within 2 miles
   - 25: Within max distance
   - 0: Beyond max distance

6. **Rating Score (Weight: 10)**
   - 100: Meets both Google and Winks rating thresholds
   - 75: Meets Google rating only
   - 50: Meets Winks score only
   - 25: Below thresholds but has ratings
   - 0: No ratings

7. **Features Score (Weight: 5)**
   - 100: All preferred features available
   - Proportional: Percentage of features available
   - 0: No preferred features

### Filtering Logic

For "must-have" preferences:
1. Filter out businesses that don't meet the criteria before scoring
2. Only score businesses that pass all must-have filters
3. Display a message if no businesses meet must-have criteria

### Learning Integration (Future Enhancement)

Track user interactions to refine preferences:
- View duration on business details
- Saved/favorited businesses
- Rated businesses
- Clicked businesses in search results

Use this data to:
- Suggest preference adjustments
- Auto-adjust importance levels
- Identify hidden preferences

## Error Handling

### Scenarios and Handling

1. **No Preferences Set**
   - Fallback: Use default sorting (nearest or highest rated)
   - UI: Show prompt to set preferences

2. **No Businesses Match Preferences**
   - Fallback: Relax must-have constraints progressively
   - UI: Show message explaining no exact matches
   - Action: Offer to adjust preferences or show nearest results

3. **Missing Business Attributes**
   - Fallback: Use available data from Google Places
   - Scoring: Treat missing attributes as neutral (50% score)
   - Background: Queue for attribute inference

4. **Preference Load Failure**
   - Fallback: Use cached preferences from localStorage
   - UI: Show warning banner
   - Action: Retry loading in background

5. **Firebase Connection Issues**
   - Fallback: Use localStorage preferences only
   - UI: Offline indicator
   - Action: Queue preference updates for sync

## Testing Strategy

### Unit Tests

1. **Scoring Algorithm Tests**
   - Test each category scoring function
   - Test weight application
   - Test importance multipliers
   - Test edge cases (missing data, extreme values)

2. **Filtering Tests**
   - Test must-have filtering
   - Test progressive relaxation
   - Test empty result handling

3. **Preference Validation Tests**
   - Test preference data structure validation
   - Test importance level validation
   - Test range validations (price, distance, rating)

### Integration Tests

1. **PreferencesProvider Integration**
   - Test preference loading and saving
   - Test preference updates
   - Test localStorage sync

2. **ExplorePage Integration**
   - Test prioritized results display
   - Test filter interaction with preferences
   - Test sort options with preferences

3. **Firebase Integration**
   - Test preference persistence
   - Test business attributes loading
   - Test offline behavior

### End-to-End Tests

1. **Complete User Flow**
   - Set preferences → Search → View prioritized results
   - Update preferences → See results re-prioritize
   - Clear preferences → See default sorting

2. **Match Quality Display**
   - View match indicators on business cards
   - View detailed match breakdown
   - Verify accuracy of match information

3. **Learning Flow**
   - Interact with businesses → View suggestions
   - Accept suggestions → See updated results
   - Decline suggestions → Maintain current preferences

### Performance Tests

1. **Scoring Performance**
   - Test scoring 100+ businesses
   - Measure time to calculate and sort
   - Target: < 100ms for 100 businesses

2. **Preference Load Performance**
   - Test preference loading time
   - Test with large preference history
   - Target: < 50ms for preference load

3. **UI Responsiveness**
   - Test preference UI rendering
   - Test match indicator rendering
   - Target: No visible lag on interactions

## Implementation Phases

### Phase 1: Core Infrastructure (MVP)
- Extend PreferencesProvider with dining preferences
- Implement basic scoring algorithm
- Add preference management UI in ProfilePage
- Integrate with ExplorePage for basic prioritization

### Phase 2: Enhanced Matching
- Implement business attributes inference
- Add match quality indicators to BusinessCard
- Add detailed match breakdown view
- Implement must-have filtering

### Phase 3: Learning & Optimization
- Implement interaction tracking
- Add preference suggestions
- Optimize scoring algorithm based on usage
- Add A/B testing for algorithm variations

### Phase 4: Advanced Features
- Add collaborative filtering (similar users)
- Implement ML-based attribute inference
- Add preference templates/presets
- Add social preference sharing

## Security Considerations

1. **Preference Privacy**
   - Store preferences in user's private document
   - Don't expose preferences in public APIs
   - Allow users to delete preference history

2. **Data Validation**
   - Validate all preference inputs
   - Sanitize preference data before storage
   - Prevent injection attacks in preference queries

3. **Rate Limiting**
   - Limit preference update frequency
   - Prevent abuse of scoring API
   - Monitor for unusual patterns

## Performance Optimizations

1. **Caching**
   - Cache business attributes locally
   - Cache calculated scores for session
   - Use service worker for offline access

2. **Lazy Loading**
   - Load business attributes on-demand
   - Defer non-critical preference data
   - Progressive enhancement for match details

3. **Batch Operations**
   - Batch business attribute fetches
   - Batch score calculations
   - Use Firebase batch reads

4. **Indexing**
   - Index business attributes by cuisine type
   - Index by price level
   - Composite indexes for common queries

## Accessibility

1. **Preference UI**
   - Keyboard navigation for all controls
   - Screen reader labels for importance levels
   - High contrast mode support

2. **Match Indicators**
   - Text alternatives for visual indicators
   - ARIA labels for match percentages
   - Color-blind friendly indicators

3. **Results Display**
   - Announce result count changes
   - Announce when results are re-prioritized
   - Provide text explanation of prioritization

## Migration Strategy

1. **Existing Users**
   - Prompt to set preferences on first visit after update
   - Offer quick setup wizard
   - Provide "skip for now" option

2. **Data Migration**
   - No breaking changes to existing data
   - Preferences are additive
   - Graceful degradation if preferences not set

3. **Rollout Plan**
   - Phase 1: Beta users (10%)
   - Phase 2: Gradual rollout (50%)
   - Phase 3: Full rollout (100%)
   - Monitor metrics at each phase
