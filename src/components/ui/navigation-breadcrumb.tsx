import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from './button';
import { useEnhancedNavigation } from '../../hooks/useEnhancedNavigation';
import { cn } from '../../lib/utils';

interface NavigationBreadcrumbProps {
  className?: string;
  showHomeIcon?: boolean;
  maxItems?: number;
  separator?: React.ReactNode;
}

export const NavigationBreadcrumb: React.FC<NavigationBreadcrumbProps> = ({
  className,
  showHomeIcon = true,
  maxItems = 5,
  separator,
}) => {
  const { getNavigationBreadcrumbs, navigateWithTransition } = useEnhancedNavigation();

  const breadcrumbs = getNavigationBreadcrumbs();
  
  // Limit breadcrumbs if needed
  const displayBreadcrumbs = breadcrumbs.length > maxItems 
    ? [
        breadcrumbs[0], // Always show home
        { path: '...', label: '...', isActive: false, isClickable: false },
        ...breadcrumbs.slice(-maxItems + 2)
      ]
    : breadcrumbs;

  const handleBreadcrumbClick = (path: string, isClickable: boolean) => {
    if (isClickable && path !== '...') {
      navigateWithTransition(path, { transition: 'slide' });
    }
  };

  const SeparatorComponent = separator || <ChevronRight className="w-4 h-4 text-muted-foreground" />;

  return (
    <nav 
      className={cn('flex items-center space-x-1 text-sm', className)} 
      aria-label="Navigation breadcrumb"
    >
      {displayBreadcrumbs.map((item, index) => (
        <React.Fragment key={`${item.path}-${index}`}>
          {/* Breadcrumb item */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBreadcrumbClick(item.path, item.isClickable)}
            disabled={!item.isClickable || item.path === '...'}
            className={cn(
              'h-auto px-2 py-1 font-medium transition-colors',
              item.isActive && 'text-foreground bg-muted pointer-events-none',
              !item.isActive && item.isClickable && 'text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer',
              !item.isClickable && 'text-muted-foreground cursor-default',
              item.path === '...' && 'cursor-default'
            )}
            aria-current={item.isActive ? 'page' : undefined}
          >
            {/* Show home icon for home breadcrumb */}
            {item.path === '/' && showHomeIcon ? (
              <>
                <Home className="w-4 h-4" />
                <span className="sr-only">{item.label}</span>
              </>
            ) : (
              item.label
            )}
          </Button>
          
          {/* Separator */}
          {index < displayBreadcrumbs.length - 1 && (
            <span className="flex items-center">
              {SeparatorComponent}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Specialized breadcrumb for onboarding flows
export const OnboardingBreadcrumb: React.FC<Omit<NavigationBreadcrumbProps, 'maxItems'>> = (props) => (
  <NavigationBreadcrumb
    {...props}
    maxItems={3}
  />
);

// Minimal breadcrumb for mobile
export const MobileBreadcrumb: React.FC<NavigationBreadcrumbProps> = (props) => (
  <NavigationBreadcrumb
    {...props}
    maxItems={2}
    showHomeIcon={false}
    className={cn('text-xs', props.className)}
  />
);