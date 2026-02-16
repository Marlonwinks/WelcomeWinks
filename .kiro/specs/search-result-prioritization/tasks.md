# Implementation Plan

- [x] 1. Extend data models and type definitions





  - Create TypeScript interfaces for DiningPreferences, BusinessAttributes, and RelevanceScore
  - Add dining preferences to UserPreferences interface in usePreferencePersistence.tsx
  - Extend Business model in firebase.ts with BusinessAttributes
  - Create types for preference importance levels and category weights
  - _Requirements: 1.1, 1.2, 1.5, 2.1_


- [x] 2. Implement core preference management infrastructure



- [x] 2.1 Extend PreferencesProvider with dining preferences

  - Add dining preferences state to usePreferencePersistence hook
  - Implement updateDiningPreferences method
  - Add localStorage persistence for dining preferences
  - Implement default dining preferences initialization
  - _Requirements: 1.1, 1.5, 6.1_


- [x] 2.2 Create preference validation utilities

  - Write validation functions for cuisine preferences
  - Write validation functions for price range
  - Write validation functions for dietary restrictions
  - Write validation functions for importance levels
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Build prioritization scoring engine




- [x] 3.1 Implement category scoring functions


  - Write cuisineScore calculation function
  - Write priceScore calculation function
  - Write dietaryScore calculation function
  - Write ambianceScore calculation function
  - Write distanceScore calculation function
  - Write ratingScore calculation function
  - Write featuresScore calculation function
  - _Requirements: 2.2, 2.3, 3.1, 3.2_

- [x] 3.2 Implement relevance score aggregation


  - Create calculateRelevanceScore function that combines all category scores
  - Implement importance multiplier logic (must-have, high, medium, low)
  - Implement category weight application
  - Create score breakdown structure for transparency
  - _Requirements: 2.2, 2.3, 3.1, 3.2, 4.3_

- [x] 3.3 Implement filtering and sorting logic


  - Create filterByMustHaves function for must-have preferences
  - Implement sortByRelevance function
  - Create progressive relaxation logic for no-match scenarios
  - Implement fallback to default sorting when no preferences set
  - _Requirements: 2.4, 2.5, 3.3, 3.4, 6.1, 6.2_

- [x] 4. Create preference management UI components



- [x] 4.1 Build PreferencesManager component


  - Create form layout for all preference categories
  - Implement cuisine selection multi-select
  - Implement price range slider
  - Implement dietary restrictions checkboxes
  - Implement ambiance selection
  - Implement distance slider
  - Implement rating thresholds
  - Implement features selection
  - Add importance level selectors for each category
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1_

- [x] 4.2 Integrate PreferencesManager into ProfilePage


  - Add "Dining Preferences" section to ProfilePage
  - Implement save/cancel handlers
  - Add loading states
  - Add success/error notifications
  - Create preference summary display when not editing
  - _Requirements: 1.1, 1.6_

- [x] 5. Enhance business display with match indicators



- [x] 5.1 Create MatchQualityIndicator component


  - Design visual indicator (percentage, stars, or badge)
  - Implement compact mode for list view
  - Implement detailed mode for business detail page
  - Add color coding for match quality levels
  - _Requirements: 4.1, 4.2_

- [x] 5.2 Create PreferenceMatchDetails component


  - Display matched preferences with checkmarks
  - Display unmatched preferences with indicators
  - Show score breakdown by category
  - Add explanatory text for why business was prioritized
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 5.3 Integrate match indicators into BusinessCard


  - Add MatchQualityIndicator to BusinessCard component
  - Position indicator prominently
  - Ensure responsive design
  - Add click handler to show detailed match breakdown
  - _Requirements: 4.1, 4.2_

- [x] 6. Integrate prioritization into ExplorePage





- [x] 6.1 Implement prioritization in search results


  - Fetch user dining preferences in ExplorePage
  - Calculate relevance scores for all nearby places
  - Apply must-have filtering
  - Sort results by relevance score
  - Update filteredAndSortedPlaces useMemo hook
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_


- [x] 6.2 Add preference-aware UI elements

  - Add "Prioritized by Preferences" indicator when preferences are active
  - Add "Set Preferences" prompt when no preferences are set
  - Add "No matches found" message with preference adjustment suggestion
  - Update sort dropdown to include "Best Match" option
  - _Requirements: 2.5, 6.2, 6.3, 6.4_


- [x] 6.3 Handle edge cases and fallbacks

  - Implement fallback to default sorting when preferences not set
  - Implement progressive relaxation when no exact matches
  - Handle missing business attributes gracefully
  - Add error handling for preference loading failures
  - _Requirements: 2.5, 6.1, 6.2, 6.4_


- [x] 7. Implement business attributes inference



- [x] 7.1 Create business attributes service


  - Create businessAttributes.service.ts
  - Implement getBusinessAttributes function
  - Implement inferAttributesFromGooglePlaces function
  - Add caching for business attributes
  - _Requirements: 2.2, 2.3_

- [x] 7.2 Implement attribute inference logic


  - Infer cuisine types from Google Places types
  - Extract price level from Google Places data
  - Infer dietary options from business types and reviews
  - Infer ambiance tags from business types
  - Extract features from Google Places data
  - _Requirements: 2.2, 2.3_

- [x] 7.3 Create Firebase collection for business attributes


  - Define Firestore schema for businessAttributes collection
  - Implement saveBusinessAttributes function
  - Implement loadBusinessAttributes function
  - Add batch operations for multiple businesses
  - _Requirements: 2.2_


- [x] 8. Implement interaction tracking for learning



- [x] 8.1 Create interaction tracking service


  - Track business views (time spent on detail page)
  - Track business saves/favorites
  - Track business ratings
  - Track search result clicks
  - Store interaction data in preferences.learningData
  - _Requirements: 5.1, 5.2_

- [x] 8.2 Implement preference suggestion logic


  - Analyze interaction patterns
  - Identify frequently viewed cuisine types
  - Identify preferred price ranges
  - Generate preference adjustment suggestions
  - _Requirements: 5.3, 5.4_

- [x] 8.3 Create preference suggestions UI


  - Create PreferenceSuggestions component
  - Display suggestions in ProfilePage or as notifications
  - Implement accept/decline handlers
  - Update preferences when suggestions accepted
  - _Requirements: 5.3, 5.4, 5.5_

- [x] 9. Add onboarding flow for preferences




- [x] 9.1 Create preference setup wizard


  - Create PreferenceSetupWizard component
  - Implement multi-step form (cuisine → price → dietary → other)
  - Add skip option for each step
  - Add progress indicator
  - _Requirements: 6.5_

- [x] 9.2 Integrate wizard into onboarding flow


  - Add preference setup step to existing onboarding
  - Show wizard on first visit after feature launch
  - Add "Set up preferences" CTA in ExplorePage for new users
  - Store completion status in onboarding preferences
  - _Requirements: 6.2, 6.3, 6.5_
- [x] 10. Implement Firebase persistence




- [ ] 10. Implement Firebase persistence


- [x] 10.1 Create preference persistence service

  - Create diningPreferences.service.ts
  - Implement saveDiningPreferences function
  - Implement loadDiningPreferences function
  - Add error handling and retry logic
  - _Requirements: 1.5, 1.6_


- [x] 10.2 Sync preferences between localStorage and Firebase

  - Load from Firebase on app initialization
  - Save to Firebase on preference updates
  - Implement conflict resolution (Firebase vs localStorage)
  - Handle offline mode gracefully
  - _Requirements: 1.5, 1.6_


- [x] 11. Add performance optimizations




- [x] 11.1 Implement caching strategies
  - Cache business attributes in memory
  - Cache calculated relevance scores for session
  - Implement cache invalidation logic
  - Add service worker caching for offline access
  - _Requirements: 2.1, 2.2_


- [x] 11.2 Optimize scoring algorithm


  - Batch business attribute fetches
  - Parallelize score calculations where possible
  - Implement lazy loading for non-critical data
  - Add performance monitoring
  - _Requirements: 2.1, 2.2, 2.3_
-

- [x] 12. Add accessibility features





- [x] 12.1 Ensure keyboard navigation

  - Add keyboard support to PreferencesManager
  - Add keyboard support to match indicators
  - Implement focus management
  - Add keyboard shortcuts for common actions
  - _Requirements: 1.1, 4.1_


- [x] 12.2 Add screen reader support

  - Add ARIA labels to all preference controls
  - Add ARIA labels to match indicators
  - Announce result count changes
  - Announce when results are re-prioritized
  - _Requirements: 1.1, 4.1, 4.2_


- [x] 12.3 Ensure visual accessibility

  - Use color-blind friendly colors for match indicators
  - Ensure sufficient contrast ratios
  - Add text alternatives for visual indicators
  - Support high contrast mode
  - _Requirements: 4.1, 4.2_

- [x] 13. Wire everything together and test end-to-end




  - Verify complete user flow: set preferences → search → view prioritized results
  - Test preference updates and result re-prioritization
  - Test all edge cases and fallback scenarios
  - Verify match indicators display correctly
  - Test interaction tracking and suggestions
  - Verify Firebase persistence and sync
  - Test offline behavior
  - Verify accessibility compliance
  - _Requirements: All requirements_
