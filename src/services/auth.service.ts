import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { ipAddressService } from './ipAddress.service';
import { errorHandlingService } from './errorHandling.service';
import {
  AppUser,
  CookieAccount,
  UserProfile,
  RegistrationData,
  UserPreferences
} from '../types/firebase';
import {
  createFirestoreConverter,
  createFirestoreError,
  generateDocumentId,
  sanitizeForFirestore,
  isValidCookieId
} from '../utils/firestore';
import { FirebaseAppError } from '../utils/firebase-errors';

/**
 * Authentication Service
 * Handles user authentication, account creation, and cookie account management
 */
export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get current user's IP address
   */
  private async getCurrentIPAddress(): Promise<string> {
    return await ipAddressService.getCurrentIPAddress();
  }

  /**
   * Create a new full user account with email and password
   */
  async signUp(registrationData: RegistrationData): Promise<AppUser> {
    return await errorHandlingService.executeOperation(async () => {
      const { email, password, ...profileData } = registrationData;

      // Get user's IP address for security checks
      const ipAddress = await this.getCurrentIPAddress();

      // Security check: Can create account from this IP?
      const { securityService } = await import('./security.service');
      const permissionResult = await securityService.canCreateAccount(ipAddress, 'full');
      if (!permissionResult.canCreate) {
        throw new FirebaseAppError(
          `app/${permissionResult.reason}`,
          permissionResult.message,
          'signUp',
          {
            email,
            ipAddress,
            reason: permissionResult.reason,
            retryAfter: permissionResult.retryAfter
          }
        );
      }

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get geolocation
      const ipGeolocation = await ipAddressService.getIPGeolocation(ipAddress);

      // Create user profile with IP tracking
      const userProfile: UserProfile = {
        userId: firebaseUser.uid,
        accountType: 'full',
        ...profileData,
        ipAddressHistory: [{
          ipAddress,
          timestamp: new Date(),
          action: 'account_created',
          geolocation: ipGeolocation
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create app user record
      const appUser: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        ipAddress,
        accountType: 'full'
      };

      // Save to Firestore
      const userConverter = createFirestoreConverter<AppUser>();
      const profileConverter = createFirestoreConverter<UserProfile>();

      await Promise.all([
        setDoc(
          doc(db, 'users', firebaseUser.uid).withConverter(userConverter),
          sanitizeForFirestore(appUser)
        ),
        setDoc(
          doc(db, 'userProfiles', firebaseUser.uid).withConverter(profileConverter),
          sanitizeForFirestore(userProfile)
        )
      ]);

      // Record in audit trail
      await securityService.recordAccountCreation({
        userId: firebaseUser.uid,
        accountType: 'full',
        email,
        registrationMethod: 'email',
        demographicData: profileData
      });

      // Update Firebase profile
      if (profileData.name) {
        await updateProfile(firebaseUser, { displayName: profileData.name });
      }

      return appUser;
    }, {
      operationName: 'auth.signUp',
      retryOptions: {
        maxRetries: 2, // Limited retries for auth operations
        baseDelay: 1000
      }
    });
  }

  /**
   * Sign in existing user with email and password
   */
  async signIn(email: string, password: string): Promise<AppUser> {
    return await errorHandlingService.executeOperation(async () => {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user's IP address and geolocation
      const ipAddress = await this.getCurrentIPAddress();
      const ipGeolocation = await ipAddressService.getIPGeolocation(ipAddress);

      // Update last login time and IP
      const userRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        ipAddress
      });

      // Track IP address in user profile
      await this.trackIPAddress(firebaseUser.uid, ipAddress, 'login', ipGeolocation);

      // Get updated user data
      const userDoc = await getDoc(userRef.withConverter(createFirestoreConverter<AppUser>()));

      if (!userDoc.exists()) {
        throw new FirebaseAppError(
          'firestore/not-found',
          'User profile not found',
          'signIn',
          { userId: firebaseUser.uid }
        );
      }

      return userDoc.data();
    }, {
      operationName: 'auth.signIn',
      retryOptions: {
        maxRetries: 2,
        baseDelay: 1000
      }
    });
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    return await errorHandlingService.executeOperation(async () => {
      await signOut(auth);
    }, {
      operationName: 'auth.signOut',
      retryOptions: {
        maxRetries: 1,
        baseDelay: 500
      }
    });
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw createFirestoreError('resetPassword', error, { email });
    }
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profileRef = doc(db, 'userProfiles', userId);
      const profileDoc = await getDoc(profileRef.withConverter(createFirestoreConverter<UserProfile>()));

      return profileDoc.exists() ? profileDoc.data() : null;
    } catch (error) {
      throw createFirestoreError('getUserProfile', error, { userId });
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const profileRef = doc(db, 'userProfiles', userId);
      const sanitizedUpdates = sanitizeForFirestore({
        ...updates,
        updatedAt: new Date()
      });

      await updateDoc(profileRef, sanitizedUpdates);
    } catch (error) {
      throw createFirestoreError('updateUserProfile', error, { userId, updates });
    }
  }

  /**
   * Create a cookie-based temporary account with security checks
   */
  async createCookieAccount(ipAddress?: string): Promise<CookieAccount> {
    return await errorHandlingService.executeOperation(async () => {
      const currentIP = ipAddress || await this.getCurrentIPAddress();

      // Ensure we are authenticated anonymously to perform writes
      if (!auth.currentUser) {
        console.log('🔐 Signing in anonymously for cookie account creation...');
        try {
          await signInAnonymously(auth);
          // Wait a brief moment for auth state to propagate locally
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error("Failed to sign in anonymously:", error);
          throw new FirebaseAppError(
            'auth/anonymous-auth-failed',
            'Failed to establish secure connection. Please check your internet and try again.',
            'createCookieAccount',
            { originalError: error }
          );
        }
      }

      if (!auth.currentUser) {
        throw new FirebaseAppError(
          'auth/not-authenticated',
          'Authentication failed.',
          'createCookieAccount'
        );
      }

      if (!ipAddressService.isValidIPAddress(currentIP)) {
        throw new FirebaseAppError(
          'app/invalid-ip-address',
          'Invalid IP address',
          'createCookieAccount',
          { ipAddress: currentIP }
        );
      }

      // Security check: Can create account from this IP?
      const { securityService } = await import('./security.service');
      const permissionResult = await securityService.canCreateAccount(currentIP, 'cookie');
      if (!permissionResult.canCreate) {
        throw new FirebaseAppError(
          `app/${permissionResult.reason}`,
          permissionResult.message,
          'createCookieAccount',
          {
            ipAddress: currentIP,
            reason: permissionResult.reason,
            retryAfter: permissionResult.retryAfter
          }
        );
      }

      const cookieId = await this.generateCookieId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (45 * 24 * 60 * 60 * 1000)); // 45 days
      const ipGeolocation = await ipAddressService.getIPGeolocation(currentIP);

      const cookieAccount: CookieAccount = {
        cookieId,
        ipAddress: currentIP,
        createdAt: now,
        lastActiveAt: now,
        expiresAt,
        accountType: 'cookie',
        isExpired: false
      };

      // Create cookie profile with IP tracking
      const cookieProfile: UserProfile = {
        userId: cookieId,
        accountType: 'cookie',
        preferences: this.getDefaultPreferences(),
        privacyConsent: false,
        termsAccepted: false,
        ipAddressHistory: [{
          ipAddress: currentIP,
          timestamp: now,
          action: 'cookie_account_created',
          geolocation: ipGeolocation
        }],
        createdAt: now,
        updatedAt: now
      };

      // Save to Firestore
      const cookieConverter = createFirestoreConverter<CookieAccount>();
      const profileConverter = createFirestoreConverter<UserProfile>();

      await Promise.all([
        setDoc(
          doc(db, 'cookieAccounts', cookieId).withConverter(cookieConverter),
          sanitizeForFirestore(cookieAccount)
        ),
        setDoc(
          doc(db, 'userProfiles', cookieId).withConverter(profileConverter),
          sanitizeForFirestore(cookieProfile)
        )
      ]);

      // Record in audit trail
      await securityService.recordAccountCreation({
        userId: cookieId,
        accountType: 'cookie',
        registrationMethod: 'cookie'
      });

      // Store cookie ID locally
      this.storeCookieLocally(cookieId);

      return cookieAccount;
    }, {
      operationName: 'auth.createCookieAccount',
      retryOptions: {
        maxRetries: 2,
        baseDelay: 1000
      }
    });
  }

  /**
   * Get cookie account by ID with security validation
   */
  async getCookieAccount(cookieId: string): Promise<CookieAccount | null> {
    try {
      if (!isValidCookieId(cookieId)) {
        return null;
      }

      const cookieRef = doc(db, 'cookieAccounts', cookieId);
      const cookieDoc = await getDoc(cookieRef.withConverter(createFirestoreConverter<CookieAccount>()));

      if (!cookieDoc.exists()) {
        return null;
      }

      const cookieAccount = cookieDoc.data();

      // Check if expired
      if (cookieAccount.expiresAt < new Date()) {
        await this.expireCookieAccount(cookieId);
        return null;
      }

      // Additional security validation
      const currentIP = await this.getCurrentIPAddress();
      const isValidAccess = ipAddressService.validateCookieIPAccess(
        cookieAccount.ipAddress,
        currentIP
      );

      if (!isValidAccess) {
        console.warn('Cookie account access denied due to IP mismatch', {
          cookieId: cookieId.substring(0, 10) + '...',
          originalIP: ipAddressService.anonymizeIPAddress(cookieAccount.ipAddress),
          currentIP: ipAddressService.anonymizeIPAddress(currentIP)
        });

        // Don't return the account but don't expire it either
        // This allows for legitimate IP changes while preventing hijacking
        return null;
      }

      return cookieAccount;
    } catch (error) {
      throw createFirestoreError('getCookieAccount', error, { cookieId });
    }
  }

  /**
   * Update cookie account activity (extends expiration)
   */
  async updateCookieActivity(cookieId: string): Promise<void> {
    try {
      const cookieAccount = await this.getCookieAccount(cookieId);
      if (!cookieAccount) {
        throw new Error('Cookie account not found or expired');
      }

      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + (45 * 24 * 60 * 60 * 1000)); // Reset to 45 days
      const currentIP = await this.getCurrentIPAddress();

      // Update cookie account
      const cookieRef = doc(db, 'cookieAccounts', cookieId);
      await updateDoc(cookieRef, {
        lastActiveAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(newExpiresAt)
      });

      // Track IP address activity
      await this.trackIPAddress(cookieId, currentIP, 'cookie_activity');
    } catch (error) {
      throw createFirestoreError('updateCookieActivity', error, { cookieId });
    }
  }

  /**
   * Expire a cookie account
   */
  async expireCookieAccount(cookieId: string): Promise<void> {
    try {
      const cookieRef = doc(db, 'cookieAccounts', cookieId);

      // Anonymize IP address before expiring
      const anonymizedIP = ipAddressService.anonymizeIPAddress(
        (await this.getCookieAccount(cookieId))?.ipAddress || '0.0.0.0'
      );

      await updateDoc(cookieRef, {
        isExpired: true,
        expiresAt: serverTimestamp(),
        ipAddress: anonymizedIP // Anonymize IP for privacy
      });

      // Anonymize IP addresses in profile history
      await this.anonymizeProfileIPHistory(cookieId);

      // Clear from local storage
      this.clearCookieFromStorage();
    } catch (error) {
      throw createFirestoreError('expireCookieAccount', error, { cookieId });
    }
  }

  /**
   * Migrate cookie account data to full account
   */
  async migrateCookieToFullAccount(cookieId: string, firebaseUser: FirebaseUser): Promise<{
    success: boolean;
    migratedData: {
      profile: boolean;
      ratings: number;
      preferences: boolean;
    };
    errors: string[];
  }> {
    const migrationResult = {
      success: false,
      migratedData: {
        profile: false,
        ratings: 0,
        preferences: false
      },
      errors: [] as string[]
    };

    try {
      // Get cookie account data
      const cookieAccount = await this.getCookieAccount(cookieId);
      if (!cookieAccount) {
        throw new Error('Cookie account not found or expired');
      }

      // Get cookie account profile if exists
      const cookieProfile = await this.getUserProfile(cookieId);

      // Migrate ratings first (most critical data)
      try {
        const { ratingsService } = await import('./ratings.service');
        const migratedRatings = await ratingsService.migrateUserRatings(cookieId, firebaseUser.uid);
        migrationResult.migratedData.ratings = migratedRatings;
      } catch (error) {
        migrationResult.errors.push(`Failed to migrate ratings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Create new full account profile with migrated data
      const currentIP = await this.getCurrentIPAddress();
      const ipGeolocation = await ipAddressService.getIPGeolocation(currentIP);

      const fullProfile: UserProfile = {
        userId: firebaseUser.uid,
        accountType: 'full',
        preferences: cookieProfile?.preferences || this.getDefaultPreferences(),
        privacyConsent: cookieProfile?.privacyConsent || false,
        termsAccepted: cookieProfile?.termsAccepted || false,
        // Preserve demographic data if it exists
        name: cookieProfile?.name,
        location: cookieProfile?.location,
        gender: cookieProfile?.gender,
        race: cookieProfile?.race,
        veteranStatus: cookieProfile?.veteranStatus,
        politicalPosition: cookieProfile?.politicalPosition,
        // Merge IP address history
        ipAddressHistory: [
          {
            ipAddress: currentIP,
            timestamp: new Date(),
            action: 'account_migration',
            geolocation: ipGeolocation
          },
          ...(cookieProfile?.ipAddressHistory || [])
        ].slice(0, 10), // Keep only last 10 entries
        createdAt: cookieProfile?.createdAt || new Date(),
        updatedAt: new Date()
      };

      // Save full account profile
      try {
        const profileConverter = createFirestoreConverter<UserProfile>();
        await setDoc(
          doc(db, 'userProfiles', firebaseUser.uid).withConverter(profileConverter),
          sanitizeForFirestore(fullProfile)
        );
        migrationResult.migratedData.profile = true;
        migrationResult.migratedData.preferences = true;
      } catch (error) {
        migrationResult.errors.push(`Failed to create full account profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Clean up cookie account only if migration was successful
      if (migrationResult.migratedData.profile) {
        try {
          await this.cleanupCookieAccount(cookieId);
        } catch (error) {
          migrationResult.errors.push(`Failed to cleanup cookie account: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      migrationResult.success = migrationResult.migratedData.profile && migrationResult.errors.length === 0;

      return migrationResult;
    } catch (error) {
      migrationResult.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw createFirestoreError('migrateCookieToFullAccount', error, { cookieId, userId: firebaseUser.uid });
    }
  }

  /**
   * Clean up cookie account data after successful migration
   */
  private async cleanupCookieAccount(cookieId: string): Promise<void> {
    try {
      // Delete cookie account documents
      await Promise.all([
        deleteDoc(doc(db, 'cookieAccounts', cookieId)),
        deleteDoc(doc(db, 'userProfiles', cookieId))
      ]);

      // Clear cookie from local storage
      this.clearCookieFromStorage();
    } catch (error) {
      throw createFirestoreError('cleanupCookieAccount', error, { cookieId });
    }
  }

  /**
   * Get migration preview - shows what data would be migrated
   */
  async getMigrationPreview(cookieId: string): Promise<{
    cookieAccount: CookieAccount | null;
    profile: UserProfile | null;
    ratingsCount: number;
    hasPreferences: boolean;
    hasDemographicData: boolean;
  }> {
    try {
      const cookieAccount = await this.getCookieAccount(cookieId);
      const profile = await this.getUserProfile(cookieId);

      let ratingsCount = 0;
      try {
        const { ratingsService } = await import('./ratings.service');
        const ratings = await ratingsService.getUserRatings(cookieId, 1000);
        ratingsCount = ratings.length;
      } catch (error) {
        console.warn('Failed to get ratings count for migration preview:', error);
      }

      const hasPreferences = !!(profile?.preferences &&
        Object.keys(profile.preferences).length > 0);

      const hasDemographicData = !!(profile && (
        profile.name ||
        profile.location ||
        profile.gender ||
        profile.race ||
        profile.veteranStatus !== undefined ||
        profile.politicalPosition
      ));

      return {
        cookieAccount,
        profile,
        ratingsCount,
        hasPreferences,
        hasDemographicData
      };
    } catch (error) {
      throw createFirestoreError('getMigrationPreview', error, { cookieId });
    }
  }

  /**
   * Generate a secure cookie ID
   */
  private async generateCookieId(): Promise<string> {
    // Import cookie service to avoid circular dependency
    const { cookieAccountService } = await import('./cookieAccount.service');
    return await cookieAccountService.generateCookieId();
  }

  /**
   * Store cookie ID in local storage
   */
  private storeCookieLocally(cookieId: string): void {
    try {
      localStorage.setItem('welcomeWinks_cookieId', cookieId);
    } catch (error) {
      console.warn('Failed to store cookie ID locally:', error);
    }
  }

  /**
   * Get cookie ID from local storage
   */
  getCookieFromStorage(): string | null {
    try {
      return localStorage.getItem('welcomeWinks_cookieId');
    } catch (error) {
      console.warn('Failed to get cookie ID from storage:', error);
      return null;
    }
  }

  /**
   * Clear cookie ID from local storage
   */
  clearCookieFromStorage(): void {
    try {
      localStorage.removeItem('welcomeWinks_cookieId');
    } catch (error) {
      console.warn('Failed to clear cookie ID from storage:', error);
    }
  }

  /**
   * Check if cookie account is expired
   */
  async checkCookieExpiration(cookieId: string): Promise<boolean> {
    const cookieAccount = await this.getCookieAccount(cookieId);
    return !cookieAccount || cookieAccount.isExpired;
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      defaultView: 'map',
      locationSharing: true,
      notificationPreferences: {
        newBusinessesNearby: true,
        scoreUpdates: true,
        communityActivity: false
      },
      privacySettings: {
        shareContributions: true,
        publicProfile: false
      }
    };
  }

  /**
   * Track IP address for user activity
   */
  private async trackIPAddress(
    userId: string,
    ipAddress: string,
    action: string,
    geolocation?: any
  ): Promise<void> {
    try {
      const profileRef = doc(db, 'userProfiles', userId);
      const profileDoc = await getDoc(profileRef);

      if (profileDoc.exists()) {
        const profile = profileDoc.data();
        const ipHistory = profile.ipAddressHistory || [];

        // Add new IP entry
        const newEntry = {
          ipAddress,
          timestamp: new Date(),
          action,
          geolocation
        };

        // Keep only last 10 IP entries for privacy
        const updatedHistory = [newEntry, ...ipHistory].slice(0, 10);

        await updateDoc(profileRef, {
          ipAddressHistory: updatedHistory,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.warn('Failed to track IP address:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Anonymize IP addresses in user profile history
   */
  private async anonymizeProfileIPHistory(userId: string): Promise<void> {
    try {
      const profileRef = doc(db, 'userProfiles', userId);
      const profileDoc = await getDoc(profileRef);

      if (profileDoc.exists()) {
        const profile = profileDoc.data();

        if (profile.ipAddressHistory) {
          const anonymizedHistory = profile.ipAddressHistory.map((entry: any) => ({
            ...entry,
            ipAddress: ipAddressService.anonymizeIPAddress(entry.ipAddress),
            geolocation: undefined // Remove geolocation data
          }));

          await updateDoc(profileRef, {
            ipAddressHistory: anonymizedHistory,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.warn('Failed to anonymize profile IP history:', error);
    }
  }

  /**
   * Anonymize IP addresses for expired accounts (batch operation)
   */
  async anonymizeExpiredAccountIPs(): Promise<void> {
    try {
      // This would be implemented as a Firebase Cloud Function
      // for security and performance reasons
      console.warn('anonymizeExpiredAccountIPs should be implemented as a server-side function');
    } catch (error) {
      throw createFirestoreError('anonymizeExpiredAccountIPs', error);
    }
  }

  /**
   * Validate IP address for security checks
   */
  async validateIPForSecurity(userId: string, currentIP: string): Promise<{
    isValid: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    reason?: string;
  }> {
    try {
      const profile = await this.getUserProfile(userId);

      if (!profile || !profile.ipAddressHistory) {
        return { isValid: true, riskLevel: 'low' };
      }

      const recentIPs = profile.ipAddressHistory
        .filter(entry => {
          const daysSince = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 30; // Last 30 days
        })
        .map(entry => entry.ipAddress);

      // Check if current IP has been used recently
      const hasRecentIP = recentIPs.some(ip =>
        ip === currentIP || ipAddressService.isSameSubnet(ip, currentIP)
      );

      if (hasRecentIP) {
        return { isValid: true, riskLevel: 'low' };
      }

      // Check for suspicious patterns
      const uniqueIPs = new Set(recentIPs);
      if (uniqueIPs.size > 5) {
        return {
          isValid: false,
          riskLevel: 'high',
          reason: 'Too many different IP addresses'
        };
      }

      return {
        isValid: true,
        riskLevel: 'medium',
        reason: 'New IP address detected'
      };
    } catch (error) {
      console.warn('Failed to validate IP for security:', error);
      return { isValid: true, riskLevel: 'low' };
    }
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error: AuthError): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();