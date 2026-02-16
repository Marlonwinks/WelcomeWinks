import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  transitionType?: 'fade' | 'slide' | 'scale' | 'none';
  duration?: number;
  disabled?: boolean;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
  transitionType = 'fade',
  duration = 300,
  disabled = false,
}) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    if (disabled || transitionType === 'none') {
      setDisplayLocation(location);
      return;
    }

    if (location !== displayLocation) {
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setIsTransitioning(false);
      }, duration / 2);

      return () => clearTimeout(timer);
    }
  }, [location, displayLocation, duration, disabled, transitionType]);

  const getTransitionClasses = () => {
    if (disabled || transitionType === 'none') {
      return '';
    }

    const baseClasses = `transition-all duration-${duration}`;
    
    switch (transitionType) {
      case 'fade':
        return cn(
          baseClasses,
          isTransitioning ? 'opacity-0' : 'opacity-100'
        );
      
      case 'slide':
        return cn(
          baseClasses,
          isTransitioning 
            ? 'transform translate-x-full opacity-0' 
            : 'transform translate-x-0 opacity-100'
        );
      
      case 'scale':
        return cn(
          baseClasses,
          isTransitioning 
            ? 'transform scale-95 opacity-0' 
            : 'transform scale-100 opacity-100'
        );
      
      default:
        return baseClasses;
    }
  };

  return (
    <div 
      className={cn(
        'w-full h-full',
        getTransitionClasses(),
        className
      )}
      key={displayLocation.pathname}
    >
      {children}
    </div>
  );
};

// Specialized transition components
export const OnboardingTransition: React.FC<Omit<PageTransitionProps, 'transitionType'>> = (props) => (
  <PageTransition
    {...props}
    transitionType="slide"
  />
);

export const AppTransition: React.FC<Omit<PageTransitionProps, 'transitionType'>> = (props) => (
  <PageTransition
    {...props}
    transitionType="fade"
  />
);

export const ModalTransition: React.FC<Omit<PageTransitionProps, 'transitionType' | 'duration'>> = (props) => (
  <PageTransition
    {...props}
    transitionType="scale"
    duration={200}
  />
);