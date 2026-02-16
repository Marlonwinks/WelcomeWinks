import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '../ui/button';
import { OnboardingStep } from '../../types/onboarding';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { cn } from '../../lib/utils';

interface BreadcrumbItem {
  step: OnboardingStep;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  isClickable: boolean;
}

interface OnboardingBreadcrumbProps {
  className?: string;
  showHomeLink?: boolean;
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  location: 'Location',
  'goal-selection': 'Choose Goal',
  completed: 'Complete',
};

export const OnboardingBreadcrumb: React.FC<OnboardingBreadcrumbProps> = ({
  className,
  showHomeLink = false,
}) => {
  const { currentStep, goToStep, canGoBack } = useOnboardingFlow();

  // Create breadcrumb items
  const steps: OnboardingStep[] = ['location', 'goal-selection', 'completed'];
  const currentStepIndex = steps.indexOf(currentStep);

  const breadcrumbItems: BreadcrumbItem[] = steps.map((step, index) => ({
    step,
    label: STEP_LABELS[step],
    isActive: step === currentStep,
    isCompleted: index < currentStepIndex,
    isClickable: index < currentStepIndex && canGoBack,
  }));

  const handleStepClick = (step: OnboardingStep, isClickable: boolean) => {
    if (isClickable) {
      goToStep(step);
    }
  };

  const handleHomeClick = () => {
    window.location.href = '/';
  };

  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)} aria-label="Onboarding breadcrumb">
      {/* Home link */}
      {showHomeLink && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHomeClick}
            className="h-auto p-1 text-muted-foreground hover:text-foreground"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only">Home</span>
          </Button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </>
      )}

      {/* Onboarding steps */}
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.step}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStepClick(item.step, item.isClickable)}
            disabled={!item.isClickable}
            className={cn(
              'h-auto px-2 py-1 font-medium transition-colors',
              item.isActive && 'text-foreground bg-muted',
              item.isCompleted && 'text-primary hover:text-primary/80',
              !item.isActive && !item.isCompleted && 'text-muted-foreground',
              item.isClickable && 'hover:text-foreground hover:bg-muted/50 cursor-pointer',
              !item.isClickable && 'cursor-default'
            )}
            aria-current={item.isActive ? 'step' : undefined}
          >
            {item.label}
          </Button>
          
          {/* Separator */}
          {index < breadcrumbItems.length - 1 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};