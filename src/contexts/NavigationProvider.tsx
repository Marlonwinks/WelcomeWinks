import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserGoal } from '../types/onboarding';

// Navigation history item
interface NavigationHistoryItem {
  path: string;
  timestamp: Date;
  context?: {
    fromOnboarding?: boolean;
    goal?: UserGoal;
    step?: string;
  };
}

// Navigation state
interface NavigationState {
  history: NavigationHistoryItem[];
  currentContext: {
    isInOnboarding: boolean;
    currentGoal?: UserGoal;
    canGoBack: boolean;
    previousPath?: string;
  };
  preferences: {
    enableTransitions: boolean;
    rememberLastLocation: boolean;
    autoNavigateAfterOnboarding: boolean;
  };
}

// Action types
type NavigationAction =
  | { type: 'PUSH_HISTORY'; payload: NavigationHistoryItem }
  | { type: 'SET_ONBOARDING_CONTEXT'; payload: { isInOnboarding: boolean; goal?: UserGoal; step?: string } }
  | { type: 'SET_PREFERENCES'; payload: Partial<NavigationState['preferences']> }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'LOAD_STATE'; payload: NavigationState };

// Context interface
interface NavigationContextType {
  state: NavigationState;
  pushToHistory: (path: string, context?: NavigationHistoryItem['context']) => void;
  goBack: () => void;
  goBackToApp: () => void;
  setOnboardingContext: (isInOnboarding: boolean, goal?: UserGoal, step?: string) => void;
  updatePreferences: (preferences: Partial<NavigationState['preferences']>) => void;
  getContextualBackPath: () => string | null;
  canNavigateBack: boolean;
  isInOnboardingFlow: boolean;
  getCurrentGoal: () => UserGoal | undefined;
}

// Default state
const DEFAULT_NAVIGATION_STATE: NavigationState = {
  history: [],
  currentContext: {
    isInOnboarding: false,
    canGoBack: false,
  },
  preferences: {
    enableTransitions: true,
    rememberLastLocation: true,
    autoNavigateAfterOnboarding: true,
  },
};

// Create context
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Reducer
function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'PUSH_HISTORY':
      const newHistory = [...state.history, action.payload];
      // Keep only last 10 items to prevent memory issues
      const trimmedHistory = newHistory.slice(-10);
      
      return {
        ...state,
        history: trimmedHistory,
        currentContext: {
          ...state.currentContext,
          canGoBack: trimmedHistory.length > 1,
          previousPath: trimmedHistory.length > 1 ? trimmedHistory[trimmedHistory.length - 2].path : undefined,
        },
      };
    
    case 'SET_ONBOARDING_CONTEXT':
      return {
        ...state,
        currentContext: {
          ...state.currentContext,
          isInOnboarding: action.payload.isInOnboarding,
          currentGoal: action.payload.goal,
        },
      };
    
    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };
    
    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [],
        currentContext: {
          ...state.currentContext,
          canGoBack: false,
          previousPath: undefined,
        },
      };
    
    case 'LOAD_STATE':
      return action.payload;
    
    default:
      return state;
  }
}

// Storage key
const NAVIGATION_STORAGE_KEY = 'welcome-winks-navigation';

// Helper functions for localStorage
const loadNavigationState = (): NavigationState => {
  try {
    const stored = localStorage.getItem(NAVIGATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      if (parsed.history) {
        parsed.history = parsed.history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
      return { ...DEFAULT_NAVIGATION_STATE, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load navigation state from localStorage:', error);
  }
  return DEFAULT_NAVIGATION_STATE;
};

const saveNavigationState = (state: NavigationState): void => {
  try {
    // Only save preferences and limited history to localStorage
    const stateToSave = {
      preferences: state.preferences,
      history: state.history.slice(-5), // Keep only last 5 items
    };
    localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.warn('Failed to save navigation state to localStorage:', error);
  }
};

// Provider component
interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(navigationReducer, DEFAULT_NAVIGATION_STATE);
  const navigate = useNavigate();
  const location = useLocation();

  // Load state from localStorage on mount
  useEffect(() => {
    const loadedState = loadNavigationState();
    dispatch({ type: 'LOAD_STATE', payload: loadedState });
  }, []);

  // Save state to localStorage whenever preferences change
  useEffect(() => {
    saveNavigationState(state);
  }, [state.preferences, state.history]);

  // Track location changes
  useEffect(() => {
    const historyItem: NavigationHistoryItem = {
      path: location.pathname,
      timestamp: new Date(),
      context: {
        fromOnboarding: state.currentContext.isInOnboarding,
        goal: state.currentContext.currentGoal,
      },
    };
    
    // Don't add duplicate consecutive entries
    const lastItem = state.history[state.history.length - 1];
    if (!lastItem || lastItem.path !== location.pathname) {
      dispatch({ type: 'PUSH_HISTORY', payload: historyItem });
    }
  }, [location.pathname, state.currentContext.isInOnboarding, state.currentContext.currentGoal]);

  // Context methods
  const pushToHistory = useCallback((path: string, context?: NavigationHistoryItem['context']) => {
    const historyItem: NavigationHistoryItem = {
      path,
      timestamp: new Date(),
      context,
    };
    dispatch({ type: 'PUSH_HISTORY', payload: historyItem });
  }, []);

  const goBack = useCallback(() => {
    if (state.currentContext.canGoBack && state.currentContext.previousPath) {
      navigate(state.currentContext.previousPath);
    } else {
      // Fallback to browser back
      window.history.back();
    }
  }, [state.currentContext.canGoBack, state.currentContext.previousPath, navigate]);

  const goBackToApp = useCallback(() => {
    // Find the last non-onboarding path in history
    const lastAppPath = state.history
      .slice()
      .reverse()
      .find(item => !item.context?.fromOnboarding && item.path !== '/onboarding');
    
    if (lastAppPath) {
      navigate(lastAppPath.path);
    } else {
      // Default to home if no app history found
      navigate('/');
    }
  }, [state.history, navigate]);

  const setOnboardingContext = useCallback((isInOnboarding: boolean, goal?: UserGoal, step?: string) => {
    dispatch({
      type: 'SET_ONBOARDING_CONTEXT',
      payload: { isInOnboarding, goal, step },
    });
  }, []);

  const updatePreferences = useCallback((preferences: Partial<NavigationState['preferences']>) => {
    dispatch({ type: 'SET_PREFERENCES', payload: preferences });
  }, []);

  const getContextualBackPath = useCallback((): string | null => {
    if (state.currentContext.isInOnboarding) {
      // In onboarding, back should go to previous onboarding step or exit
      return state.currentContext.previousPath || '/';
    }
    
    // In app, back should go to previous app page
    const lastAppPath = state.history
      .slice()
      .reverse()
      .find(item => !item.context?.fromOnboarding && item.path !== location.pathname);
    
    return lastAppPath?.path || '/';
  }, [state.currentContext.isInOnboarding, state.currentContext.previousPath, state.history, location.pathname]);

  // Computed values
  const canNavigateBack = state.currentContext.canGoBack;
  const isInOnboardingFlow = state.currentContext.isInOnboarding;
  const getCurrentGoal = useCallback(() => state.currentContext.currentGoal, [state.currentContext.currentGoal]);

  const contextValue: NavigationContextType = {
    state,
    pushToHistory,
    goBack,
    goBackToApp,
    setOnboardingContext,
    updatePreferences,
    getContextualBackPath,
    canNavigateBack,
    isInOnboardingFlow,
    getCurrentGoal,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

// Custom hook
export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};