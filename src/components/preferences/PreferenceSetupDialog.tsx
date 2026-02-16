import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PreferenceSetupWizard } from './PreferenceSetupWizard';
import { DiningPreferences } from '@/types/preferences';

interface PreferenceSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (preferences: DiningPreferences) => void;
  initialPreferences?: DiningPreferences;
}

export const PreferenceSetupDialog: React.FC<PreferenceSetupDialogProps> = ({
  open,
  onOpenChange,
  onComplete,
  initialPreferences,
}) => {
  const handleComplete = (preferences: DiningPreferences) => {
    onComplete(preferences);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Set Up Your Dining Preferences</DialogTitle>
          <DialogDescription>
            Customize your dining preferences to get personalized restaurant recommendations.
          </DialogDescription>
        </DialogHeader>
        <PreferenceSetupWizard
          initialPreferences={initialPreferences}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      </DialogContent>
    </Dialog>
  );
};
