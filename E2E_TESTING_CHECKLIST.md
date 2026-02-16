# End-to-End Testing Checklist for Search Result Prioritization

## Overview
This document provides a comprehensive manual testing checklist to verify all functionality of the search result prioritization feature.

## Test Environment Setup
- [ ] Clear browser cache and localStorage
- [ ] Ensure Firebase connection is active
- [ ] Verify Google Maps API is working
- [ ] Test with fresh user account

---

## 1. Complete User Flow: Set Preferences → Search → View Prioritized Results

### Setting Preferences
- [ ] Navigate to Profile page
- [ ] Locate "Dining Preferences" section
- [ ] Click "Edit Preferences" or similar button
- [ ] **Cuisine Preferences:**
  - [ ] Select multiple cuisines (e.g., Italian, Mexican)
  - [ ] Set importance level (must-have, high, medium, low)
  - [ ] Add disliked cuisines
- [ ] **Price Range:**
  - [ ] Adjust price range slider (1-4)
  - [ ] Set importance level
- [ ] **Dietary Restrictions:**
  - [ ] Check dietary options (vegetarian, vegan, gluten-free, etc.)
  - [ ] Set importance level
- [ ] **Ambiance:**
  - [ ] Select preferred ambiance (casual, fine-dining, romantic, etc.)
  - [ ] Set importance level
- [ ] **Distance:**
  - [ ] Set maximum distance preference
  - [ ] Set importance level
- [ ] **Rating:**
  - [ ] Set minimum rating threshold
  - [ ] Set importance level
- [ ] **Features:**
  - [ ] Select preferred features (outdoor seating, WiFi, parking, etc.)
  - [ ] Set importance level
- [ ] Click "Save Preferences"
- [ ] Verify success message appears
- [ ] Verify preferences are displayed in summary view

### Viewing Prioritized Results
- [ ] Navigate to Explore page
- [ ] Verify "Prioritized by Preferences" indicator is shown
- [ ] Verify search results are displayed
- [ ] Verify businesses appear in prioritized order
- [ ] Verify match quality indicators are visible on each business card
- [ ] Click on a business card
- [ ] Verify detailed match breakdown is shown
- [ ] Verify score breakdown by category is displayed
- [ ] Verify matched preferences are highlighted
- [ ] Verify unmatched preferences are indicated

---

## 2. Preference Updates and Result Re-prioritization

- [ ] From Explore page, note the current order of results
- [ ] Navigate to Profile page
- [ ] Change cuisine preference (e.g., from Italian to Chinese)
- [ ] Save preferences
- [ ] Return to Explore page
- [ ] Verify results have re-ordered based on new preferences
- [ ] Verify match indicators have updated
- [ ] Change importance level of a preference (e.g., price from medium to must-have)
- [ ] Save and return to Explore
- [ ] Verify results are filtered/re-ordered accordingly
- [ ] Add a new dietary restriction
- [ ] Verify results update to show only compatible businesses

---

## 3. Edge Cases and Fallback Scenarios

### No Preferences Set
- [ ] Clear all preferences or use new account
- [ ] Navigate to Explore page
- [ ] Verify "Set Preferences" prompt is displayed
- [ ] Verify results are still shown using default sorting
- [ ] Verify no match indicators are shown
- [ ] Click "Set Preferences" link
- [ ] Verify it navigates to preferences setup

### No Matching Results
- [ ] Set very restrictive preferences:
  - [ ] Must-have cuisine: Ethiopian
  - [ ] Must-have price: $$$$ (4)
  - [ ] Must-have dietary: Kosher
- [ ] Navigate to Explore page
- [ ] Verify "No matches found" message is displayed
- [ ] Verify suggestion to adjust preferences is shown
- [ ] Click "Adjust Preferences" link
- [ ] Verify it navigates to preferences page

### Progressive Relaxation
- [ ] Set moderately restrictive preferences with must-haves
- [ ] If no exact matches, verify system shows:
  - [ ] Message about relaxing must-have constraints
  - [ ] Results that match most (but not all) preferences
  - [ ] Indication of which preferences were relaxed

### Missing Business Attributes
- [ ] Find a business with minimal Google Places data
- [ ] Verify it still appears in results
- [ ] Verify match indicator shows "Limited data available"
- [ ] Verify score is calculated based on available data
- [ ] Verify no errors are thrown

---

## 4. Match Indicators Display

### List View (Business Cards)
- [ ] Verify each business card shows a match quality indicator
- [ ] Verify indicator shows percentage or visual representation (stars/badge)
- [ ] Verify color coding:
  - [ ] Green/High for 80%+ match
  - [ ] Yellow/Medium for 50-79% match
  - [ ] Red/Low for <50% match
- [ ] Verify indicator is prominently positioned
- [ ] Verify indicator is responsive on mobile

### Detail View
- [ ] Click on a business card
- [ ] Verify detailed match breakdown is displayed
- [ ] Verify score breakdown shows:
  - [ ] Cuisine score
  - [ ] Price score
  - [ ] Dietary score
  - [ ] Ambiance score
  - [ ] Distance score
  - [ ] Rating score
  - [ ] Features score
- [ ] Verify matched preferences show checkmarks
- [ ] Verify unmatched preferences show indicators
- [ ] Verify explanatory text explains why business was prioritized

### Must-Have Indicators
- [ ] Set a must-have preference
- [ ] Find a business that meets it
- [ ] Verify must-have match is highlighted prominently
- [ ] Verify badge or special indicator for must-have matches

---

## 5. Interaction Tracking and Suggestions

### Tracking Business Views
- [ ] View multiple businesses of the same cuisine type
- [ ] Spend significant time (30+ seconds) on each detail page
- [ ] Navigate to Profile page
- [ ] Verify interaction data is being tracked (check console or dev tools)

### Tracking Saves/Favorites
- [ ] Save/favorite multiple businesses
- [ ] Verify these are tracked in learningData
- [ ] Check if patterns emerge (e.g., all Italian restaurants)

### Tracking Ratings
- [ ] Rate multiple businesses
- [ ] Verify ratings are tracked with timestamps
- [ ] Verify highly-rated businesses' characteristics are noted

### Preference Suggestions
- [ ] After sufficient interactions (view 5+ businesses of same type)
- [ ] Navigate to Profile page
- [ ] Verify "Preference Suggestions" section appears
- [ ] Verify suggestions are based on interaction patterns
- [ ] Example: "You've viewed many vegan restaurants. Add 'vegan' to your preferences?"
- [ ] Click "Accept" on a suggestion
- [ ] Verify preference is updated
- [ ] Verify results re-prioritize immediately
- [ ] Click "Decline" on a suggestion
- [ ] Verify suggestion is dismissed
- [ ] Verify it doesn't reappear immediately

---

## 6. Firebase Persistence and Sync

### Initial Save
- [ ] Set preferences for the first time
- [ ] Save preferences
- [ ] Verify "Synced to cloud" or similar message appears
- [ ] Open browser dev tools → Application → IndexedDB/Firestore
- [ ] Verify preferences are stored in Firebase

### Load from Firebase
- [ ] Clear localStorage
- [ ] Refresh the page
- [ ] Navigate to Profile page
- [ ] Verify preferences are loaded from Firebase
- [ ] Verify all preference values are correct

### Sync Between Devices (if possible)
- [ ] Set preferences on Device A
- [ ] Log in on Device B with same account
- [ ] Verify preferences are synced
- [ ] Update preferences on Device B
- [ ] Check Device A (refresh)
- [ ] Verify updates are synced

### Conflict Resolution
- [ ] Set preferences while online
- [ ] Go offline (disable network in dev tools)
- [ ] Update preferences
- [ ] Go back online
- [ ] Verify preferences sync correctly
- [ ] Verify no data loss

---

## 7. Offline Behavior

### Offline with Cached Preferences
- [ ] Set preferences while online
- [ ] Navigate to Explore page
- [ ] Go offline (disable network)
- [ ] Refresh page
- [ ] Verify "Offline" indicator is shown
- [ ] Verify cached preferences are used
- [ ] Verify results are still prioritized
- [ ] Verify match indicators still work

### Offline Preference Updates
- [ ] Go offline
- [ ] Try to update preferences
- [ ] Verify changes are saved to localStorage
- [ ] Verify message indicates "Will sync when online"
- [ ] Go back online
- [ ] Verify preferences sync to Firebase
- [ ] Verify success message appears

### No Cache Available
- [ ] Clear all cache and localStorage
- [ ] Go offline
- [ ] Try to access Explore page
- [ ] Verify graceful degradation
- [ ] Verify default sorting is used
- [ ] Verify appropriate message is shown

---

## 8. Accessibility Compliance

### Keyboard Navigation
- [ ] Navigate to Profile page using only keyboard
- [ ] Tab through all preference controls
- [ ] Verify focus indicators are visible
- [ ] Verify tab order is logical
- [ ] Use Enter/Space to activate controls
- [ ] Verify all controls are keyboard accessible
- [ ] Navigate to Explore page
- [ ] Tab through business cards
- [ ] Verify match indicators are keyboard accessible
- [ ] Press Enter on a business card
- [ ] Verify detail view opens

### Screen Reader Support
- [ ] Enable screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Navigate to Profile page
- [ ] Verify all preference controls have proper labels
- [ ] Verify importance levels are announced
- [ ] Verify form validation errors are announced
- [ ] Navigate to Explore page
- [ ] Verify "Prioritized by Preferences" is announced
- [ ] Verify result count is announced
- [ ] Navigate through business cards
- [ ] Verify match quality is announced (e.g., "85% match")
- [ ] Verify business details are announced
- [ ] Update preferences and return to Explore
- [ ] Verify result count change is announced

### Visual Accessibility
- [ ] Verify match indicators use color-blind friendly colors
- [ ] Verify text alternatives exist for all visual indicators
- [ ] Use browser dev tools to check contrast ratios
- [ ] Verify all text meets WCAG AA standards (4.5:1 for normal text)
- [ ] Enable high contrast mode (Windows/Mac)
- [ ] Verify all elements are still visible and usable
- [ ] Verify match indicators are distinguishable
- [ ] Zoom to 200%
- [ ] Verify layout doesn't break
- [ ] Verify all content is still accessible

### ARIA Labels and Roles
- [ ] Inspect match quality indicators
- [ ] Verify aria-label describes match quality
- [ ] Verify role="status" for live regions
- [ ] Verify aria-live="polite" for result count updates
- [ ] Verify aria-describedby for preference explanations
- [ ] Verify aria-required for required fields
- [ ] Verify aria-invalid for validation errors

---

## 9. Performance Testing

### Scoring Performance
- [ ] Load Explore page with 50+ nearby businesses
- [ ] Measure time to calculate and display prioritized results
- [ ] Verify results appear within 100ms
- [ ] Check browser console for performance warnings
- [ ] Verify no UI lag or freezing

### Preference Load Performance
- [ ] Clear cache
- [ ] Navigate to Profile page
- [ ] Measure time to load preferences
- [ ] Verify preferences load within 50ms
- [ ] Verify UI is responsive during load

### Caching Effectiveness
- [ ] Load Explore page (first time)
- [ ] Note load time
- [ ] Navigate away and return
- [ ] Verify second load is faster (cached)
- [ ] Verify business attributes are cached
- [ ] Verify relevance scores are cached for session

---

## 10. Cross-Browser Testing

Test all above scenarios in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## 11. Mobile Responsiveness

- [ ] Test on mobile device or emulator
- [ ] Verify preference controls are touch-friendly
- [ ] Verify sliders work with touch
- [ ] Verify multi-select works on mobile
- [ ] Verify match indicators are visible and readable
- [ ] Verify business cards are properly sized
- [ ] Verify detail view is mobile-optimized
- [ ] Test in portrait and landscape orientations

---

## 12. Error Handling

### Network Errors
- [ ] Simulate network failure during preference save
- [ ] Verify error message is shown
- [ ] Verify retry option is available
- [ ] Verify preferences are saved to localStorage as backup

### Invalid Data
- [ ] Try to save preferences with invalid values
- [ ] Verify validation errors are shown
- [ ] Verify form doesn't submit with errors
- [ ] Verify helpful error messages guide user

### Firebase Errors
- [ ] Simulate Firebase permission error
- [ ] Verify graceful error handling
- [ ] Verify fallback to localStorage
- [ ] Verify user is informed of issue

---

## Test Results Summary

### Date: _______________
### Tester: _______________
### Environment: _______________

| Test Category | Pass | Fail | Notes |
|--------------|------|------|-------|
| Complete User Flow | ☐ | ☐ | |
| Preference Updates | ☐ | ☐ | |
| Edge Cases | ☐ | ☐ | |
| Match Indicators | ☐ | ☐ | |
| Interaction Tracking | ☐ | ☐ | |
| Firebase Persistence | ☐ | ☐ | |
| Offline Behavior | ☐ | ☐ | |
| Accessibility | ☐ | ☐ | |
| Performance | ☐ | ☐ | |
| Cross-Browser | ☐ | ☐ | |
| Mobile | ☐ | ☐ | |
| Error Handling | ☐ | ☐ | |

### Critical Issues Found:
1. 
2. 
3. 

### Minor Issues Found:
1. 
2. 
3. 

### Recommendations:
1. 
2. 
3. 

---

## Sign-off

- [ ] All critical functionality tested and working
- [ ] All requirements verified
- [ ] Accessibility compliance confirmed
- [ ] Performance targets met
- [ ] Ready for production deployment

**Tester Signature:** _______________  
**Date:** _______________
