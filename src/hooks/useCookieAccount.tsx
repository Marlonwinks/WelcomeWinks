import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { CookieAccount } from '../types/firebase';
import { authService, cookieAccountService, activityTrackingService } from '../services';

interface UseCookieAccountReturn {
  cookieAccount: CookieAccount | null;
  loading: boolean;
  error: string | null;
  
  // Cookie account management
  createCookieAccount: (ipAddress?: string) => Promise<CookieAccount>;
  restoreCookieAccount: () => Promise<CookieAccount | null>;
  updateActivity: () => Promise<void>;
  checkExpiration: () => Promise<boolean>;
  clearCookie: () => void;
  
  // Account status
  isExpired: boolean;
  hasValidCookie: boolean;
  cookieId: string | null;
  daysUntilExpiry: number | null;
  shouldShowExpirationWarning: boolean;
  
  // Activity tracking
  initializeActivityTracking: () => void;
  trackActivity: (activityType?: string) => Promise<void>;
}

export function useCookieAccount(): UseCookieAccountReturn {
  const { cookieAccount: contextCookieAccount, createCookieAccount: contextCreateCookie } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCookieAccount, setLocalCookieAccount] = useState<CookieAccount | null>(null);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);
  const [shouldShowExpirationWarning, setShouldShowExpirationWarning] = useState(false);

  // Use context cookie account if available, otherwise use local state
  const cookieAccount = contextCookieAccount || localCookieAccount;

  // Get cookie ID from storage (will be updated in useEffect)
  const [cookieId, setCookieId] = useState<string | null>(null);

  // Check if cookie is expired
  const isExpired = cookieAccount ? cookieAccount.expiresAt < new Date() || cookieAccount.isExpired : false;

  // Check if we have a valid cookie
  const hasValidCookie = Boolean(cookieAccount && !isExpired);

  // Create new cookie account
  const createCookieAccount = useCallback(async (ipAddress?: string): Promise<CookieAccount> => {
    try {
      setLoading(true);
      setError(null);
      
      const newCookieAccount = await contextCreateCookie(ipAddress);
      setLocalCookieAccount(newCookieAccount);
      
      return newCookieAccount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create cookie account';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contextCreateCookie]);

  // Restore cookie account from storage
  const restoreCookieAccount = useCallback(async (): Promise<CookieAccount | null> => {
    const storedCookieId = await cookieAccountService.getCookieFromStorage();
    if (!storedCookieId) {
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const restoredAccount = await authService.getCookieAccount(storedCookieId);
      if (restoredAccount) {
        setLocalCookieAccount(restoredAccount);
        // Update activity to extend expiration
        await authService.updateCookieActivity(storedCookieId);
        
        // Update expiration info
        await updateExpirationInfo(storedCookieId);
      }
      
      return restoredAccount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore cookie account';
      setError(errorMessage);
      console.warn('Failed to restore cookie account:', err);
      
      // Clear invalid cookie from storage
      await cookieAccountService.clearCookieFromStorage();
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update expiration information
  const updateExpirationInfo = useCallback(async (cookieId: string): Promise<void> => {
    try {
      const days = await cookieAccountService.getDaysUntilExpiration();
      const shouldWarn = await cookieAccountService.shouldShowExpirationWarning();
      
      setDaysUntilExpiry(days);
      setShouldShowExpirationWarning(shouldWarn);
    } catch (err) {
      console.warn('Failed to update expiration info:', err);
    }
  }, []);

  // Update cookie activity
  const updateActivity = useCallback(async (): Promise<void> => {
    if (!cookieAccount?.cookieId) {
      return;
    }

    try {
      await authService.updateCookieActivity(cookieAccount.cookieId);
      
      // Update local state with new expiration
      const updatedAccount = await authService.getCookieAccount(cookieAccount.cookieId);
      if (updatedAccount) {
        setLocalCookieAccount(updatedAccount);
        await updateExpirationInfo(cookieAccount.cookieId);
      }
    } catch (err) {
      console.warn('Failed to update cookie activity:', err);
    }
  }, [cookieAccount?.cookieId, updateExpirationInfo]);

  // Check if cookie is expired
  const checkExpiration = useCallback(async (): Promise<boolean> => {
    if (!cookieAccount?.cookieId) {
      return true;
    }

    try {
      const expired = await cookieAccountService.checkCookieExpiration(cookieAccount.cookieId);
      
      if (expired) {
        // Handle expired account cleanup
        await clearCookie();
      }
      
      return expired;
    } catch (err) {
      console.warn('Failed to check cookie expiration:', err);
      return true;
    }
  }, [cookieAccount?.cookieId]);

  // Clear cookie from storage and state
  const clearCookie = useCallback(async (): Promise<void> => {
    await cookieAccountService.clearCookieFromStorage();
    setLocalCookieAccount(null);
    setError(null);
    setDaysUntilExpiry(null);
    setShouldShowExpirationWarning(false);
  }, []);

  // Initialize activity tracking
  const initializeActivityTracking = useCallback((): void => {
    if (cookieAccount?.cookieId) {
      activityTrackingService.initializeActivityTracking(cookieAccount.cookieId);
    }
  }, [cookieAccount?.cookieId]);

  // Track specific activity
  const trackActivity = useCallback(async (activityType: string = 'user_action'): Promise<void> => {
    if (cookieAccount?.cookieId) {
      await activityTrackingService.trackActivity(cookieAccount.cookieId, activityType);
    }
  }, [cookieAccount?.cookieId]);

  // Handle startup expiration check and get cookie ID
  useEffect(() => {
    const handleStartup = async () => {
      const wasExpired = await cookieAccountService.handleStartupExpiration();
      if (wasExpired) {
        // Account was expired and cleaned up, treat as new user
        setLocalCookieAccount(null);
        setDaysUntilExpiry(null);
        setShouldShowExpirationWarning(false);
        setCookieId(null);
      } else {
        // Get current cookie ID
        const storedCookieId = await cookieAccountService.getCookieFromStorage();
        setCookieId(storedCookieId);
      }
    };
    
    handleStartup().catch(console.warn);
  }, []);

  // Auto-restore cookie account on mount
  useEffect(() => {
    const restoreAccount = async () => {
      if (!contextCookieAccount && !localCookieAccount) {
        const storedCookieId = await cookieAccountService.getCookieFromStorage();
        if (storedCookieId) {
          await restoreCookieAccount();
        }
      }
    };
    
    restoreAccount().catch(console.warn);
  }, [contextCookieAccount, localCookieAccount, restoreCookieAccount]);

  // Auto-update activity periodically for active sessions
  useEffect(() => {
    if (!hasValidCookie) {
      return;
    }

    // Update activity every 30 minutes
    const interval = setInterval(() => {
      updateActivity().catch(console.warn);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [hasValidCookie, updateActivity]);

  // Check expiration periodically
  useEffect(() => {
    if (!cookieAccount) {
      return;
    }

    // Check expiration every 5 minutes
    const interval = setInterval(async () => {
      const expired = await checkExpiration();
      if (expired) {
        await clearCookie();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [cookieAccount, checkExpiration, clearCookie]);

  // Update expiration info when cookie account changes
  useEffect(() => {
    if (cookieAccount?.cookieId) {
      updateExpirationInfo(cookieAccount.cookieId).catch(console.warn);
    }
  }, [cookieAccount?.cookieId, updateExpirationInfo]);

  return {
    cookieAccount,
    loading,
    error,
    createCookieAccount,
    restoreCookieAccount,
    updateActivity,
    checkExpiration,
    clearCookie,
    isExpired,
    hasValidCookie,
    cookieId,
    daysUntilExpiry,
    shouldShowExpirationWarning,
    initializeActivityTracking,
    trackActivity
  };
}