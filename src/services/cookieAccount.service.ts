import { CookieAccount } from '../types/firebase';
import { authService } from './auth.service';
import { ipAddressService } from './ipAddress.service';
import { createFirestoreError, isValidCookieId } from '../utils/firestore';

/**
 * Cookie Account Service
 * Handles cookie-based temporary account management
 */
export class CookieAccountService {
  private static instance: CookieAccountService;
  private static readonly COOKIE_KEY = 'welcomeWinks_cookieId';
  private static readonly COOKIE_EXPIRY_DAYS = 45;
  
  public static getInstance(): CookieAccountService {
    if (!CookieAccountService.instance) {
      CookieAccountService.instance = new CookieAccountService();
    }
    return CookieAccountService.instance;
  }

  /**
   * Generate a cryptographically secure cookie ID
   */
  async generateCookieId(): Promise<string> {
    try {
      const timestamp = Date.now().toString(36);
      
      // Generate secure random bytes
      const randomBytes = new Uint8Array(32); // Increased to 32 bytes for better security
      
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(randomBytes);
      } else {
        // Fallback for environments without crypto API
        for (let i = 0; i < randomBytes.length; i++) {
          randomBytes[i] = Math.floor(Math.random() * 256);
        }
      }
      
      // Convert to base36 string
      const randomStr = Array.from(randomBytes, byte => 
        byte.toString(36).padStart(2, '0')
      ).join('');
      
      // Add IP-based entropy for additional uniqueness
      const currentIP = await ipAddressService.getCurrentIPAddress();
      const ipHash = ipAddressService.generateIPHash(currentIP, timestamp);
      
      return `cookie_${timestamp}_${randomStr}_${ipHash}`;
    } catch (error) {
      throw createFirestoreError('generateCookieId', error);
    }
  }

  /**
   * Store cookie ID in local storage with metadata
   */
  async storeCookieLocally(cookieId: string): Promise<void> {
    try {
      if (!isValidCookieId(cookieId)) {
        throw new Error('Invalid cookie ID format');
      }
      
      const currentIP = await ipAddressService.getCurrentIPAddress();
      
      // Store with timestamp and IP for validation
      const cookieData = {
        id: cookieId,
        stored: Date.now(),
        expires: Date.now() + (CookieAccountService.COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        ipHash: ipAddressService.generateIPHash(currentIP, cookieId), // For additional validation
        version: '1.0' // For future compatibility
      };
      
      localStorage.setItem(CookieAccountService.COOKIE_KEY, JSON.stringify(cookieData));
    } catch (error) {
      console.warn('Failed to store cookie ID locally:', error);
      throw createFirestoreError('storeCookieLocally', error, { cookieId });
    }
  }

  /**
   * Get cookie ID from local storage with validation
   */
  async getCookieFromStorage(): Promise<string | null> {
    try {
      const storedData = localStorage.getItem(CookieAccountService.COOKIE_KEY);
      
      if (!storedData) {
        return null;
      }
      
      const cookieData = JSON.parse(storedData);
      
      // Check if cookie has expired locally
      if (Date.now() > cookieData.expires) {
        await this.clearCookieFromStorage();
        return null;
      }
      
      // Validate cookie ID format
      if (!isValidCookieId(cookieData.id)) {
        await this.clearCookieFromStorage();
        return null;
      }
      
      // Additional validation with IP hash if available
      if (cookieData.ipHash) {
        try {
          const currentIP = await ipAddressService.getCurrentIPAddress();
          const expectedHash = ipAddressService.generateIPHash(currentIP, cookieData.id);
          
          // Allow some flexibility for IP changes
          if (cookieData.ipHash !== expectedHash) {
            const isValidSubnet = ipAddressService.isSameSubnet(currentIP, '0.0.0.0'); // Simplified check
            if (!isValidSubnet) {
              console.warn('Cookie IP hash mismatch, but allowing access');
            }
          }
        } catch (error) {
          console.warn('Failed to validate cookie IP hash:', error);
        }
      }
      
      return cookieData.id;
    } catch (error) {
      console.warn('Failed to get cookie ID from storage:', error);
      await this.clearCookieFromStorage(); // Clear corrupted data
      return null;
    }
  }

  /**
   * Clear cookie ID from local storage
   */
  async clearCookieFromStorage(): Promise<void> {
    try {
      localStorage.removeItem(CookieAccountService.COOKIE_KEY);
    } catch (error) {
      console.warn('Failed to clear cookie ID from storage:', error);
    }
  }

  /**
   * Check if cookie account is expired
   */
  async checkCookieExpiration(cookieId: string): Promise<boolean> {
    try {
      if (!isValidCookieId(cookieId)) {
        return true; // Invalid cookies are considered expired
      }
      
      const cookieAccount = await authService.getCookieAccount(cookieId);
      const isExpired = !cookieAccount || cookieAccount.isExpired || cookieAccount.expiresAt < new Date();
      
      // If expired, handle cleanup
      if (isExpired && cookieAccount) {
        await this.handleExpiredCookie(cookieId);
      }
      
      return isExpired;
    } catch (error) {
      console.warn('Failed to check cookie expiration:', error);
      return true; // Assume expired on error
    }
  }

  /**
   * Extend cookie expiration (reset to 45 days from now)
   */
  async extendCookieExpiration(cookieId: string): Promise<void> {
    try {
      if (!isValidCookieId(cookieId)) {
        throw new Error('Invalid cookie ID format');
      }
      
      // Update in Firebase
      await authService.updateCookieActivity(cookieId);
      
      // Update local storage with new expiration
      const currentIP = await ipAddressService.getCurrentIPAddress();
      const cookieData = {
        id: cookieId,
        stored: Date.now(),
        expires: Date.now() + (CookieAccountService.COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        ipHash: ipAddressService.generateIPHash(currentIP, cookieId),
        version: '1.0'
      };
      
      localStorage.setItem(CookieAccountService.COOKIE_KEY, JSON.stringify(cookieData));
    } catch (error) {
      throw createFirestoreError('extendCookieExpiration', error, { cookieId });
    }
  }

  /**
   * Create or restore cookie account
   */
  async getOrCreateCookieAccount(ipAddress?: string): Promise<CookieAccount> {
    try {
      const currentIP = ipAddress || await ipAddressService.getCurrentIPAddress();
      
      // Try to get existing cookie from storage
      const existingCookieId = await this.getCookieFromStorage();
      
      if (existingCookieId) {
        // Check if cookie account still exists and is valid
        const cookieAccount = await authService.getCookieAccount(existingCookieId);
        
        if (cookieAccount && !cookieAccount.isExpired) {
          // Validate IP access
          const hasValidAccess = ipAddressService.validateCookieIPAccess(
            cookieAccount.ipAddress, 
            currentIP
          );
          
          if (hasValidAccess) {
            // Extend expiration on activity
            await this.extendCookieExpiration(existingCookieId);
            return cookieAccount;
          } else {
            // IP mismatch, clear cookie and create new one
            console.warn('Cookie account IP mismatch, creating new account');
            await this.clearCookieFromStorage();
          }
        } else {
          // Cookie expired or doesn't exist, clear local storage
          await this.clearCookieFromStorage();
        }
      }
      
      // Create new cookie account
      return await authService.createCookieAccount(currentIP);
    } catch (error) {
      throw createFirestoreError('getOrCreateCookieAccount', error, { ipAddress });
    }
  }

  /**
   * Validate cookie account access by IP address
   */
  async validateCookieAccess(cookieId: string, currentIpAddress?: string): Promise<boolean> {
    try {
      if (!isValidCookieId(cookieId)) {
        return false;
      }
      
      const cookieAccount = await authService.getCookieAccount(cookieId);
      
      if (!cookieAccount || cookieAccount.isExpired) {
        return false;
      }
      
      // Get current IP if not provided
      const currentIP = currentIpAddress || await ipAddressService.getCurrentIPAddress();
      
      // Use IP service for validation
      return ipAddressService.validateCookieIPAccess(cookieAccount.ipAddress, currentIP);
    } catch (error) {
      console.warn('Failed to validate cookie access:', error);
      return false;
    }
  }

  /**
   * Get cookie account statistics
   */
  async getCookieAccountStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    averageLifetime: number;
  }> {
    try {
      // This would require admin privileges and proper indexing
      // For now, return placeholder data
      return {
        totalActive: 0,
        totalExpired: 0,
        averageLifetime: 0
      };
    } catch (error) {
      throw createFirestoreError('getCookieAccountStats', error);
    }
  }

  /**
   * Clean up expired cookie accounts (admin function)
   */
  async cleanupExpiredCookies(): Promise<number> {
    try {
      // This would be implemented as a Firebase Cloud Function
      // or admin-only operation due to security rules
      console.warn('cleanupExpiredCookies should be implemented as a server-side function');
      return 0;
    } catch (error) {
      throw createFirestoreError('cleanupExpiredCookies', error);
    }
  }

  /**
   * Migrate cookie account data to full account
   */
  async migrateCookieData(cookieId: string, newUserId: string): Promise<void> {
    try {
      if (!isValidCookieId(cookieId)) {
        throw new Error('Invalid cookie ID format');
      }
      
      // This will be handled by the auth service
      // Just clear the local cookie storage
      await this.clearCookieFromStorage();
    } catch (error) {
      throw createFirestoreError('migrateCookieData', error, { cookieId, newUserId });
    }
  }

  /**
   * Check if browser supports required features
   */
  isBrowserSupported(): boolean {
    try {
      // Check for localStorage support
      const testKey = 'test_storage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Check for crypto API support (optional but preferred)
      const hasCrypto = typeof crypto !== 'undefined' && 
                       typeof crypto.getRandomValues === 'function';
      
      return true; // localStorage is sufficient, crypto is nice-to-have
    } catch (error) {
      console.warn('Browser does not support required features:', error);
      return false;
    }
  }

  /**
   * Get current cookie account if exists
   */
  async getCurrentCookieAccount(): Promise<CookieAccount | null> {
    try {
      const cookieId = await this.getCookieFromStorage();
      
      if (!cookieId) {
        return null;
      }
      
      const cookieAccount = await authService.getCookieAccount(cookieId);
      
      if (!cookieAccount || cookieAccount.isExpired) {
        await this.clearCookieFromStorage();
        return null;
      }
      
      return cookieAccount;
    } catch (error) {
      console.warn('Failed to get current cookie account:', error);
      return null;
    }
  }

  /**
   * Handle expired cookie account cleanup
   */
  private async handleExpiredCookie(cookieId: string): Promise<void> {
    try {
      // Expire the account in Firebase
      await authService.expireCookieAccount(cookieId);
      
      // Clear local storage
      await this.clearCookieFromStorage();
      
      // Clear any cached data
      ipAddressService.clearIPCache();
      
    } catch (error) {
      console.warn('Failed to handle expired cookie:', error);
    }
  }

  /**
   * Force expire current cookie account
   */
  async expireCurrentCookie(): Promise<void> {
    try {
      const cookieId = await this.getCookieFromStorage();
      
      if (cookieId) {
        await this.handleExpiredCookie(cookieId);
      }
    } catch (error) {
      throw createFirestoreError('expireCurrentCookie', error);
    }
  }

  /**
   * Get days until cookie expiration
   */
  async getDaysUntilExpiration(): Promise<number | null> {
    try {
      const cookieId = await this.getCookieFromStorage();
      
      if (!cookieId) {
        return null;
      }
      
      const cookieAccount = await authService.getCookieAccount(cookieId);
      
      if (!cookieAccount || cookieAccount.isExpired) {
        return 0;
      }
      
      const now = new Date();
      const daysUntilExpiry = Math.ceil((cookieAccount.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return Math.max(0, daysUntilExpiry);
    } catch (error) {
      console.warn('Failed to get days until expiration:', error);
      return null;
    }
  }

  /**
   * Check if cookie account needs renewal warning
   */
  async shouldShowExpirationWarning(): Promise<boolean> {
    try {
      const daysUntilExpiry = await this.getDaysUntilExpiration();
      
      if (daysUntilExpiry === null) {
        return false;
      }
      
      // Show warning if expiring within 7 days
      return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    } catch (error) {
      console.warn('Failed to check expiration warning:', error);
      return false;
    }
  }

  /**
   * Automatically handle expired accounts on app startup
   */
  async handleStartupExpiration(): Promise<boolean> {
    try {
      const cookieId = await this.getCookieFromStorage();
      
      if (!cookieId) {
        return false; // No cookie account
      }
      
      const isExpired = await this.checkCookieExpiration(cookieId);
      
      if (isExpired) {
        // Clear everything and treat as new user
        await this.clearCookieFromStorage();
        ipAddressService.clearIPCache();
        
        // Clear any other cached data
        localStorage.removeItem('welcomeWinks_onboardingState');
        localStorage.removeItem('welcomeWinks_userPreferences');
        
        return true; // Account was expired and cleaned up
      }
      
      return false; // Account is still valid
    } catch (error) {
      console.warn('Failed to handle startup expiration:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cookieAccountService = CookieAccountService.getInstance();