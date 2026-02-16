# Quick Start Testing Guide
## Search Result Prioritization Feature

**For**: QA Engineers, Product Managers, Developers  
**Time Required**: 15-30 minutes for basic flow, 2-4 hours for comprehensive testing

---

## 🚀 Quick Test (15 minutes)

### 1. Set Preferences (5 min)
1. Open the app and log in
2. Navigate to **Profile** page
3. Find **"Dining Preferences"** section
4. Click **"Edit Preferences"**
5. Set:
   - Cuisine: Italian, Mexican
   - Price: $$ to $$$
   - Dietary: Vegetarian
   - Importance: High for cuisine
6. Click **"Save"**
7. ✅ Verify success message appears

### 2. View Prioritized Results (5 min)
1. Navigate to **Explore** page
2. ✅ Verify "Prioritized by Preferences" indicator shows
3. ✅ Verify match indicators appear on business cards
4. ✅ Verify Italian/Mexican restaurants appear first
5. Click on a business card
6. ✅ Verify detailed match breakdown shows
7. ✅ Verify score breakdown by category

### 3. Update and Re-prioritize (5 min)
1. Go back to **Profile** page
2. Change cuisine to: Chinese, Japanese
3. Save preferences
4. Return to **Explore** page
5. ✅ Verify results have re-ordered
6. ✅ Verify Chinese/Japanese restaurants now appear first
7. ✅ Verify match indicators updated

**Result**: If all ✅ pass, core functionality is working!

---

## 🧪 Comprehensive Test (2-4 hours)

Use the **E2E_TESTING_CHECKLIST.md** for detailed testing covering:

### Test Categories
1. **Complete User Flow** (30 min)
   - Set preferences → Search → View results
   - All preference categories
   - All importance levels

2. **Preference Updates** (20 min)
   - Change preferences
   - Verify re-prioritization
   - Test all preference types

3. **Edge Cases** (30 min)
   - No preferences set
   - No matching results
   - Missing business data
   - Offline mode

4. **Match Indicators** (20 min)
   - List view indicators
   - Detail view breakdown
   - Must-have highlights
   - Color coding

5. **Interaction Tracking** (30 min)
   - View businesses
   - Save favorites
   - Rate businesses
   - Check suggestions

6. **Firebase Persistence** (20 min)
   - Save preferences
   - Clear cache
   - Reload page
   - Verify sync

7. **Offline Behavior** (15 min)
   - Go offline
   - Use cached preferences
   - Update preferences
   - Go online and sync

8. **Accessibility** (45 min)
   - Keyboard navigation
   - Screen reader testing
   - Visual accessibility
   - ARIA labels

---

## 🐛 Common Issues to Check

### Issue: No Match Indicators Showing
**Check**:
- Are preferences set?
- Is user logged in?
- Are there businesses in results?
- Check browser console for errors

### Issue: Results Not Re-prioritizing
**Check**:
- Did preferences save successfully?
- Did you navigate back to Explore page?
- Clear cache and try again
- Check network tab for API calls

### Issue: Preferences Not Persisting
**Check**:
- Is Firebase connected?
- Check browser console for errors
- Verify localStorage has data
- Check network connectivity

### Issue: Match Scores Seem Wrong
**Check**:
- Verify business attributes are correct
- Check importance levels set correctly
- Review score breakdown in detail view
- Check console for calculation errors

---

## 📊 What to Look For

### Good Signs ✅
- Match indicators appear on all business cards
- Scores make sense (Italian restaurant = high score for Italian preference)
- Results re-order when preferences change
- Preferences persist after page reload
- Offline mode works with cached data
- Keyboard navigation works smoothly
- Screen reader announces changes

### Red Flags 🚩
- No match indicators visible
- All businesses have same score
- Results don't change when preferences updated
- Preferences lost after reload
- Errors in browser console
- UI freezes or lags
- Accessibility issues

---

## 🔍 Testing Tools

### Browser DevTools
- **Console**: Check for errors
- **Network**: Verify API calls
- **Application**: Check localStorage and IndexedDB
- **Performance**: Monitor load times

### Accessibility Tools
- **WAVE**: Browser extension for accessibility
- **axe DevTools**: Automated accessibility testing
- **Screen Reader**: NVDA (Windows), VoiceOver (Mac)
- **Keyboard Only**: Unplug mouse and test

### Performance Tools
- **Lighthouse**: Run audit in Chrome DevTools
- **Performance Tab**: Record and analyze
- **Network Throttling**: Test slow connections

---

## 📝 Test Data Suggestions

### Preference Combinations to Test

#### Test 1: Specific Preferences
- Cuisine: Italian (must-have)
- Price: $$ to $$$
- Dietary: Vegetarian
- **Expected**: Only Italian restaurants with vegetarian options

#### Test 2: Broad Preferences
- Cuisine: Italian, Mexican, Chinese, Japanese
- Price: $ to $$$$
- No dietary restrictions
- **Expected**: Wide variety, sorted by other factors

#### Test 3: Restrictive Preferences
- Cuisine: Ethiopian (must-have)
- Price: $$$$ (must-have)
- Dietary: Kosher (must-have)
- **Expected**: Likely no matches, see relaxation message

#### Test 4: Balanced Preferences
- Cuisine: Italian, Mexican (high importance)
- Price: $$ to $$$ (medium importance)
- Distance: < 2 miles (high importance)
- Rating: > 4.0 (medium importance)
- **Expected**: Nearby Italian/Mexican restaurants with good ratings

---

## 🎯 Success Criteria

### Must Pass (Critical)
- [ ] Preferences can be set and saved
- [ ] Results are prioritized based on preferences
- [ ] Match indicators display correctly
- [ ] Preferences persist after reload
- [ ] No console errors
- [ ] Keyboard accessible

### Should Pass (Important)
- [ ] Interaction tracking works
- [ ] Suggestions appear after interactions
- [ ] Offline mode works
- [ ] Performance is good (< 100ms scoring)
- [ ] All edge cases handled gracefully

### Nice to Have (Enhancement)
- [ ] Smooth animations
- [ ] Helpful tooltips
- [ ] Clear error messages
- [ ] Intuitive UI
- [ ] Mobile responsive

---

## 📞 Reporting Issues

### Issue Template
```
**Title**: [Brief description]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots**:
[If applicable]

**Environment**:
- Browser: 
- OS: 
- User Type: (logged in/guest)

**Console Errors**:
[Copy any errors from console]

**Severity**: Critical / High / Medium / Low
```

---

## 🎓 Understanding the Feature

### How Scoring Works
1. Each business gets scored in 7 categories:
   - Cuisine (25% weight)
   - Price (15% weight)
   - Dietary (20% weight)
   - Ambiance (15% weight)
   - Distance (10% weight)
   - Rating (10% weight)
   - Features (5% weight)

2. Scores are multiplied by importance:
   - Must-have: Filter (exclude if not met)
   - High: 1.5x multiplier
   - Medium: 1.0x multiplier
   - Low: 0.5x multiplier

3. Total score determines ranking

### Example Calculation
```
Italian Restaurant:
- Cuisine: 100 (perfect match) × 1.5 (high) × 0.25 = 37.5
- Price: 100 (in range) × 1.0 (medium) × 0.15 = 15.0
- Dietary: 50 (partial) × 1.0 (medium) × 0.20 = 10.0
- Distance: 75 (1 mile) × 1.5 (high) × 0.10 = 11.25
- Rating: 90 (4.5 stars) × 1.0 (medium) × 0.10 = 9.0
- Ambiance: 100 (casual) × 0.5 (low) × 0.15 = 7.5
- Features: 50 (has wifi) × 0.5 (low) × 0.05 = 1.25

Total Score: 91.5 / 100 (Excellent Match!)
```

---

## 📚 Additional Resources

- **Full Test Checklist**: E2E_TESTING_CHECKLIST.md
- **Test Report**: E2E_TEST_REPORT.md
- **Verification Summary**: E2E_VERIFICATION_SUMMARY.md
- **Feature Summary**: FEATURE_COMPLETE_SUMMARY.md
- **Requirements**: .kiro/specs/search-result-prioritization/requirements.md
- **Design**: .kiro/specs/search-result-prioritization/design.md

---

## ✅ Quick Checklist

Before reporting "Testing Complete":

- [ ] Ran quick test (15 min) - all passed
- [ ] Tested on Chrome
- [ ] Tested on at least one other browser
- [ ] Tested on mobile device
- [ ] Tested keyboard navigation
- [ ] Tested with screen reader (if possible)
- [ ] Tested offline mode
- [ ] Tested all edge cases
- [ ] No critical issues found
- [ ] Documented any issues found

---

**Happy Testing!** 🧪

If you find any issues, they're opportunities to make the feature even better. Good luck!
