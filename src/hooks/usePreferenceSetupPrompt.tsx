import { useState, useEffect, useCallback } from 'react';
import { usePreferences } from '@/contexts/PreferencesProvider';
import { hasPreferencesSet } from '@/services/prioritization.service';

const PREFERENCE_SETUP_PROMPT_KEY = 'preference-setup-prompted';
const PREFERENCE_SETUP_VERSION = '1.0';

interface UsePreferenceSetupPromptReturn {
  shouldShowPrompt: boolean;
  showPrompt: () => void;
  dismissPrompt: () => void;
  markPromptShown: () => void;
}

/**
 * Hook to manage showing the preference setup wizard to new users
 * Shows the prompt once to users who:
 * - Haven't completed the preferences-setup onboarding step
 * - Haven't set any dining preferences
 * - Haven't been prompted before (or prompt was shown in an older version)
 */
export const usePreferenceSetupPrompt = (): UsePreferenceSetupPromptReturn => {
  const { preferences, isLoaded } = usePreferences();
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  // Check if user should be prompted
  useEffect(() => {
    if (!isLoaded) return;

    // Don't prompt if user has already set preferences
    if (hasPreferencesSet(preferences.dining)) {
      return;
    }

    // Don't prompt if user completed preferences setup in onboarding
    if (preferences.onboarding.completedSteps.includes('preferences-setup')) {
      return;
    }

    // Check if user has been prompted before
    try {
      const promptData = localStorage.getItem(PREFERENCE_SETUP_PROMPT_KEY);
      if (promptData) {
        const { version, timestamp } = JSON.parse(promptData);
        
        // If same version and prompted within last 30 days, don't show again
        if (version === PREFERENCE_SETUP_VERSION) {
          const daysSincePrompt = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSincePrompt < 30) {
            return;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to check preference setup prompt status:', error);
    }

    // Show prompt after a short delay to avoid overwhelming new users
    const timer = setTimeout(() => {
      setShouldShowPrompt(true);
    }, 3000); // 3 second delay

    return () => clearTimeout(timer);
  }, [isLoaded, preferences.dining, preferences.onboarding.completedSteps]);

  const showPrompt = useCallback(() => {
    setShouldShowPrompt(true);
  }, []);

  const dismissPrompt = useCallback(() => {
    setShouldShowPrompt(false);
  }, []);

  const markPromptShown = useCallback(() => {
    try {
      const promptData = {
        version: PREFERENCE_SETUP_VERSION,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(PREFERENCE_SETUP_PROMPT_KEY, JSON.stringify(promptData));
    } catch (error) {
      console.warn('Failed to mark preference setup prompt as shown:', error);
    }
    setShouldShowPrompt(false);
  }, []);

  return {
    shouldShowPrompt,
    showPrompt,
    dismissPrompt,
    markPromptShown,
  };
};
