import React, { useRef, useEffect } from 'react';
import { Star, Search, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { UserGoal, LocationData, GOAL_OPTIONS } from '../../types/onboarding';
import { useGoalPreferences } from '../../hooks/useGoalPreferences';
import { cn } from '../../lib/utils';
import { 
  announceToScreenReader, 
  handleKeyboardNavigation, 
  generateId
} from '../../lib/accessibility';

interface GoalSelectorProps {
  location: LocationData;
  onGoalSelected: (goal: UserGoal) => void;
  selectedGoal?: UserGoal | null;
  className?: string;
}

const iconMap = {
  star: Star,
  search: Search,
};

export const GoalSelector: React.FC<GoalSelectorProps> = ({
  location,
  onGoalSelected,
  selectedGoal,
  className,
}) => {
  const { preferredGoal, setGoalPreference, hasPreferredGoal } = useGoalPreferences();
  const goalSelectorRef = useRef<HTMLDivElement>(null);
  const headingId = generateId('goal-selector-heading');
  const descriptionId = generateId('goal-selector-description');

  // Use the persisted preferred goal if no selectedGoal is provided
  const currentSelectedGoal = selectedGoal ?? preferredGoal;

  // Announce when component loads with previous preference
  useEffect(() => {
    if (hasPreferredGoal() && !selectedGoal) {
      const preferredOption = GOAL_OPTIONS.find(option => option.id === preferredGoal);
      if (preferredOption) {
        announceToScreenReader(
          `Welcome back! Your previous choice "${preferredOption.title}" is highlighted.`,
          'polite'
        );
      }
    }
  }, [hasPreferredGoal, preferredGoal, selectedGoal]);

  const handleGoalSelect = (goalId: UserGoal) => {
    const selectedOption = GOAL_OPTIONS.find(option => option.id === goalId);
    if (selectedOption) {
      announceToScreenReader(`Selected: ${selectedOption.title}`, 'polite');
    }
    
    // Update the persisted preferred goal
    setGoalPreference(goalId);
    // Call the callback
    onGoalSelected(goalId);
  };

  const handleKeyDown = (event: React.KeyboardEvent, goalId: UserGoal) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleGoalSelect(goalId);
    }
  };

  return (
    <div 
      ref={goalSelectorRef}
      className={cn('w-full max-w-2xl mx-auto space-y-6', className)}
      role="region"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 id={headingId} className="text-2xl font-bold text-foreground">
          What would you like to do?
        </h2>
        {location.city && (
          <p id={descriptionId} className="text-muted-foreground">
            Choose your goal for exploring {location.city}
          </p>
        )}
      </div>

      {/* Goal Options */}
      <div 
        className="grid gap-4 md:grid-cols-2"
        role="radiogroup"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
      >
        {GOAL_OPTIONS.map((option, index) => {
          const IconComponent = iconMap[option.icon as keyof typeof iconMap];
          const isSelected = currentSelectedGoal === option.id;
          const isPreviouslySelected = preferredGoal === option.id && !selectedGoal;
          const cardId = generateId(`goal-option-${option.id}`);
          
          return (
            <Card
              key={option.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
                'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
                'border-2 relative',
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : isPreviouslySelected
                  ? 'border-primary/30 bg-primary/2 shadow-sm'
                  : 'border-border hover:border-primary/50'
              )}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleGoalSelect(option.id)}
              onKeyDown={(e) => handleKeyDown(e, option.id)}
              aria-labelledby={`${cardId}-title`}
              aria-describedby={`${cardId}-description`}
            >
              <CardContent className="p-6 space-y-4">
                {/* Previously Selected Badge */}
                {isPreviouslySelected && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-3 right-3 text-xs"
                    aria-label="This was your previous choice"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" aria-hidden="true" />
                    Previous Choice
                  </Badge>
                )}

                {/* Icon */}
                <div 
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center mx-auto',
                    isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : isPreviouslySelected
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                  aria-hidden="true"
                >
                  <IconComponent className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="text-center space-y-2">
                  <h3 
                    id={`${cardId}-title`}
                    className="text-lg font-semibold text-foreground"
                  >
                    {option.title}
                  </h3>
                  <p 
                    id={`${cardId}-description`}
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {option.description}
                  </p>
                </div>

                {/* Action Button */}
                <Button
                  variant={isSelected ? "default" : "outline"}
                  className="w-full mt-4"
                  size="lg"
                  tabIndex={-1} // Prevent double focus since card is focusable
                  aria-hidden="true" // Hide from screen readers since card handles interaction
                >
                  {option.primaryAction}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Helper Text */}
      <div className="text-center space-y-2" role="region" aria-label="Additional information">
        {hasPreferredGoal() && !selectedGoal && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Welcome back! We've highlighted your previous choice.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          You can always change your goal later in the app
        </p>
      </div>
    </div>
  );
};