import { useCallback } from 'react';
import { UserGoal } from '../types/onboarding';
import { useOnboarding } from '../contexts/OnboardingProvider';

/**
 * Custom hook for managing user goal preferences
 * Provides methods for getting, setting, and checking goal preferences
 */
export const useGoalPreferences = () => {
  const { state, setPreferredGoal } = useOnboarding();

  /**
   * Get the current preferred goal
   */
  const getPreferredGoal = useCallback((): UserGoal | null => {
    return state.preferredGoal;
  }, [state.preferredGoal]);

  /**
   * Set a new preferred goal
   */
  const setGoalPreference = useCallback((goal: UserGoal) => {
    setPreferredGoal(goal);
  }, [setPreferredGoal]);

  /**
   * Check if a specific goal is the preferred one
   */
  const isPreferredGoal = useCallback((goal: UserGoal): boolean => {
    return state.preferredGoal === goal;
  }, [state.preferredGoal]);

  /**
   * Check if user has any preferred goal set
   */
  const hasPreferredGoal = useCallback((): boolean => {
    return state.preferredGoal !== null;
  }, [state.preferredGoal]);

  /**
   * Clear the preferred goal
   */
  const clearGoalPreference = useCallback(() => {
    // Note: This would require adding a new action to the reducer
    // For now, we can set it to null by updating the context
    // This is a placeholder for future implementation if needed
    console.warn('clearGoalPreference not yet implemented');
  }, []);

  /**
   * Get goal preference with metadata
   */
  const getGoalPreferenceInfo = useCallback(() => {
    return {
      preferredGoal: state.preferredGoal,
      hasPreference: state.preferredGoal !== null,
      lastOnboardingDate: state.lastOnboardingDate,
      isReturningUser: state.lastOnboardingDate !== null,
    };
  }, [state.preferredGoal, state.lastOnboardingDate]);

  return {
    preferredGoal: state.preferredGoal,
    getPreferredGoal,
    setGoalPreference,
    isPreferredGoal,
    hasPreferredGoal,
    clearGoalPreference,
    getGoalPreferenceInfo,
  };
};