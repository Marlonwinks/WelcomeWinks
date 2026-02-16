import React from 'react';
import { ArrowLeft, Home, ChevronLeft } from 'lucide-react';
import { Button } from './button';
import { useEnhancedNavigation } from '../../hooks/useEnhancedNavigation';
import { cn } from '../../lib/utils';

interface EnhancedBackButtonProps {
  variant?: 'default' | 'ghost' | 'outline' | 'minimal';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
  showHomeOption?: boolean;
  className?: string;
  onBack?: () => void;
  disabled?: boolean;
  icon?: 'arrow' | 'chevron' | 'home';
}

export const EnhancedBackButton: React.FC<EnhancedBackButtonProps> = ({
  variant = 'ghost',
  size = 'default',
  showLabel = true,
  showHomeOption = false,
  className,
  onBack,
  disabled = false,
  icon = 'arrow',
}) => {
  const {
    goBack,
    goHome,
    canGoBack,
    isInOnboarding,
    previousPath,
  } = useEnhancedNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };

  const handleHome = () => {
    goHome();
  };

  // Choose appropriate icon
  const IconComponent = icon === 'chevron' ? ChevronLeft : icon === 'home' ? Home : ArrowLeft;

  // Determine button text
  const getButtonText = () => {
    if (!showLabel) return '';
    
    if (isInOnboarding) {
      return 'Back';
    }
    
    if (previousPath) {
      // Try to get a friendly name for the previous path
      const pathSegments = previousPath.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1];
      
      switch (previousPath) {
        case '/':
          return 'Home';
        case '/explore':
          return 'Explore';
        case '/mark':
          return 'Rate Business';
        case '/profile':
          return 'Profile';
        default:
          return 'Back';
      }
    }
    
    return 'Back';
  };

  const buttonText = getButtonText();
  const isDisabled = disabled || !canGoBack;

  if (showHomeOption && !canGoBack) {
    // Show home button when can't go back
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleHome}
        className={cn('transition-all duration-200', className)}
        disabled={disabled}
      >
        <Home className="w-4 h-4" />
        {showLabel && <span className="ml-2">Home</span>}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBack}
      disabled={isDisabled}
      className={cn(
        'transition-all duration-200',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <IconComponent className="w-4 h-4" />
      {showLabel && buttonText && (
        <span className="ml-2">{buttonText}</span>
      )}
    </Button>
  );
};

// Specialized variants for common use cases
export const OnboardingBackButton: React.FC<Omit<EnhancedBackButtonProps, 'variant' | 'showHomeOption'>> = (props) => (
  <EnhancedBackButton
    {...props}
    variant="ghost"
    showHomeOption={true}
  />
);

export const AppBackButton: React.FC<Omit<EnhancedBackButtonProps, 'variant'>> = (props) => (
  <EnhancedBackButton
    {...props}
    variant="outline"
  />
);

export const MinimalBackButton: React.FC<Omit<EnhancedBackButtonProps, 'variant' | 'showLabel'>> = (props) => (
  <EnhancedBackButton
    {...props}
    variant="ghost"
    showLabel={false}
    size="sm"
  />
);