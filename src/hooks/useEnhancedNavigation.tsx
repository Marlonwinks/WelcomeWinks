import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation } from '../contexts/NavigationProvider';
import { useOnboarding } from '../contexts/OnboardingProvider';
import { UserGoal } from '../types/onboarding';

export interface EnhancedNavigationHelpers {
  // Context-aware navigation
  goBack: () => void;
  goBackToApp: () => void;
  goHome: () => void;
  navigateToGoal: (goal: UserGoal) => void;
  
  // Navigation state
  canGoBack: boolean;
  isInOnboarding: boolean;
  currentPath: string;
  previousPath: string | null;
  
  // Transition helpers
  navigateWithTransition: (path: string, options?: NavigationOptions) => void;
  replaceWithTransition: (path: string, options?: NavigationOptions) => void;
  
  // Context management
  setNavigationContext: (context: NavigationContext) => void;
  getNavigationBreadcrumbs: () => BreadcrumbItem[];
  
  // Preference helpers
  updateNavigationPreferences: (preferences: NavigationPreferences) => void;
  getNavigationPreferences: () => NavigationPreferences;
}

interface NavigationOptions {
  replace?: boolean;
  preserveContext?: boolean;
  transition?: 'slide' | 'fade' | 'none';
  onComplete?: () => void;
}

interface NavigationContext {
  fromOnboarding?: boolean;
  goal?: UserGoal;
  step?: string;
  preserveHistory?: boolean;
}

interface BreadcrumbItem {
  path: string;
  label: string;
  isActive: boolean;
  isClickable: boolean;
}

interface NavigationPreferences {
  enableTransitions: boolean;
  rememberLastLocation: boolean;
  autoNavigateAfterOnboarding: boolean;
}

// Route labels for breadcrumbs
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/explore': 'Explore',
  '/mark': 'Rate Business',
  '/profile': 'Profile',
  '/notifications': 'Notifications',
  '/onboarding': 'Getting Started',
  '/business': 'Business Details',
};

// Goal-based navigation mapping
const GOAL_ROUTES: Record<UserGoal, string> = {
  'mark-business': '/mark',
  'find-welcoming': '/explore',
};

export const useEnhancedNavigation = (): EnhancedNavigationHelpers => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    state: navState,
    goBack: navGoBack,
    goBackToApp,
    setOnboardingContext,
    updatePreferences,
    getContextualBackPath,
    canNavigateBack,
    isInOnboardingFlow,
  } = useNavigation();


  // Context management (declare first since it's used by other functions)
  const setNavigationContext = useCallback((context: NavigationContext) => {
    setOnboardingContext(
      context.fromOnboarding || false,
      context.goal,
      context.step
    );
  }, [setOnboardingContext]);

  // Context-aware navigation methods
  const goBack = useCallback(() => {
    if (isInOnboardingFlow) {
      // In onboarding, use onboarding-specific back logic
      const contextualPath = getContextualBackPath();
      if (contextualPath && contextualPath !== location.pathname) {
        navigate(contextualPath);
      } else {
        // Exit onboarding
        goBackToApp();
      }
    } else {
      // In app, use navigation history
      navGoBack();
    }
  }, [isInOnboardingFlow, getContextualBackPath, location.pathname, navigate, goBackToApp, navGoBack]);

  const goHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const navigateToGoal = useCallback((goal: UserGoal) => {
    const targetRoute = GOAL_ROUTES[goal];
    if (targetRoute) {
      setNavigationContext({
        goal,
        fromOnboarding: isInOnboardingFlow,
      });
      navigate(targetRoute);
    }
  }, [navigate, setNavigationContext, isInOnboardingFlow]);

  // Transition-aware navigation
  const navigateWithTransition = useCallback((
    path: string,
    options: NavigationOptions = {}
  ) => {
    const { replace = false, preserveContext = false, transition = 'fade', onComplete } = options;

    // Set navigation context if provided
    if (!preserveContext) {
      setNavigationContext({
        fromOnboarding: isInOnboardingFlow,
      });
    }

    // Apply transition class if enabled
    if (navState.preferences.enableTransitions && transition !== 'none') {
      document.body.classList.add(`transition-${transition}`);
      
      // Remove transition class after animation
      setTimeout(() => {
        document.body.classList.remove(`transition-${transition}`);
        onComplete?.();
      }, 300);
    }

    // Navigate
    if (replace) {
      navigate(path, { replace: true });
    } else {
      navigate(path);
    }
  }, [navigate, setNavigationContext, isInOnboardingFlow, navState.preferences.enableTransitions]);

  const replaceWithTransition = useCallback((
    path: string,
    options: NavigationOptions = {}
  ) => {
    navigateWithTransition(path, { ...options, replace: true });
  }, [navigateWithTransition]);



  const getNavigationBreadcrumbs = useCallback((): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always include home
    breadcrumbs.push({
      path: '/',
      label: 'Home',
      isActive: location.pathname === '/',
      isClickable: location.pathname !== '/' && canNavigateBack,
    });

    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Get label for this path
      let label = ROUTE_LABELS[currentPath] || segment;
      
      // Special handling for dynamic routes
      if (segment.match(/^[a-f0-9-]+$/)) {
        // Looks like an ID, use parent route label + "Details"
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        const parentLabel = ROUTE_LABELS[parentPath];
        if (parentLabel) {
          label = `${parentLabel} Details`;
        }
      }

      breadcrumbs.push({
        path: currentPath,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        isActive: isLast,
        isClickable: !isLast && canNavigateBack,
      });
    });

    return breadcrumbs;
  }, [location.pathname, canNavigateBack]);

  // Preference helpers
  const updateNavigationPreferences = useCallback((preferences: NavigationPreferences) => {
    updatePreferences(preferences);
  }, [updatePreferences]);

  const getNavigationPreferences = useCallback((): NavigationPreferences => {
    return navState.preferences;
  }, [navState.preferences]);

  // Computed values
  const currentPath = location.pathname;
  const previousPath = useMemo(() => {
    return getContextualBackPath();
  }, [getContextualBackPath]);

  return {
    // Context-aware navigation
    goBack,
    goBackToApp,
    goHome,
    navigateToGoal,
    
    // Navigation state
    canGoBack: canNavigateBack,
    isInOnboarding: isInOnboardingFlow,
    currentPath,
    previousPath,
    
    // Transition helpers
    navigateWithTransition,
    replaceWithTransition,
    
    // Context management
    setNavigationContext,
    getNavigationBreadcrumbs,
    
    // Preference helpers
    updateNavigationPreferences,
    getNavigationPreferences,
  };
};