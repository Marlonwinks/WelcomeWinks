import React from 'react';
import { Sparkles, Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RelevanceScore } from '@/types/businessAttributes';

interface MatchQualityIndicatorProps {
  score: RelevanceScore;
  compact?: boolean; // For list view vs detail view
  onClick?: () => void; // For showing detailed match breakdown
  tabIndex?: number;
}

export const MatchQualityIndicator: React.FC<MatchQualityIndicatorProps> = ({
  score,
  compact = false,
  onClick,
  tabIndex = 0,
}) => {
  const { totalScore } = score;

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  // Determine match quality level
  const getMatchQuality = () => {
    if (totalScore >= 80) return 'excellent';
    if (totalScore >= 60) return 'good';
    if (totalScore >= 40) return 'fair';
    return 'poor';
  };

  const matchQuality = getMatchQuality();

  // Color coding for match quality levels with enhanced contrast
  // Using color-blind friendly palette and ensuring WCAG AA compliance
  const getColorClasses = () => {
    switch (matchQuality) {
      case 'excellent':
        return {
          bg: 'bg-green-50 dark:bg-green-950 contrast-more:bg-green-100 contrast-more:dark:bg-green-900',
          border: 'border-green-300 dark:border-green-600 contrast-more:border-green-500 contrast-more:dark:border-green-400',
          text: 'text-green-800 dark:text-green-200 contrast-more:text-green-900 contrast-more:dark:text-green-100',
          icon: 'text-green-700 dark:text-green-300 contrast-more:text-green-900 contrast-more:dark:text-green-100',
        };
      case 'good':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950 contrast-more:bg-blue-100 contrast-more:dark:bg-blue-900',
          border: 'border-blue-300 dark:border-blue-600 contrast-more:border-blue-500 contrast-more:dark:border-blue-400',
          text: 'text-blue-800 dark:text-blue-200 contrast-more:text-blue-900 contrast-more:dark:text-blue-100',
          icon: 'text-blue-700 dark:text-blue-300 contrast-more:text-blue-900 contrast-more:dark:text-blue-100',
        };
      case 'fair':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950 contrast-more:bg-amber-100 contrast-more:dark:bg-amber-900',
          border: 'border-amber-400 dark:border-amber-600 contrast-more:border-amber-600 contrast-more:dark:border-amber-400',
          text: 'text-amber-900 dark:text-amber-200 contrast-more:text-amber-950 contrast-more:dark:text-amber-100',
          icon: 'text-amber-800 dark:text-amber-300 contrast-more:text-amber-950 contrast-more:dark:text-amber-100',
        };
      case 'poor':
        return {
          bg: 'bg-gray-50 dark:bg-gray-900 contrast-more:bg-gray-100 contrast-more:dark:bg-gray-800',
          border: 'border-gray-300 dark:border-gray-600 contrast-more:border-gray-500 contrast-more:dark:border-gray-400',
          text: 'text-gray-800 dark:text-gray-200 contrast-more:text-gray-900 contrast-more:dark:text-gray-100',
          icon: 'text-gray-700 dark:text-gray-300 contrast-more:text-gray-900 contrast-more:dark:text-gray-100',
        };
    }
  };

  const colors = getColorClasses();

  // Get match label
  const getMatchLabel = () => {
    switch (matchQuality) {
      case 'excellent':
        return 'Excellent Match';
      case 'good':
        return 'Good Match';
      case 'fair':
        return 'Fair Match';
      case 'poor':
        return 'Low Match';
    }
  };

  // Get icon based on match quality
  const getIcon = () => {
    switch (matchQuality) {
      case 'excellent':
        return <Sparkles className={cn('h-4 w-4', colors.icon)} />;
      case 'good':
        return <Check className={cn('h-4 w-4', colors.icon)} />;
      case 'fair':
        return <Star className={cn('h-4 w-4', colors.icon)} />;
      default:
        return <Star className={cn('h-4 w-4', colors.icon)} />;
    }
  };

  // Compact mode for list view
  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 shadow-sm',
          colors.bg,
          colors.border,
          onClick && 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-opacity'
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        tabIndex={onClick ? tabIndex : undefined}
        role={onClick ? 'button' : undefined}
        aria-label={`Match quality: ${Math.round(totalScore)}% ${getMatchLabel()}${onClick ? '. Press Enter to view details' : ''}`}
      >
        {getIcon()}
        <span className={cn('text-xs font-bold', colors.text)}>
          {Math.round(totalScore)}%
        </span>
        {/* Hidden text for screen readers, visible in high contrast mode */}
        <span className="sr-only contrast-more:not-sr-only contrast-more:text-xs contrast-more:font-semibold">
          {getMatchLabel()}
        </span>
      </div>
    );
  }

  // Detailed mode for business detail page
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 shadow-md',
        colors.bg,
        colors.border,
        onClick && 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? tabIndex : undefined}
      role={onClick ? 'button' : 'region'}
      aria-label={`Match quality: ${Math.round(totalScore)}% ${getMatchLabel()}. Based on your preferences${onClick ? '. Press Enter to view details' : ''}`}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className={cn('text-sm font-semibold tracking-normal', colors.text)} aria-hidden="true">
          {getMatchLabel()}
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className={cn('text-4xl font-black', colors.text)} aria-hidden="true">
          {Math.round(totalScore)}
        </span>
        <span className={cn('text-xl font-bold', colors.text)} aria-hidden="true">%</span>
      </div>

      <div
        className="w-full bg-gray-200 dark:bg-gray-700 contrast-more:bg-gray-300 contrast-more:dark:bg-gray-600 rounded-full h-2 overflow-hidden border border-gray-300 dark:border-gray-600"
        role="progressbar"
        aria-valuenow={Math.round(totalScore)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Match quality percentage"
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            matchQuality === 'excellent' && 'bg-green-600 dark:bg-green-500 contrast-more:bg-green-700 contrast-more:dark:bg-green-400',
            matchQuality === 'good' && 'bg-blue-600 dark:bg-blue-500 contrast-more:bg-blue-700 contrast-more:dark:bg-blue-400',
            matchQuality === 'fair' && 'bg-amber-600 dark:bg-amber-500 contrast-more:bg-amber-700 contrast-more:dark:bg-amber-400',
            matchQuality === 'poor' && 'bg-gray-500 dark:bg-gray-400 contrast-more:bg-gray-700 contrast-more:dark:bg-gray-300'
          )}
          style={{ width: `${totalScore}%` }}
        />
      </div>

      <p className="text-xs text-center text-muted-foreground font-medium">
        Based on your preferences
      </p>
    </div>
  );
};
