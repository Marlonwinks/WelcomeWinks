# Prioritization Algorithm Update

## Changes Made

### 1. **Improved Rating Blend**
Previously, ratings were just one category among many. Now:
- **Community score (Winks) is prioritized at 70%**
- **Google rating contributes 30%**
- Ratings are converted to a unified 0-100 scale
- If only one rating source is available, it's used at 100%

### 2. **Ratings as Quality Multiplier**
Instead of treating ratings as just another preference category:
- **Preference matching is the primary score** (cuisine, dietary, price, ambiance, distance, features)
- **Ratings act as a quality multiplier** (0.7x to 1.3x)
- This means:
  - A perfect preference match with great ratings = highest score
  - A perfect preference match with poor ratings = still good score
  - A poor preference match with great ratings = lower score
  - Focus is on "what you like" first, "quality" second

### 3. **Enhanced Cuisine Matching**
More intelligent cuisine matching:
- **100 points**: Perfect match (all preferred cuisines)
- **75-99 points**: Strong match (multiple matches)
- **50-74 points**: Partial match (some overlap)
- **25-49 points**: Related cuisines (e.g., "Asian" preference matches "Japanese")
- **0 points**: Disliked cuisine or no match

Related cuisine groups:
- Asian: Japanese, Chinese, Thai, Vietnamese, Korean, Indian
- European: Italian, French, Spanish, Greek, German
- Latin: Mexican, Spanish, Cuban, Brazilian, Peruvian
- Mediterranean: Greek, Turkish, Lebanese, Moroccan, Italian

### 4. **Adjusted Category Weights**
Updated weights to emphasize preference matching:
- **Cuisine: 30%** (increased from 25%)
- **Dietary: 25%** (increased from 20%)
- **Price: 15%** (same)
- **Ambiance: 15%** (same)
- **Distance: 10%** (same)
- **Features: 5%** (same)
- **Rating: 0%** (removed from weighted sum, now used as multiplier)

## How It Works Now

### Scoring Formula
```
preferenceMatchScore = (cuisine × 30%) + (dietary × 25%) + (price × 15%) + 
                       (ambiance × 15%) + (distance × 10%) + (features × 5%)

ratingMultiplier = 0.7 + (blendedRating / 100) × 0.6
                 = ranges from 0.7 (poor ratings) to 1.3 (excellent ratings)

finalScore = preferenceMatchScore × ratingMultiplier
```

### Example Scenarios

**Scenario 1: Perfect preference match, great ratings**
- Preference match: 95/100
- Blended rating: 90/100 (multiplier = 1.24)
- Final score: 95 × 1.24 = **117.8** (capped at 100)

**Scenario 2: Perfect preference match, poor ratings**
- Preference match: 95/100
- Blended rating: 40/100 (multiplier = 0.94)
- Final score: 95 × 0.94 = **89.3**

**Scenario 3: Poor preference match, great ratings**
- Preference match: 30/100
- Blended rating: 90/100 (multiplier = 1.24)
- Final score: 30 × 1.24 = **37.2**

**Scenario 4: Good preference match, no ratings**
- Preference match: 80/100
- Blended rating: 50/100 (multiplier = 1.0)
- Final score: 80 × 1.0 = **80.0**

## Benefits

1. **Better preference matching**: Places that match your preferences rise to the top
2. **Quality matters but doesn't override**: Good ratings boost matches, but won't show you places you don't like
3. **Smarter cuisine matching**: Related cuisines are recognized (e.g., if you like Asian food, Japanese restaurants score well)
4. **Balanced rating sources**: Community scores and Google ratings are both considered
5. **Graceful degradation**: Works well even when some data is missing

## Testing

To test the improvements:
1. Set your dining preferences in Profile page
2. Go to Explore page
3. Select "Best Match" from the sort dropdown
4. Results should now better reflect your preferences
5. Places with similar cuisines/attributes should rank higher
6. Ratings should boost good matches but not override preference matching
