// Admin security utilities

/**
 * Generates a simple hash for session validation
 */
export const generateSessionHash = (username: string, timestamp: number): string => {
  return btoa(`${username}:${timestamp}:ww_admin_secure`);
};

/**
 * Validates a session hash
 */
export const validateSessionHash = (hash: string, username: string, timestamp: number): boolean => {
  const expectedHash = generateSessionHash(username, timestamp);
  return hash === expectedHash;
};

/**
 * Checks if the current environment allows admin access
 */
export const isAdminAccessAllowed = (): boolean => {
  // In production, you might want to add additional checks
  // like IP whitelisting, time-based access, etc.
  return true;
};

/**
 * Logs admin access attempts (in production, send to monitoring service)
 */
export const logAdminAccess = (event: 'login_attempt' | 'login_success' | 'login_failure' | 'logout', details?: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // In development, just log to console
  console.log('Admin Access Log:', logEntry);
  
  // In production, you would send this to your monitoring/logging service
  // Example: sendToLoggingService(logEntry);
};

/**
 * Clears all admin-related data from storage
 */
export const clearAdminData = () => {
  const adminKeys = Object.keys(localStorage).filter(key => key.includes('admin') || key.includes('ww_admin'));
  adminKeys.forEach(key => localStorage.removeItem(key));
};