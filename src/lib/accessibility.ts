/**
 * Accessibility utilities for the Welcome Winks onboarding flow
 */

import React from 'react';

// Screen reader announcements
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Focus management
export const focusElement = (selector: string, delay = 0) => {
  setTimeout(() => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  }, delay);
};

// Keyboard navigation helpers
export const handleKeyboardNavigation = (
  event: React.KeyboardEvent,
  options: {
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
  }
) => {
  const { key } = event;
  
  switch (key) {
    case 'Enter':
      if (options.onEnter) {
        event.preventDefault();
        options.onEnter();
      }
      break;
    case ' ':
      if (options.onSpace) {
        event.preventDefault();
        options.onSpace();
      }
      break;
    case 'Escape':
      if (options.onEscape) {
        event.preventDefault();
        options.onEscape();
      }
      break;
    case 'ArrowUp':
      if (options.onArrowUp) {
        event.preventDefault();
        options.onArrowUp();
      }
      break;
    case 'ArrowDown':
      if (options.onArrowDown) {
        event.preventDefault();
        options.onArrowDown();
      }
      break;
    case 'ArrowLeft':
      if (options.onArrowLeft) {
        event.preventDefault();
        options.onArrowLeft();
      }
      break;
    case 'ArrowRight':
      if (options.onArrowRight) {
        event.preventDefault();
        options.onArrowRight();
      }
      break;
  }
};

// High contrast mode detection
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return isHighContrast;
};

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
};

// Generate unique IDs for form elements
export const generateId = (prefix: string = 'element') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

// ARIA label generators
export const generateAriaLabel = {
  step: (current: number, total: number, title: string) => 
    `Step ${current} of ${total}: ${title}`,
  
  progress: (value: number, label?: string) => 
    `${label ? `${label}: ` : ''}${value}% complete`,
  
  button: (action: string, context?: string) => 
    context ? `${action} ${context}` : action,
  
  status: (status: string, context?: string) => 
    context ? `${context} status: ${status}` : status,
};

// Skip link component
export const SkipLink: React.FC<{ href: string; children: React.ReactNode }> = ({ 
  href, 
  children 
}) => 
  React.createElement('a', {
    href,
    className: "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
  }, children);

// Focus trap for modals
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);
  
  return containerRef;
};