import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { OnboardingWizard } from './OnboardingWizard';
import { useOnboarding } from '../../contexts/OnboardingProvider';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { LocationData, UserGoal } from '../../types/onboarding';

interface OnboardingRouteProps {
  children: React.ReactNode;
}

/**
 * OnboardingRoute component that wraps the main app and shows onboarding
 * for new users or redirects to onboarding if needed.
 */
export const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ children }) => {
  const { shouldShowOnboarding, isOnboardingComplete } = useOnboarding();
  const { navigateToGoal } = useOnboardingFlow();
  const location = useLocation();

  // Don't show onboarding on certain routes (like direct business links)
  const skipOnboardingRoutes = ['/business/', '/admin'];
  const shouldSkipOnboarding = skipOnboardingRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  // Handle onboarding completion
  const handleOnboardingComplete = (userPreferences: { location: LocationData; goal: UserGoal }) => {
    // Navigate to the appropriate page based on the selected goal
    navigateToGoal(userPreferences.goal);
  };

  // Handle onboarding skip
  const handleOnboardingSkip = () => {
    // Navigate to home page when skipped
    window.location.href = '/';
  };

  // Show onboarding if:
  // 1. User should see onboarding (not completed)
  // 2. We're not on a route that should skip onboarding
  // 3. We're not already on the onboarding route
  if (shouldShowOnboarding && !shouldSkipOnboarding && location.pathname !== '/onboarding') {
    return (
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // If user is on /onboarding route but has completed onboarding, redirect to home
  if (location.pathname === '/onboarding' && isOnboardingComplete) {
    return <Navigate to="/" replace />;
  }

  // If user is on /onboarding route and should see onboarding, show the wizard
  if (location.pathname === '/onboarding' && shouldShowOnboarding) {
    return (
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // Otherwise, render the normal app
  return <>{children}</>;
};