import { cookieAccountService } from './cookieAccount.service';
import { CookieAccount } from '../types/firebase';

/**
 * Simple Authentication Service
 * Handles cookie-based authentication without Firebase Auth for basic operations
 */
export class SimpleAuthService {
  private static instance: SimpleAuthService;
  private currentCookieAccount: CookieAccount | null = null;
  
  public static getInstance(): SimpleAuthService {
    if (!SimpleAuthService.instance) {
      SimpleAuthService.instance = new SimpleAuthService();
    }
    return SimpleAuthService.instance;
  }

  /**
   * Initialize authentication - get or create cookie account
   */
  async initialize(): Promise<CookieAccount> {
    try {
      // Try to get existing cookie account
      this.currentCookieAccount = await cookieAccountService.getCurrentCookieAccount();
      
      if (!this.currentCookieAccount) {
        // Create new cookie account
        this.currentCookieAccount = await cookieAccountService.getOrCreateCookieAccount();
      }
      
      return this.currentCookieAccount;
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      throw error;
    }
  }

  /**
   * Get current user ID (cookie ID)
   */
  getCurrentUserId(): string | null {
    return this.currentCookieAccount?.cookieId || null;
  }

  /**
   * Get current account type
   */
  getCurrentAccountType(): 'cookie' | 'full' | null {
    return this.currentCookieAccount?.accountType || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentCookieAccount && !this.currentCookieAccount.isExpired;
  }

  /**
   * Get current cookie account
   */
  getCurrentAccount(): CookieAccount | null {
    return this.currentCookieAccount;
  }

  /**
   * Refresh current account
   */
  async refreshAccount(): Promise<CookieAccount | null> {
    if (this.currentCookieAccount) {
      try {
        // Extend expiration
        await cookieAccountService.extendCookieExpiration(this.currentCookieAccount.cookieId);
        
        // Get updated account
        this.currentCookieAccount = await cookieAccountService.getCurrentCookieAccount();
      } catch (error) {
        console.warn('Failed to refresh account:', error);
        this.currentCookieAccount = null;
      }
    }
    
    return this.currentCookieAccount;
  }

  /**
   * Clear current authentication
   */
  async clearAuth(): Promise<void> {
    if (this.currentCookieAccount) {
      await cookieAccountService.expireCurrentCookie();
    }
    this.currentCookieAccount = null;
  }
}

// Export singleton instance
export const simpleAuthService = SimpleAuthService.getInstance();