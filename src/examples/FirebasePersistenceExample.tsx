/**
 * Firebase Persistence Example
 * 
 * This example demonstrates how dining preferences are automatically synced
 * between localStorage and Firebase when a user is authenticated.
 * 
 * Key Features:
 * 1. Automatic sync on user authentication
 * 2. Conflict resolution (Firebase takes precedence)
 * 3. Offline mode support (falls back to localStorage)
 * 4. Debounced Firebase writes to reduce costs
 * 5. Error handling with graceful degradation
 */

import React from 'react';
import { usePreferences } from '@/contexts/PreferencesProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Cloud, HardDrive } from 'lucide-react';

export const FirebasePersistenceExample: React.FC = () => {
  const { user } = useAuth();
  const { 
    preferences, 
    updateDiningPreferences, 
    isSyncing, 
    syncError,
    isLoaded 
  } = usePreferences();

  const handleUpdatePreferences = () => {
    // Update dining preferences - this will automatically sync to Firebase
    updateDiningPreferences({
      cuisines: {
        ...preferences.dining.cuisines,
        preferred: ['italian', 'japanese', 'mexican'],
        importance: 'high',
      },
      priceRange: {
        ...preferences.dining.priceRange,
        min: 2,
        max: 3,
        importance: 'medium',
      },
    });
  };

  const handleResetPreferences = () => {
    updateDiningPreferences({
      cuisines: {
        preferred: [],
        disliked: [],
        importance: 'medium',
      },
      priceRange: {
        min: 1,
        max: 4,
        importance: 'medium',
      },
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Persistence Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sync Status */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            {!isLoaded ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading preferences...</span>
              </>
            ) : isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm">Syncing to Firebase...</span>
              </>
            ) : syncError ? (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Using local storage (offline mode)</span>
              </>
            ) : user ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <Cloud className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Synced with Firebase</span>
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Using local storage only</span>
              </>
            )}
          </div>

          {/* User Status */}
          <div className="space-y-2">
            <h3 className="font-semibold">Authentication Status</h3>
            <p className="text-sm text-muted-foreground">
              {user ? (
                <>Authenticated as: {user.email || user.uid}</>
              ) : (
                <>Not authenticated - preferences stored locally only</>
              )}
            </p>
          </div>

          {/* Sync Error */}
          {syncError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {syncError}
                <br />
                <span className="text-xs">
                  Your preferences are still saved locally and will sync when connection is restored.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Current Preferences */}
          <div className="space-y-2">
            <h3 className="font-semibold">Current Dining Preferences</h3>
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <div>
                <strong>Preferred Cuisines:</strong>{' '}
                {preferences.dining.cuisines.preferred.length > 0
                  ? preferences.dining.cuisines.preferred.join(', ')
                  : 'None'}
              </div>
              <div>
                <strong>Price Range:</strong> ${preferences.dining.priceRange.min} - $
                {preferences.dining.priceRange.max}
              </div>
              <div>
                <strong>Dietary Restrictions:</strong>{' '}
                {preferences.dining.dietary.restrictions.length > 0
                  ? preferences.dining.dietary.restrictions.join(', ')
                  : 'None'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleUpdatePreferences} disabled={isSyncing}>
              Update Preferences
            </Button>
            <Button onClick={handleResetPreferences} variant="outline" disabled={isSyncing}>
              Reset Preferences
            </Button>
          </div>

          {/* How It Works */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-semibold">How Firebase Persistence Works</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Preferences are always saved to localStorage immediately</li>
              <li>If authenticated, preferences sync to Firebase (debounced by 1 second)</li>
              <li>On app load, Firebase preferences override local if user is authenticated</li>
              <li>If Firebase is unavailable, app continues with localStorage</li>
              <li>Changes sync automatically in the background</li>
              <li>No user action required for sync</li>
            </ul>
          </div>

          {/* Technical Details */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-semibold">Technical Implementation</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Service: <code>diningPreferences.service.ts</code></li>
              <li>Hook: <code>usePreferencePersistence.tsx</code></li>
              <li>Provider: <code>PreferencesProvider.tsx</code></li>
              <li>Firestore Collection: <code>userProfiles/{'{userId}'}/diningPreferences</code></li>
              <li>Retry Logic: 3 attempts with exponential backoff</li>
              <li>Debounce: 1 second delay before Firebase write</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirebasePersistenceExample;
