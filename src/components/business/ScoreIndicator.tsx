import React from 'react';
import { Smile, Meh, Frown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHighContrastMode } from '@/lib/accessibility';

export type WelcomingLevel = 'very-welcoming' | 'moderately-welcoming' | 'not-welcoming' | 'unrated';

export interface ScoreIndicatorProps {
  score: number | null;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'badge' | 'full';
  showLabel?: boolean;
  className?: string;
}

// Normalize score to handle legacy scores
const normalizeScore = (score: number | null): number | null => {
  if (score === null || score === undefined) return null;
  // Cap scores at 5.0
  return Math.min(score, 5.0);
};

const getWelcomingLevel = (score: number | null): WelcomingLevel => {
  if (score === null || score === undefined) return 'unrated';

  // Normalize score first
  const normalizedScore = normalizeScore(score);
  if (normalizedScore === null) return 'unrated';

  // Welcome Winks scoring system: 0 to 5.0 (6 questions × 0.833)
  const maxScore = 5.0;
  const highThreshold = maxScore * 0.7; // 3.5
  const lowThreshold = maxScore * 0.3;  // 1.5

  if (normalizedScore >= highThreshold) return 'very-welcoming';
  if (normalizedScore >= lowThreshold) return 'moderately-welcoming';
  return 'not-welcoming';
};

const getScoreConfig = (level: WelcomingLevel, isHighContrast: boolean = false) => {
  const baseConfig = {
    'very-welcoming': {
      icon: Smile,
      color: isHighContrast ? 'text-green-700 dark:text-green-300' : 'text-success',
      bgColor: isHighContrast ? 'bg-green-100 dark:bg-green-900' : 'bg-success/10',
      borderColor: isHighContrast ? 'border-green-400 dark:border-green-600' : 'border-success/20',
      label: 'Very Welcoming',
      ariaLabel: 'Very welcoming business',
      description: 'This business is rated as very welcoming to diverse customers'
    },
    'moderately-welcoming': {
      icon: Meh,
      color: isHighContrast ? 'text-yellow-700 dark:text-yellow-300' : 'text-warning',
      bgColor: isHighContrast ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-warning/10',
      borderColor: isHighContrast ? 'border-yellow-400 dark:border-yellow-600' : 'border-warning/20',
      label: 'Moderately Welcoming',
      ariaLabel: 'Moderately welcoming business',
      description: 'This business is rated as moderately welcoming to diverse customers'
    },
    'not-welcoming': {
      icon: Frown,
      color: isHighContrast ? 'text-red-700 dark:text-red-300' : 'text-destructive',
      bgColor: isHighContrast ? 'bg-red-100 dark:bg-red-900' : 'bg-destructive/10',
      borderColor: isHighContrast ? 'border-red-400 dark:border-red-600' : 'border-destructive/20',
      label: 'Not Very Welcoming',
      ariaLabel: 'Not very welcoming business',
      description: 'This business is rated as not very welcoming to diverse customers'
    },
    'unrated': {
      icon: HelpCircle,
      color: isHighContrast ? 'text-gray-700 dark:text-gray-300' : 'text-muted-foreground',
      bgColor: isHighContrast ? 'bg-gray-100 dark:bg-gray-800' : 'bg-muted/10',
      borderColor: isHighContrast ? 'border-gray-400 dark:border-gray-600' : 'border-muted/20',
      label: 'Not Yet Rated',
      ariaLabel: 'Business not yet rated',
      description: 'This business has not been rated for welcoming atmosphere yet'
    }
  };

  return baseConfig[level];
};

const getSizeConfig = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        iconSize: 'h-4 w-4',
        containerSize: 'h-6 w-6',
        textSize: 'text-xs',
        padding: 'p-1'
      };
    case 'medium':
      return {
        iconSize: 'h-5 w-5',
        containerSize: 'h-8 w-8',
        textSize: 'text-sm',
        padding: 'p-1.5'
      };
    case 'large':
      return {
        iconSize: 'h-6 w-6',
        containerSize: 'h-10 w-10',
        textSize: 'text-base',
        padding: 'p-2'
      };
  }
};

export const ScoreIndicator: React.FC<ScoreIndicatorProps> = ({
  score,
  size = 'medium',
  variant = 'icon',
  showLabel = false,
  className
}) => {
  const normalizedScore = normalizeScore(score);
  const level = getWelcomingLevel(score);
  const isHighContrast = useHighContrastMode();
  const config = getScoreConfig(level, isHighContrast);
  const sizeConfig = getSizeConfig(size);
  const Icon = config.icon;

  // Generate comprehensive aria-label with score information
  const getAriaLabel = () => {
    let label = config.ariaLabel;
    if (normalizedScore !== null) {
      label += `. Score: ${normalizedScore}`;
    }
    return label;
  };

  if (variant === 'icon') {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          sizeConfig.containerSize,
          config.color,
          className
        )}
        role="img"
        aria-label={getAriaLabel()}
        title={`${config.label}${normalizedScore !== null ? ` (Score: ${normalizedScore})` : ''}`}
        aria-describedby={showLabel ? undefined : `score-description-${level}`}
      >
        <Icon className={sizeConfig.iconSize} aria-hidden="true" />
        {/* Hidden description for screen readers */}
        <span id={`score-description-${level}`} className="sr-only">
          {config.description}
        </span>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border',
          sizeConfig.padding,
          config.color,
          config.bgColor,
          config.borderColor,
          className
        )}
        role="img"
        aria-label={getAriaLabel()}
        title={config.description}
      >
        <Icon className={sizeConfig.iconSize} aria-hidden="true" />
        {showLabel && (
          <span className={cn('font-medium', sizeConfig.textSize)} aria-hidden="true">
            {config.label}
          </span>
        )}
        {normalizedScore !== null && !showLabel && (
          <span className={cn('font-medium', sizeConfig.textSize)} aria-hidden="true">
            {normalizedScore.toFixed(1)}
          </span>
        )}
      </div>
    );
  }

  // variant === 'full'
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center gap-1',
        className
      )}
      role="img"
      aria-label={getAriaLabel()}
      title={config.description}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full border',
          sizeConfig.containerSize,
          sizeConfig.padding,
          config.color,
          config.bgColor,
          config.borderColor
        )}
      >
        <Icon className={sizeConfig.iconSize} aria-hidden="true" />
      </div>
      <div className="text-center">
        {normalizedScore !== null && (
          <div
            className={cn('font-bold', config.color, sizeConfig.textSize)}
            aria-hidden="true"
          >
            {normalizedScore.toFixed(1)}
          </div>
        )}
        {showLabel && (
          <div
            className={cn('text-muted-foreground',
              size === 'small' ? 'text-xs' : size === 'medium' ? 'text-xs' : 'text-sm'
            )}
            aria-hidden="true"
          >
            {config.label}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get welcoming level from score (exported for use in other components)
export { getWelcomingLevel };