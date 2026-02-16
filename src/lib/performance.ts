/**
 * Performance utilities for the Welcome Winks onboarding flow
 */

import React, { Suspense, lazy } from 'react';

// Lazy loading utilities
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = lazy(importFn);

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) =>
    React.createElement(Suspense,
      { fallback: fallback ? React.createElement(fallback) : React.createElement('div', null, 'Loading...') },
      React.createElement(LazyComponent, { ...props, ref })
    )
  );
}

// Cache utilities for location and preference data
class PerformanceCache {
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly STORAGE_PREFIX = 'places_cache_';
  private readonly INDEX_KEY = 'places_cache_index';

  constructor() {
    this.cleanExpired();
  }

  // Persist to localStorage
  set(key: string, data: any, ttl: number = 24 * 60 * 60 * 1000) { // Default 24 hours (increased from 5 mins) to save costs
    const timestamp = Date.now();
    const item = {
      data,
      timestamp,
      ttl
    };

    // Update memory cache
    this.memoryCache.set(key, item);

    // Update localStorage
    try {
      const storageKey = this.STORAGE_PREFIX + key;
      localStorage.setItem(storageKey, JSON.stringify(item));

      // Update index
      this.updateIndex(key);
    } catch (e) {
      console.warn('Failed to save to localStorage (quota exceeded?)', e);
      // If quota exceeded, try to clean old items
      this.pruneCache();
    }
  }

  get(key: string): any | null {
    // 1. Check memory cache
    const memItem = this.memoryCache.get(key);
    if (memItem) {
      if (Date.now() - memItem.timestamp > memItem.ttl) {
        this.memoryCache.delete(key);
        this.deleteFromStorage(key);
        return null;
      }
      return memItem.data;
    }

    // 2. Check localStorage
    try {
      const storageKey = this.STORAGE_PREFIX + key;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const item = JSON.parse(stored);

      // Check expiration
      if (Date.now() - item.timestamp > item.ttl) {
        this.deleteFromStorage(key);
        return null;
      }

      // Hyrdate memory cache
      this.memoryCache.set(key, item);
      return item.data;
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return null;
    }
  }

  clear() {
    this.memoryCache.clear();
    try {
      // Clear only our items
      const index = this.getIndex();
      index.forEach(key => localStorage.removeItem(this.STORAGE_PREFIX + key));
      localStorage.removeItem(this.INDEX_KEY);
    } catch (e) {
      console.error('Error clearing cache', e);
    }
  }

  delete(key: string) {
    this.memoryCache.delete(key);
    this.deleteFromStorage(key);
  }

  private deleteFromStorage(key: string) {
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
      const index = this.getIndex();
      const newIndex = index.filter(k => k !== key);
      localStorage.setItem(this.INDEX_KEY, JSON.stringify(newIndex));
    } catch (e) { }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  private getIndex(): string[] {
    try {
      const index = localStorage.getItem(this.INDEX_KEY);
      return index ? JSON.parse(index) : [];
    } catch {
      return [];
    }
  }

  private updateIndex(key: string) {
    try {
      const index = this.getIndex();
      if (!index.includes(key)) {
        index.push(key);
        localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
      }
    } catch { }
  }

  private cleanExpired() {
    // Run periodically or on startup to clean expired items from storage
    if (typeof window === 'undefined') return;

    try {
      const index = this.getIndex();
      const now = Date.now();
      let changed = false;

      const validKeys = index.filter(key => {
        const itemStr = localStorage.getItem(this.STORAGE_PREFIX + key);
        if (!itemStr) return false;

        try {
          const item = JSON.parse(itemStr);
          if (now - item.timestamp > item.ttl) {
            localStorage.removeItem(this.STORAGE_PREFIX + key);
            return false;
          }
          return true;
        } catch {
          return false;
        }
      });

      if (validKeys.length !== index.length) {
        localStorage.setItem(this.INDEX_KEY, JSON.stringify(validKeys));
      }
    } catch (e) {
      console.error('Error cleaning expired cache', e);
    }
  }

  private pruneCache() {
    // Remove oldest items if quota is exceeded
    try {
      const index = this.getIndex();
      if (index.length === 0) return;

      // Read all metadatas
      const items = index.map(key => {
        const itemStr = localStorage.getItem(this.STORAGE_PREFIX + key);
        if (!itemStr) return { key, timestamp: 0 };
        const item = JSON.parse(itemStr);
        return { key, timestamp: item.timestamp };
      });

      // Sort by oldest
      items.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 20%
      const toRemove = items.slice(0, Math.ceil(items.length * 0.2));
      toRemove.forEach(item => this.deleteFromStorage(item.key));
    } catch (e) { }
  }
}

export const performanceCache = new PerformanceCache();

// Debounce utility for search inputs
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) => {
  const [observer, setObserver] = React.useState<IntersectionObserver | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      const obs = new IntersectionObserver(callback, options);
      setObserver(obs);

      return () => obs.disconnect();
    }
  }, [callback, options]);

  return observer;
};

// Preload critical resources
export const preloadResource = (href: string, as: string = 'script') => {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
};

// Memory usage monitoring (development only)
export const logMemoryUsage = (label: string) => {
  if (process.env.NODE_ENV === 'development' && 'performance' in window && 'memory' in (performance as any)) {
    const memory = (performance as any).memory;
    console.log(`[Memory] ${label}:`, {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`
    });
  }
};

// Touch-friendly interaction utilities
export const isTouchDevice = () => {
  return typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

export const getOptimalTouchTarget = () => {
  // Apple recommends 44px minimum, Android recommends 48dp
  return isTouchDevice() ? 44 : 32;
};

// Reduced motion utilities
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Performance timing utilities
export const measurePerformance = (name: string, fn: () => void | Promise<void>) => {
  if (typeof performance === 'undefined') {
    return fn();
  }

  const start = performance.now();
  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      const end = performance.now();
      console.log(`[Performance] ${name}: ${end - start}ms`);
    });
  } else {
    const end = performance.now();
    console.log(`[Performance] ${name}: ${end - start}ms`);
    return result;
  }
};

// Bundle size optimization - dynamic imports
export const loadOnDemand = async <T>(
  importFn: () => Promise<T>,
  fallback?: T
): Promise<T> => {
  try {
    return await importFn();
  } catch (error) {
    console.warn('Failed to load module on demand:', error);
    if (fallback) return fallback;
    throw error;
  }
};

// Image optimization utilities
export const getOptimizedImageSrc = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 80
) => {
  // This would integrate with your image optimization service
  // For now, return the original src
  return src;
};

// Skeleton component for loading states
export const Skeleton: React.FC<{
  className?: string;
  width?: string | number;
  height?: string | number;
}> = ({ className = '', width, height }) =>
    React.createElement('div', {
      className: `animate-pulse bg-muted rounded ${className}`,
      style: {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      },
      'aria-hidden': "true"
    });

// Loading spinner component
export const LoadingSpinner: React.FC<{
  size?: 'small' | 'medium' | 'large';
  className?: string;
}> = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  return React.createElement('div', {
    className: `animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]} ${className}`,
    role: "status",
    'aria-label': "Loading"
  }, React.createElement('span', { className: "sr-only" }, 'Loading...'));
};

// Error boundary for performance monitoring
export class PerformanceErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Performance Error Boundary caught an error:', error, errorInfo);

    // Log to performance monitoring service
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark('error-boundary-triggered');
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent && this.state.error) {
        return React.createElement(FallbackComponent, { error: this.state.error });
      }

      return React.createElement('div', { className: "p-4 text-center" },
        React.createElement('h2', { className: "text-lg font-semibold text-destructive mb-2" }, 'Something went wrong'),
        React.createElement('p', { className: "text-muted-foreground" }, 'Please refresh the page and try again.')
      );
    }

    return this.props.children;
  }
}

