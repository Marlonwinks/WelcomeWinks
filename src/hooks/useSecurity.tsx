import { useState, useEffect, useCallback } from 'react';
import { securityService, SecurityStatistics, RatingPermissionResult, AccountCreationPermissionResult } from '../services/security.service';
import { errorHandlingService } from '../services/errorHandling.service';
import { useAuth } from './useAuth';

/**
 * Hook for security-related operations and monitoring
 */
export function useSecurity() {
  const { user } = useAuth();
  const [securityStats, setSecurityStats] = useState<SecurityStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if user can rate a business
   */
  const checkRatingPermission = useCallback(async (businessId: string): Promise<RatingPermissionResult> => {
    if (!user) {
      return {
        canRate: false,
        reason: 'suspicious_activity',
        message: 'Please log in or create an account to rate businesses'
      };
    }

    try {
      setError(null);
      return await securityService.canUserRateBusiness(user.uid, businessId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check rating permission';
      setError(errorMessage);
      
      // Return safe default
      return {
        canRate: false,
        reason: 'suspicious_activity',
        message: 'Unable to verify rating permission. Please try again.'
      };
    }
  }, [user]);

  /**
   * Check if account can be created from current IP
   */
  const checkAccountCreationPermission = useCallback(async (accountType: 'full' | 'cookie'): Promise<AccountCreationPermissionResult> => {
    try {
      setError(null);
      // Get current IP address (this would typically be done server-side)
      const response = await fetch('https://api.ipify.org?format=json');
      const { ip } = await response.json();
      
      return await securityService.canCreateAccount(ip, accountType);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check account creation permission';
      setError(errorMessage);
      
      // Return safe default
      return {
        canCreate: false,
        reason: 'suspicious_ip',
        message: 'Unable to verify account creation permission. Please try again.'
      };
    }
  }, []);

  /**
   * Get security statistics (admin only)
   */
  const getSecurityStatistics = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const stats = await securityService.getSecurityStatistics();
      setSecurityStats(stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load security statistics';
      setError(errorMessage);
      console.error('Failed to load security statistics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Flag user for suspicious activity (admin only)
   */
  const flagSuspiciousUser = useCallback(async (userId: string, reason: string, evidence: any): Promise<boolean> => {
    try {
      setError(null);
      await securityService.flagSuspiciousUser(userId, reason, evidence);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to flag user';
      setError(errorMessage);
      console.error('Failed to flag suspicious user:', error);
      return false;
    }
  }, []);

  /**
   * Get user's audit trail
   */
  const getUserAuditTrail = useCallback(async (userId?: string, limit: number = 50) => {
    const targetUserId = userId || user?.uid;
    if (!targetUserId) return [];

    try {
      setError(null);
      return await securityService.getUserAuditTrail(targetUserId, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load audit trail';
      setError(errorMessage);
      console.error('Failed to load user audit trail:', error);
      return [];
    }
  }, [user]);

  /**
   * Get business audit trail
   */
  const getBusinessAuditTrail = useCallback(async (businessId: string, limit: number = 100) => {
    try {
      setError(null);
      return await securityService.getBusinessAuditTrail(businessId, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load business audit trail';
      setError(errorMessage);
      console.error('Failed to load business audit trail:', error);
      return [];
    }
  }, []);

  /**
   * Check if current session is healthy
   */
  const isSessionHealthy = useCallback((): boolean => {
    if (!securityStats) return true; // Assume healthy if no stats available
    
    return securityStats.isHealthy;
  }, [securityStats]);

  /**
   * Get error handling statistics
   */
  const getErrorStatistics = useCallback(() => {
    return errorHandlingService.getErrorStatistics();
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-refresh security stats for admin users
  useEffect(() => {
    if (user && (user as any).isAdmin) {
      getSecurityStatistics();
      
      // Refresh every 5 minutes
      const interval = setInterval(getSecurityStatistics, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, getSecurityStatistics]);

  return {
    // State
    securityStats,
    isLoading,
    error,
    
    // Actions
    checkRatingPermission,
    checkAccountCreationPermission,
    getSecurityStatistics,
    flagSuspiciousUser,
    getUserAuditTrail,
    getBusinessAuditTrail,
    getErrorStatistics,
    clearError,
    
    // Computed
    isSessionHealthy: isSessionHealthy(),
    
    // Utils
    isAdmin: user && (user as any).isAdmin
  };
}

/**
 * Hook for rate limiting UI feedback
 */
export function useRateLimit() {
  const [rateLimitStatus, setRateLimitStatus] = useState<{
    isRateLimited: boolean;
    retryAfter?: number;
    message?: string;
  }>({ isRateLimited: false });

  /**
   * Handle rate limit error and show appropriate UI feedback
   */
  const handleRateLimitError = useCallback((error: any) => {
    if (error.code === 'app/rate_limited') {
      setRateLimitStatus({
        isRateLimited: true,
        retryAfter: error.context?.retryAfter,
        message: error.message
      });

      // Auto-clear after retry period
      if (error.context?.retryAfter) {
        setTimeout(() => {
          setRateLimitStatus({ isRateLimited: false });
        }, error.context.retryAfter);
      }
    }
  }, []);

  /**
   * Clear rate limit status
   */
  const clearRateLimit = useCallback(() => {
    setRateLimitStatus({ isRateLimited: false });
  }, []);

  /**
   * Format retry time for display
   */
  const formatRetryTime = useCallback((retryAfter?: number): string => {
    if (!retryAfter) return '';
    
    const seconds = Math.ceil(retryAfter / 1000);
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }, []);

  return {
    rateLimitStatus,
    handleRateLimitError,
    clearRateLimit,
    formatRetryTime
  };
}

/**
 * Hook for security monitoring and alerts
 */
export function useSecurityMonitoring() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const { securityStats } = useSecurity();

  useEffect(() => {
    if (!securityStats) return;

    const newAlerts: SecurityAlert[] = [];

    // Check for high error rates
    if (securityStats.activeSuspiciousFlags > 10) {
      newAlerts.push({
        id: 'high-suspicious-activity',
        type: 'warning',
        title: 'High Suspicious Activity',
        message: `${securityStats.activeSuspiciousFlags} active suspicious activity flags detected`,
        timestamp: new Date()
      });
    }

    // Check for unusual activity patterns
    if (securityStats.suspiciousActivityRate > 0.1) {
      newAlerts.push({
        id: 'unusual-activity-pattern',
        type: 'warning',
        title: 'Unusual Activity Pattern',
        message: `Suspicious activity rate: ${(securityStats.suspiciousActivityRate * 100).toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Check for system health
    if (!securityStats.isHealthy) {
      newAlerts.push({
        id: 'system-unhealthy',
        type: 'error',
        title: 'System Health Alert',
        message: 'System health indicators show potential issues',
        timestamp: new Date()
      });
    }

    setAlerts(newAlerts);
  }, [securityStats]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    dismissAlert,
    clearAllAlerts,
    hasAlerts: alerts.length > 0,
    criticalAlerts: alerts.filter(alert => alert.type === 'error').length,
    warningAlerts: alerts.filter(alert => alert.type === 'warning').length
  };
}

/**
 * Security alert interface
 */
export interface SecurityAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  action?: {
    label: string;
    onClick: () => void;
  };
}