import React, { useEffect } from 'react';
import { UserGoal } from '@/types/onboarding';
import { AccountOptions } from '../auth/AccountOptions';
import { 
  announceToScreenReader
} from '@/lib/accessibility';

interface RegistrationPromptProps {
  completedGoal: UserGoal;
  onRegister?: () => void;
  onSkip?: () => void;
  onRemindLater?: () => void;
  onClose?: () => void;
  className?: string;
  // New props for AccountOptions integration
  onFullAccount?: () => void;
  onCookieAccount?: () => void;
  onDeclineAccount?: () => void;
}

const GOAL_MESSAGES = {
  'mark-business': 'Great job rating that business!',
  'find-welcoming': 'Found some great places?'
} as const;

export const RegistrationPrompt: React.FC<RegistrationPromptProps> = ({
  completedGoal,
  onRegister,
  onSkip,
  onRemindLater,
  onClose,
  className = '',
  // New props
  onFullAccount,
  onCookieAccount,
  onDeclineAccount,
}) => {
  const goalMessage = GOAL_MESSAGES[completedGoal];

  // Announce modal opening to screen readers
  useEffect(() => {
    announceToScreenReader(
      `Account options opened. ${goalMessage} Choose how you'd like to save your progress.`,
      'polite'
    );
  }, [goalMessage]);

  // Handle full account selection
  const handleFullAccount = () => {
    if (onFullAccount) {
      onFullAccount();
    } else if (onRegister) {
      onRegister();
    }
  };

  // Handle cookie account selection
  const handleCookieAccount = () => {
    if (onCookieAccount) {
      onCookieAccount();
    } else if (onRemindLater) {
      onRemindLater();
    }
  };

  // Handle decline selection
  const handleDecline = () => {
    if (onDeclineAccount) {
      onDeclineAccount();
    } else if (onSkip) {
      onSkip();
    }
  };

  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onSkip) {
      onSkip();
    }
  };

  return (
    <div className={className}>
      <AccountOptions
        completedGoal={completedGoal}
        onFullAccount={handleFullAccount}
        onCookieAccount={handleCookieAccount}
        onDecline={handleDecline}
        onClose={handleClose}
      />
    </div>
  );
};

export default RegistrationPrompt;