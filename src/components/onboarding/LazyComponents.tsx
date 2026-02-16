/**
 * Lazy-loaded onboarding components for better performance
 */

import React, { Suspense } from 'react';
import { createLazyComponent, Skeleton, LoadingSpinner } from '../../lib/performance';

// Loading fallback components
const LocationDetectorSkeleton = () => (
  <div className="w-full max-w-md mx-auto">
    <div className="border rounded-lg p-6 space-y-4">
      <div className="text-center space-y-2">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="w-16 h-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-40 mx-auto" />
    </div>
  </div>
);

const GoalSelectorSkeleton = () => (
  <div className="w-full max-w-2xl mx-auto space-y-6">
    <div className="text-center space-y-2">
      <Skeleton className="h-8 w-64 mx-auto" />
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="border rounded-lg p-6 space-y-4">
          <Skeleton className="w-12 h-12 rounded-full mx-auto" />
          <div className="text-center space-y-2">
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-4 w-40 mx-auto" />
            <Skeleton className="h-4 w-36 mx-auto" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  </div>
);

const RegistrationFormSkeleton = () => (
  <div className="max-w-2xl mx-auto p-4">
    <div className="border rounded-lg">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  </div>
);

const AccountStepSkeleton = () => (
  <div className="w-full max-w-md mx-auto">
    <div className="border rounded-lg p-6 space-y-6">
      <div className="text-center space-y-4">
        <Skeleton className="w-16 h-16 rounded-full mx-auto" />
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-1.5 h-1.5 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  </div>
);

const RegistrationPromptSkeleton = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="w-full max-w-md mx-auto bg-background border rounded-lg shadow-xl">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-4 h-4 rounded-full mt-0.5" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Lazy-loaded components
export const LazyLocationDetector = createLazyComponent(
  () => import('./LocationDetector').then(module => ({ default: module.LocationDetector })),
  LocationDetectorSkeleton
);

export const LazyGoalSelector = createLazyComponent(
  () => import('./GoalSelector').then(module => ({ default: module.GoalSelector })),
  GoalSelectorSkeleton
);

export const LazyRegistrationForm = createLazyComponent(
  () => import('./RegistrationForm').then(module => ({ default: module.default })),
  RegistrationFormSkeleton
);

export const LazyAccountStep = createLazyComponent(
  () => import('./AccountStep').then(module => ({ default: module.AccountStep })),
  AccountStepSkeleton
);

export const LazyRegistrationPrompt = createLazyComponent(
  () => import('./RegistrationPrompt').then(module => ({ default: module.default })),
  RegistrationPromptSkeleton
);

// Preload components for better UX
export const preloadOnboardingComponents = () => {
  // Preload critical components
  import('./LocationDetector');
  import('./GoalSelector');
  
  // Preload less critical components after a delay
  setTimeout(() => {
    import('./AccountStep');
    import('./RegistrationForm');
    import('./RegistrationPrompt');
  }, 1000);
};

// Component with error boundary and performance monitoring
export const PerformantOnboardingComponent: React.FC<{
  children: React.ReactNode;
  componentName: string;
}> = ({ children, componentName }) => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${componentName}-mount-start`);
      
      return () => {
        performance.mark(`${componentName}-mount-end`);
        performance.measure(
          `${componentName}-mount-time`,
          `${componentName}-mount-start`,
          `${componentName}-mount-end`
        );
      };
    }
  }, [componentName]);
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="large" />
      </div>
    }>
      {children}
    </Suspense>
  );
};