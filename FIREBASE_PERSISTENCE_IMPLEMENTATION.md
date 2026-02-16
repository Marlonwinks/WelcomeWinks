# Firebase Persistence Implementation

## Overview

This document describes the implementation of Firebase persistence for dining preferences, enabling automatic synchronization between localStorage and Firebase Firestore for authenticated users.

## Implementation Summary

### Task 10.1: Create Preference Persistence Service ✅

**File Created:** `src/services/diningPreferences.service.ts`

**Key Features:**
- `saveDiningPreferences(userId, preferences)` - Save preferences to Firebase
- `loadDiningPreferences(userId)` - Load preferences from Firebase
- `hasDiningPreferences(userId)` - Check if preferences exist
- Exponential backoff retry logic (3 attempts)
- Custom error handling with `PreferencesPersistenceError`
- Automatic serialization/deserialization of Date objects
- Server-side timestamps for tracking updates

**Error Handling:**
- Validates user ID before operations
- Retries failed operations up to 3 times with exponential backoff
- Graceful degradation on failure
- Detailed error messages with error codes

### Task 10.2: Sync Preferences Between localStorage and Firebase ✅

**Files Modified:**
- `src/hooks/usePreferencePersistence.tsx`
- `src/contexts/PreferencesProvider.tsx`

**Key Features:**

#### 1. Load from Firebase on App Initialization
- Loads localStorage preferences first (instant)
- If user is authenticated, loads from Firebase
- Firebase preferences override local preferences
- Merges Firebase data with local data
- Updates localStorage with Firebase data

#### 2. Save to Firebase on Preference Updates
- Debounced writes (1 second delay) to reduce Firebase costs
- Only syncs when dining preferences actually change
- Automatic background sync
- No user action required

#### 3. Conflict Resolution
- **Strategy:** Firebase takes precedence
- On app load, Firebase data overrides localStorage
- Ensures consistency across devices
- Local changes sync to Firebase immediately (debounced)

#### 4. Offline Mode Handling
- Falls back to localStorage if Firebase unavailable
- Continues working without Firebase connection
- Shows sync status to user
- Queues changes for sync when connection restored

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  PreferencesProvider                     │
│  - Gets userId from AuthProvider                        │
│  - Passes userId to usePreferencePersistence            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              usePreferencePersistence Hook               │
│  - Manages preferences state                            │
│  - Syncs with localStorage (immediate)                  │
│  - Syncs with Firebase (debounced, if authenticated)    │
│  - Handles conflict resolution                          │
│  - Provides sync status                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│          diningPreferences.service.ts                    │
│  - saveDiningPreferences()                              │
│  - loadDiningPreferences()                              │
│  - hasDiningPreferences()                               │
│  - Retry logic with exponential backoff                 │
│  - Error handling                                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                Firebase Firestore                        │
│  Collection: userProfiles/{userId}                      │
│  Document Fields:                                       │
│    - diningPreferences: DiningPreferences               │
│    - createdAt: Timestamp                               │
│    - lastUpdated: Timestamp                             │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Initial Load (Authenticated User)
1. App starts → PreferencesProvider mounts
2. Gets userId from AuthProvider
3. usePreferencePersistence loads localStorage (instant)
4. Displays UI with local preferences
5. Loads from Firebase in background
6. Merges Firebase preferences (Firebase wins)
7. Updates localStorage with merged data
8. Re-renders with synced preferences

### Preference Update (Authenticated User)
1. User updates preferences via UI
2. updateDiningPreferences() called
3. State updates immediately
4. Saves to localStorage immediately
5. Debounces Firebase save (1 second)
6. After debounce, saves to Firebase
7. Updates sync status
8. Handles errors gracefully

### Offline Mode
1. User updates preferences
2. Saves to localStorage (works)
3. Firebase save fails (network error)
4. Sets syncError state
5. UI shows "offline mode" indicator
6. App continues working normally
7. When online, next change triggers sync

## API Reference

### diningPreferences.service.ts

#### `saveDiningPreferences(userId: string, preferences: DiningPreferences): Promise<void>`
Saves dining preferences to Firebase with retry logic.

**Parameters:**
- `userId` - Firebase Auth UID
- `preferences` - DiningPreferences object

**Throws:**
- `PreferencesPersistenceError` - If save fails after retries

**Example:**
```typescript
await saveDiningPreferences(user.uid, {
  cuisines: { preferred: ['italian'], disliked: [], importance: 'high' },
  // ... other preferences
});
```

#### `loadDiningPreferences(userId: string): Promise<DiningPreferences>`
Loads dining preferences from Firebase with retry logic.

**Parameters:**
- `userId` - Firebase Auth UID

**Returns:**
- DiningPreferences object (or defaults if none exist)

**Throws:**
- `PreferencesPersistenceError` - If load fails after retries

**Example:**
```typescript
const preferences = await loadDiningPreferences(user.uid);
```

#### `hasDiningPreferences(userId: string): Promise<boolean>`
Checks if user has dining preferences in Firebase.

**Parameters:**
- `userId` - Firebase Auth UID

**Returns:**
- `true` if preferences exist, `false` otherwise

### usePreferencePersistence Hook

#### New Parameters
```typescript
usePreferencePersistence(userId?: string | null)
```

#### New Return Values
```typescript
{
  // ... existing returns
  isSyncing: boolean;      // True when syncing to Firebase
  syncError: string | null; // Error message if sync failed
}
```

## Firestore Schema

### Collection: `userProfiles`
### Document: `{userId}`

```typescript
{
  diningPreferences: {
    cuisines: {
      preferred: string[];
      disliked: string[];
      importance: 'must-have' | 'high' | 'medium' | 'low';
    };
    priceRange: {
      min: number;
      max: number;
      importance: 'must-have' | 'high' | 'medium' | 'low';
    };
    dietary: {
      restrictions: string[];
      importance: 'must-have' | 'high' | 'medium' | 'low';
    };
    ambiance: {
      preferred: string[];
      importance: 'high' | 'medium' | 'low';
    };
    distance: {
      maxDistance: number;
      importance: 'high' | 'medium' | 'low';
    };
    rating: {
      minRating: number;
      minWinksScore: number | null;
      importance: 'high' | 'medium' | 'low';
    };
    features: {
      preferred: string[];
      importance: 'high' | 'medium' | 'low';
    };
    learningData: {
      viewedBusinesses: string[];
      savedBusinesses: string[];
      ratedBusinesses: Array<{
        businessId: string;
        rating: number;
        timestamp: string; // ISO 8601 format
      }>;
    };
  };
  createdAt: Timestamp;
  lastUpdated: Timestamp;
}
```

## Configuration

### Retry Configuration
```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRY_BACKOFF_MULTIPLIER = 2;
```

### Debounce Configuration
```typescript
const FIREBASE_SAVE_DEBOUNCE_MS = 1000; // 1 second
```

## Error Handling

### Error Types
```typescript
class PreferencesPersistenceError extends Error {
  code: string;
  originalError?: unknown;
}
```

### Error Codes
- `INVALID_USER_ID` - User ID is missing or invalid
- `SAVE_FAILED` - Failed to save after retries
- `LOAD_FAILED` - Failed to load after retries

### Error Handling Strategy
1. **Retry with Backoff** - Automatically retry failed operations
2. **Graceful Degradation** - Fall back to localStorage on failure
3. **User Notification** - Show sync status in UI
4. **Continue Operation** - Never block user from using app

## Testing

### Manual Testing Steps

1. **Test Initial Load (Authenticated)**
   - Sign in with a user account
   - Verify preferences load from Firebase
   - Check that localStorage is updated

2. **Test Preference Updates**
   - Update dining preferences
   - Verify immediate localStorage save
   - Wait 1 second, verify Firebase save
   - Check sync status indicator

3. **Test Offline Mode**
   - Disconnect network
   - Update preferences
   - Verify localStorage save works
   - Verify sync error shown
   - Reconnect network
   - Update preferences again
   - Verify sync resumes

4. **Test Conflict Resolution**
   - Update preferences on Device A
   - Wait for sync
   - Open app on Device B
   - Verify Device B loads Device A's preferences

5. **Test Guest User**
   - Sign out
   - Update preferences
   - Verify only localStorage is used
   - Verify no Firebase calls made

### Example Component

See `src/examples/FirebasePersistenceExample.tsx` for a working example that demonstrates:
- Sync status display
- Authentication status
- Current preferences
- Update/reset actions
- Error handling
- Technical documentation

## Performance Considerations

### Optimizations Implemented
1. **Debounced Writes** - Reduces Firebase write operations
2. **Change Detection** - Only syncs when preferences actually change
3. **Lazy Loading** - Loads from Firebase in background
4. **Local-First** - Shows local data immediately
5. **Retry Logic** - Handles transient failures automatically

### Firebase Costs
- **Reads:** 1 per app load (authenticated users only)
- **Writes:** 1 per preference update (debounced to 1 second)
- **Storage:** ~1-2 KB per user

### Expected Usage
- Average user: 1 read/day, 2-3 writes/day
- Active user: 1 read/day, 10-20 writes/day
- Cost: Minimal (well within free tier limits)

## Security

### Firestore Rules Required
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userProfiles/{userId} {
      // Users can only read/write their own preferences
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Security Features
- User ID validation before operations
- Firebase Auth required for access
- Server-side timestamps prevent tampering
- No sensitive data in preferences

## Future Enhancements

### Potential Improvements
1. **Preference History** - Track preference changes over time
2. **Sync Indicators** - More detailed sync status
3. **Conflict Resolution UI** - Let users choose which version to keep
4. **Batch Operations** - Sync multiple preference types together
5. **Compression** - Compress large preference objects
6. **Caching** - Cache Firebase data for faster loads
7. **Real-time Sync** - Use Firestore listeners for live updates

## Requirements Satisfied

### Requirement 1.5
✅ "WHEN a user saves their preferences THEN the system SHALL persist these preferences to their profile"
- Preferences automatically saved to Firebase for authenticated users
- Saved to localStorage for all users

### Requirement 1.6
✅ "WHEN a user updates existing preferences THEN the system SHALL immediately apply changes to future searches"
- Changes applied immediately to state
- Synced to Firebase in background
- Available across devices

## Conclusion

The Firebase persistence implementation provides a robust, user-friendly solution for syncing dining preferences across devices while maintaining excellent offline support and performance. The implementation follows best practices for error handling, retry logic, and graceful degradation.

Key achievements:
- ✅ Automatic sync for authenticated users
- ✅ Offline mode support
- ✅ Conflict resolution (Firebase wins)
- ✅ Debounced writes for cost optimization
- ✅ Comprehensive error handling
- ✅ Zero user action required
- ✅ Graceful degradation on failure
