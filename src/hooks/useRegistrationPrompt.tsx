import { useState, useCallback } from 'react';
import { useOnboarding } from '@/contexts/OnboardingProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { UserGoal, RegistrationData } from '@/types/onboarding';

interface UseRegistrationPromptReturn {
  showPrompt: boolean;
  showForm: boolean;
  isLoading: boolean;
  shouldShowPrompt: (completedGoal: UserGoal) => boolean;
  showRegistrationPrompt: (completedGoal: UserGoal) => void;
  handleRegister: () => void;
  handleSkip: () => void;
  handleRemindLater: () => void;
  handleFormSubmit: (data: RegistrationData) => void;
  handleFormBack: () => void;
  hidePrompt: () => void;
  completedGoal: UserGoal | null;
  // New methods for AccountOptions integration
  handleFullAccount: () => void;
  handleCookieAccount: () => void;
  handleDeclineAccount: () => void;
}

const REMIND_LATER_DELAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useRegistrationPrompt = (): UseRegistrationPromptReturn => {
  const { state, setRegistrationStatus } = useOnboarding();
  const { user, createCookieAccount, getCurrentAccount } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completedGoal, setCompletedGoal] = useState<UserGoal | null>(null);

  // Check if we should show the registration prompt
  const shouldShowPrompt = useCallback((goal: UserGoal): boolean => {
    // Disabled: Account selection prompt removed
    return false;
  }, []);

  // Show the registration prompt
  const showRegistrationPrompt = useCallback((goal: UserGoal) => {
    if (shouldShowPrompt(goal)) {
      setCompletedGoal(goal);
      setShowPrompt(true);
    }
  }, [shouldShowPrompt]);

  // Handle user choosing to register
  const handleRegister = useCallback(() => {
    setShowPrompt(false);
    setShowForm(true);
  }, []);

  // Handle user skipping registration permanently
  const handleSkip = useCallback(() => {
    setRegistrationStatus('skipped');
    setShowPrompt(false);
    setCompletedGoal(null);
  }, [setRegistrationStatus]);

  // Handle user choosing to be reminded later
  const handleRemindLater = useCallback(() => {
    setRegistrationStatus('remind-later');
    localStorage.setItem('registration-remind-later-time', Date.now().toString());
    setShowPrompt(false);
    setCompletedGoal(null);
  }, [setRegistrationStatus]);

  // Handle registration form submission
  const handleFormSubmit = useCallback(async (data: RegistrationData) => {
    setIsLoading(true);

    try {
      // Simulate API call - in real implementation, this would call your backend
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Store registration data locally (in real app, this would be handled by backend)
      localStorage.setItem('user-registration-data', JSON.stringify({
        ...data,
        registrationDate: new Date().toISOString(),
      }));

      // Update registration status
      setRegistrationStatus('registered');

      // Reset business view count since user is now registered
      localStorage.removeItem('business-view-count');
      localStorage.removeItem('registration-remind-later-time');

      // Hide form and reset state
      setShowForm(false);
      setCompletedGoal(null);
      setIsLoading(false);

      // Show success message (handled by the form component)
    } catch (error) {
      console.error('Registration failed:', error);
      setIsLoading(false);
      // Error handling would be done in the form component
    }
  }, [setRegistrationStatus]);

  // Handle going back from form to prompt
  const handleFormBack = useCallback(() => {
    setShowForm(false);
    setShowPrompt(true);
  }, []);

  // Hide prompt without changing registration status
  const hidePrompt = useCallback(() => {
    setShowPrompt(false);
    setCompletedGoal(null);
  }, []);

  // Handle full account selection (same as handleRegister)
  const handleFullAccount = useCallback(() => {
    setShowPrompt(false);
    setShowForm(true);
  }, []);

  // Handle cookie account selection
  const handleCookieAccount = useCallback(async () => {
    setIsLoading(true);

    try {
      // Create cookie account automatically
      await createCookieAccount();

      // Update registration status to indicate user chose cookie account
      setRegistrationStatus('remind-later'); // Use remind-later to allow future upgrade
      localStorage.setItem('registration-remind-later-time', Date.now().toString());

      // Hide prompt
      setShowPrompt(false);
      setCompletedGoal(null);
    } catch (error) {
      console.error('Failed to create cookie account:', error);
    } finally {
      setIsLoading(false);
    }
  }, [createCookieAccount, setRegistrationStatus]);

  // Handle decline account selection
  const handleDeclineAccount = useCallback(async () => {
    setIsLoading(true);

    try {
      // Create cookie account automatically (for data persistence)
      await createCookieAccount();

      // Mark as skipped but still create cookie account for functionality
      setRegistrationStatus('skipped');

      // Hide prompt
      setShowPrompt(false);
      setCompletedGoal(null);
    } catch (error) {
      console.error('Failed to create cookie account:', error);
    } finally {
      setIsLoading(false);
    }
  }, [createCookieAccount, setRegistrationStatus]);

  return {
    showPrompt,
    showForm,
    isLoading,
    shouldShowPrompt,
    showRegistrationPrompt,
    handleRegister,
    handleSkip,
    handleRemindLater,
    handleFormSubmit,
    handleFormBack,
    hidePrompt,
    completedGoal,
    // New methods for AccountOptions integration
    handleFullAccount,
    handleCookieAccount,
    handleDeclineAccount,
  };
};

export default useRegistrationPrompt;