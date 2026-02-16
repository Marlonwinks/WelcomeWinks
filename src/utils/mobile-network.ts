/**
 * Mobile network utilities for better handling of network conditions
 */

export interface NetworkInfo {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Get current network information
 */
export const getNetworkInfo = (): NetworkInfo => {
  const navigator = window.navigator as any;
  
  const info: NetworkInfo = {
    isOnline: navigator.onLine,
  };

  // Check for Network Information API support
  if ('connection' in navigator) {
    const connection = navigator.connection;
    info.effectiveType = connection.effectiveType;
    info.downlink = connection.downlink;
    info.rtt = connection.rtt;
    info.saveData = connection.saveData;
  }

  return info;
};

/**
 * Check if the user is on a slow network
 */
export const isSlowNetwork = (): boolean => {
  const networkInfo = getNetworkInfo();
  
  // If Network Information API is not available, assume normal network
  if (!networkInfo.effectiveType) {
    return false;
  }
  
  // Consider 2g and slow-2g as slow networks
  return networkInfo.effectiveType === '2g' || networkInfo.effectiveType === 'slow-2g';
};

/**
 * Get recommended timeout based on network conditions
 */
export const getRecommendedTimeout = (baseTimeout: number = 10000): number => {
  const networkInfo = getNetworkInfo();
  
  if (!networkInfo.isOnline) {
    return baseTimeout * 3; // Longer timeout when offline
  }
  
  if (isSlowNetwork()) {
    return baseTimeout * 2; // Double timeout for slow networks
  }
  
  // Check RTT (Round Trip Time) if available
  if (networkInfo.rtt && networkInfo.rtt > 1000) {
    return baseTimeout * 1.5; // 1.5x timeout for high latency
  }
  
  return baseTimeout;
};

/**
 * Check if device is mobile
 */
export const isMobileDevice = (): boolean => {
  return window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Get mobile-optimized settings
 */
export const getMobileOptimizedSettings = () => {
  const isMobile = isMobileDevice();
  const isSlowNet = isSlowNetwork();
  
  return {
    isMobile,
    isSlowNetwork: isSlowNet,
    recommendedTimeout: getRecommendedTimeout(isMobile ? 20000 : 10000),
    shouldReduceAnimations: isMobile && isSlowNet,
    shouldLazyLoad: isMobile,
    maxConcurrentRequests: isMobile ? 2 : 4,
  };
};

/**
 * Add network change listeners
 */
export const addNetworkListeners = (
  onOnline: () => void,
  onOffline: () => void,
  onNetworkChange?: (info: NetworkInfo) => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Listen for network changes if supported
  const navigator = window.navigator as any;
  if ('connection' in navigator && onNetworkChange) {
    navigator.connection.addEventListener('change', () => {
      onNetworkChange(getNetworkInfo());
    });
  }
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    
    if ('connection' in navigator && onNetworkChange) {
      navigator.connection.removeEventListener('change', onNetworkChange);
    }
  };
};

/**
 * Log network information for debugging
 */
export const logNetworkInfo = () => {
  const info = getNetworkInfo();
  const settings = getMobileOptimizedSettings();
  
  console.log('📱 Network Info:', {
    ...info,
    isMobile: settings.isMobile,
    isSlowNetwork: settings.isSlowNetwork,
    recommendedTimeout: settings.recommendedTimeout,
  });
};