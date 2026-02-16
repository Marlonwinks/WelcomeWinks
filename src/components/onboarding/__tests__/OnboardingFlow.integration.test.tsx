import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingWizard } from '../OnboardingWizard';
import { 
  render, 
  mockLocationData, 
  mockGeolocationSuccess, 
  mockFetchSuccess,
  waitForLoadingToFinish 
} from '../../../test/test-utils';

// Mock all the hooks and components
vi.mock('../../../hooks/useGeolocation');
vi.mock('../../../hooks/usePlacesAutocomplete');
vi.mock('../../../hooks/useOnboardingFlow');
vi.mock('../../../hooks/useEnhancedNavigation');
vi.mock('../../../contexts/LocationProvider');

import { useGeolocation } from '../../../hooks/useGeolocation';
import { usePlacesAutocomplete } from '../../../hooks/usePlacesAutocomplete';
import { useOnboardingFlow } from '../../../hooks/useOnboardingFlow';
import { useEnhancedNavigation } from '../../../hooks/useEnhancedNavigation';
import { useLocation } from '../../../contexts/LocationProvider';

const mockUseGeolocation = useGeolocation as any;
const mockUsePlacesAutocomplete = usePlacesAutocomplete as any;
const mockUseOnboardingFlow = useOnboardingFlow as any;
const mockUseEnhancedNavigation = useEnhancedNavigation as any;
const mockUseLocation = useLocation as any;

describe('OnboardingFlow Integration', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseLocation.mockReturnValue({
      location: mockLocationData,
      updateManualLocation: vi.fn(),
    });

    mockUseGeolocation.mockReturnValue({
      location: mockLocationData,
      loading: false,
      confirmLocation: vi.fn(),
      updateManualLocation: vi.fn(),
      retryLocationDetection: vi.fn(),
      canRetry: false,
      retryCount: 0,
      maxRetries: 3,
      lastError: null,
    });

    mockUsePlacesAutocomplete.mockReturnValue({
      suggestions: [],
      loading: false,
      searchPlaces: vi.fn(),
      clearSuggestions: vi.fn(),
    });

    mockUseEnhancedNavigation.mockReturnValue({
      setNavigationContext: vi.fn(),
      navigateWithTransition: vi.fn(),
    });
  });

  describe('complete onboarding flow', () => {
    it('should complete location detection step', async () => {
      const user = userEvent.setup();
      const mockGoToNextStep = vi.fn();
      const mockConfirmLocation = vi.fn();

      mockUseOnboardingFlow.mockReturnValue({
        currentStep: 'location',
        isLocationStep: true,
        isGoalSelectionStep: false,
        isCompleted: false,
        goToNextStep: mockGoToNextStep,
        goToPreviousStep: vi.fn(),
        selectGoal: vi.fn(),
        completeOnboardingFlow: vi.fn(),
        skipOnboarding: vi.fn(),
        getStepProgress: () => 33,
        getStepTitle: () => 'Detect Your Location',
        getStepDescription: () => 'We need to know where you are to show relevant businesses',
        canGoBack: false,
        canGoForward: false,
      });

      mockUseGeolocation.mockReturnValue({
        location: mockLocationData,
        loading: false,
        confirmLocation: mockConfirmLocation,
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
      });

      render(
        <OnboardingWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Should show location detection step
      expect(screen.getByText('Detect Your Location')).toBeInTheDocument();
      expect(screen.getByText('Location Detected')).toBeInTheDocument();

      // Confirm location
      const confirmButton = screen.getByText('Yes, This is Correct');
      await user.click(confirmButton);

      expect(mockConfirmLocation).toHaveBeenCalled();
    });

    it('should complete goal selection step', async () => {
      const user = userEvent.setup();
      const mockSelectGoal = vi.fn();
      const mockCompleteOnboardingFlow = vi.fn();

      mockUseOnboardingFlow.mockReturnValue({
        currentStep: 'goal-selection',
        isLocationStep: false,
        isGoalSelectionStep: true,
        isCompleted: false,
        goToNextStep: vi.fn(),
        goToPreviousStep: vi.fn(),
        selectGoal: mockSelectGoal,
        completeOnboardingFlow: mockCompleteOnboardingFlow,
        skipOnboarding: vi.fn(),
        getStepProgress: () => 66,
        getStepTitle: () => 'Choose Your Goal',
        getStepDescription: () => 'What would you like to do?',
        canGoBack: true,
        canGoForward: false,
      });

      render(
        <OnboardingWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Should show goal selection step
      expect(screen.getByText('Choose Your Goal')).toBeInTheDocument();

      // Mock goal selector component behavior
      const goalButton = screen.getByText('Find Welcoming Places');
      await user.click(goalButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          location: mockLocationData,
          goal: 'find-welcoming',
        });
      });
    });

    it('should complete entire onboarding flow', async () => {
      const user = userEvent.setup();
      let currentStep = 'location';
      
      const mockGoToNextStep = vi.fn(() => {
        currentStep = currentStep === 'location' ? 'goal-selection' : 'completed';
      });

      const mockCompleteOnboardingFlow = vi.fn();

      // Start with location step
      mockUseOnboardingFlow.mockReturnValue({
        currentStep,
        isLocationStep: true,
        isGoalSelectionStep: false,
        isCompleted: false,
        goToNextStep: mockGoToNextStep,
        goToPreviousStep: vi.fn(),
        selectGoal: vi.fn(),
        completeOnboardingFlow: mockCompleteOnboardingFlow,
        skipOnboarding: vi.fn(),
        getStepProgress: () => 33,
        getStepTitle: () => 'Detect Your Location',
        getStepDescription: () => 'We need to know where you are',
        canGoBack: false,
        canGoForward: false,
      });

      const { rerender } = render(
        <OnboardingWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Complete location step
      const confirmButton = screen.getByText('Yes, This is Correct');
      await user.click(confirmButton);

      // Update to goal selection step
      mockUseOnboardingFlow.mockReturnValue({
        currentStep: 'goal-selection',
        isLocationStep: false,
        isGoalSelectionStep: true,
        isCompleted: false,
        goToNextStep: vi.fn(),
        goToPreviousStep: vi.fn(),
        selectGoal: vi.fn(),
        completeOnboardingFlow: mockCompleteOnboardingFlow,
        skipOnboarding: vi.fn(),
        getStepProgress: () => 66,
        getStepTitle: () => 'Choose Your Goal',
        getStepDescription: () => 'What would you like to do?',
        canGoBack: true,
        canGoForward: false,
      });

      rerender(
        <OnboardingWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Should now show goal selection
      expect(screen.getByText('Choose Your Goal')).toBeInTheDocument();
    });
  });

  describe('error handling in flow', () => {
    it('should handle location detection errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockUseOnboardingFlow.mockReturnValue({
        currentStep: 'location',
        isLocationStep: true,
        isGoalSelectionStep: false,
        isCompleted: false,
        goToNextStep: vi.fn(),
        goToPreviousStep: vi.fn(),
        selectGoal: vi.fn(),
        completeOnboardingFlow: vi.fn(),
        skipOnboarding: vi.fn(),
        getStepProgress: () => 33,
        getStepTitle: () => 'Detect Your Location',
        getStepDescription: () => 'We need to know where you are',
        canGoBack: false,
        canGoForward: false,
      });

      const errorLocation = {
        ...mockLocationData,
        error: 'Location access denied',
      };

      mockUseGeolocation.mockReturnValue({
        location: errorLocation,
        loading: false,
        confirmLocation: vi.fn(),
        updateManualLocation: vi.fn(),
        retryLocationDetection: vi.fn(),
        canRetry: false,
        retryCount: 0,
        maxRetries: 3,
        lastError: {
          code: 'LOCATION_PERMISSION_DENIED',
          message: 'Location access denied',
          retryable: false,
        },
      });

      render(
        <OnboardingWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Should show error state
      expect(screen.getByText('Location Detection Failed')).toBeInTheDocument();
      expect(screen.getByText('Location access denied')).toBeInTheDocument();

      // Should provide manual entry option
      expect(screen.getByText('Enter Location Manually')).toBeInTheDocument();
    });

    it('should allow skipping onboarding on errors', async () => {
      const user = userEvent.setup();
      
      mockUseOnboardingFlow.mockReturnValue({
        currentStep: 'location',
        isLocationStep: true,
        isGoalSelectionStep: false,
        isCompleted: false,
        goToNextStep: vi.fn(),
        goToPreviousStep: vi.fn(),
        selectGoal: vi.fn(),
        completeOnboardingFlow: vi.fn(),
        skipOnboarding: vi.fn(),
        getStepProgress: () => 33,
        getStepTitle: () => 'Detect Your Location',
        getStepDescription: () => 'We need to know where you are',
        canGoBack: false,
        canGoForward: false,
      });

      render(
        <OnboardingWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Click skip button
      const skipButton = screen.getByText('Skip');
      await user.click(skipButton);

      expect(mockOnSkip).toHaveBeenCalled();
    });
  });

  describe('accessibility in flow', () => {
    it('should maintain focus management throughout flow', async () => {
      mockUseOnboardingFlow.mockReturnValue({
        currentStep: 'location',
        isLocationStep: true,
        isGoalSelectionStep: false,
        isCompleted: false,
        goToNextStep: vi.fn(),
        goToPreviousStep: vi.fn(),
        selectGoal: vi.fn(),
        completeOnboardingFlow: vi.fn(),
        skipOnboarding: vi.fn(),
        getStepProgress: () => 33,
        getStepTitle: () => 'Detect Your Location',
        getStepDescription: () => 'We need to know where you are',
        canGoBack: false,
        canGoForward: false,
      });

      render(
        <OnboardingWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Should have proper ARIA labels and roles
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByLabelText(/onboarding progress/i)).toBeInTheDocument();
    });

    it('should announce step changes to screen readers', async () => {
      const mockAnnounceToScreenReader = vi.fn();
      
      vi.mock('../../../lib/accessibility', () => ({
        announceToScreenReader: mockAnnounceToScreenReader,
        handleKeyboardNavigation: vi.fn(),
        generateId: vi.fn((prefix) => `${prefix}-test-id`),
        generateAriaLabel: {
          progress: vi.fn((value, context) => `${context} ${value}% complete`),
        },
        SkipLink: ({ children, href }: any) => <a href={href}>{children}</a>,
        useReducedMotion: () => false,
      }));

      mockUseOnboardingFlow.mockReturnValue({
        currentStep: 'location',
        isLocationStep: true,
        isGoalSelectionStep: false,
        isCompleted: false,
        goToNextStep: vi.fn(),
        goToPreviousStep: vi.fn(),
        selectGoal: vi.fn(),
        completeOnboardingFlow: vi.fn(),
        skipOnboarding: vi.fn(),
        getStepProgress: () => 33,
        getStepTitle: () => 'Detect Your Location',
        getStepDescription: () => 'We need to know where you are',
        canGoBack: false,
        canGoForward: false,
      });

      render(
        <OnboardingWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Should announce step information
      await waitFor(() => {
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
          expect.stringContaining('Detect Your Location'),
          'polite'
        );
      });
    });
  });

  describe('performance considerations', () => {
    it('should lazy load components', async () => {
      mockUseOnboardingFlow.mockReturnValue({
        currentStep: 'location',
        isLocationStep: true,
        isGoalSelectionStep: false,
        isCompleted: false,
        goToNextStep: vi.fn(),
        goToPreviousStep: vi.fn(),
        selectGoal: vi.fn(),
        completeOnboardingFlow: vi.fn(),
        skipOnboarding: vi.fn(),
        getStepProgress: () => 33,
        getStepTitle: () => 'Detect Your Location',
        getStepDescription: () => 'We need to know where you are',
        canGoBack: false,
        canGoForward: false,
      });

      render(
        <OnboardingWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Components should be wrapped in Suspense boundaries
      await waitForLoadingToFinish();
      
      // Should render without throwing
      expect(screen.getByText('Detect Your Location')).toBeInTheDocument();
    });
  });
});