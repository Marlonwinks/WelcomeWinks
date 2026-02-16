import React, { createContext, useContext, ReactNode } from 'react';
import { usePreferencePersistence, UserPreferences } from '../hooks/usePreferencePersistence';
import { useAuth } from './AuthProvider';

interface PreferencesContextType {
  preferences: UserPreferences;
  updateNavigationPreferences: (updates: Partial<UserPreferences['navigation']>) => void;
  updateLocationPreferences: (updates: Partial<UserPreferences['location']>) => void;
  updateGoalPreferences: (updates: Partial<UserPreferences['goals']>) => void;
  updateUIPreferences: (updates: Partial<UserPreferences['ui']>) => void;
  updatePrivacyPreferences: (updates: Partial<UserPreferences['privacy']>) => void;
  updateNotificationPreferences: (updates: Partial<UserPreferences['notifications']>) => void;
  updateOnboardingPreferences: (updates: Partial<UserPreferences['onboarding']>) => void;
  updateDiningPreferences: (updates: Partial<UserPreferences['dining']>) => void;
  markStepCompleted: (step: string) => void;
  isStepCompleted: (step: string) => boolean;
  markOnboardingCompleted: () => void;
  resetPreferences: () => void;
  resetSection: (section: keyof UserPreferences) => void;
  exportPreferences: () => string;
  importPreferences: (jsonString: string) => boolean;
  isLoaded: boolean;
  isSyncing: boolean;
  syncError: string | null;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.uid || null;
  const preferencesHook = usePreferencePersistence(userId);

  return (
    <PreferencesContext.Provider value={preferencesHook}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
