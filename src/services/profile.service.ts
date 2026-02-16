import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { deleteUser, User as FirebaseUser } from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  UserProfile, 
  BusinessRating,
  CookieAccount,
  AppUser 
} from '../types/firebase';
import { 
  createFirestoreConverter, 
  createFirestoreError,
  sanitizeForFirestore 
} from '../utils/firestore';
import { ipAddressService } from './ipAddress.service';

interface AccountDeletionLog {
  userId: string;
  accountType: 'full' | 'cookie';
  deletedAt: Date;
  reason?: string;
  confirmedAt: Date;
  userAgent: string;
  ipAddress: string;
  dataDeleted: {
    profile: boolean;
    ratings: number;
    cookieAccount: boolean;
    firebaseAuth: boolean;
  };
}

interface ProfileUpdateLog {
  userId: string;
  updatedFields: string[];
  updatedAt: Date;
  ipAddress: string;
  userAgent: string;
}

/**
 * Profile Service
 * Handles user profile management, data export, and account deletion
 */
export class ProfileService {
  private static instance: ProfileService;
  
  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  /**
   * Get user profile with activity tracking
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profileRef = doc(db, 'userProfiles', userId);
      const profileDoc = await getDoc(profileRef.withConverter(createFirestoreConverter<UserProfile>()));
      
      if (!profileDoc.exists()) {
        return null;
      }

      const profile = profileDoc.data();
      
      // Track profile access for activity monitoring
      await this.trackProfileActivity(userId, 'profile_accessed');
      
      return profile;
    } catch (error) {
      throw createFirestoreError('getUserProfile', error, { userId });
    }
  }

  /**
   * Update user profile with change tracking
   */
  async updateUserProfile(
    userId: string, 
    updates: Partial<UserProfile>,
    trackChanges: boolean = true
  ): Promise<void> {
    try {
      const profileRef = doc(db, 'userProfiles', userId);
      
      // Get current profile for change tracking
      let changedFields: string[] = [];
      if (trackChanges) {
        const currentProfile = await this.getUserProfile(userId);
        if (currentProfile) {
          changedFields = this.getChangedFields(currentProfile, updates);
        }
      }
      
      const sanitizedUpdates = sanitizeForFirestore({
        ...updates,
        updatedAt: new Date()
      });
      
      await updateDoc(profileRef, sanitizedUpdates);
      
      // Log the profile update
      if (trackChanges && changedFields.length > 0) {
        await this.logProfileUpdate(userId, changedFields);
      }
      
      // Track profile update activity
      await this.trackProfileActivity(userId, 'profile_updated');
      
    } catch (error) {
      throw createFirestoreError('updateUserProfile', error, { userId, updates });
    }
  }

  /**
   * Get user's complete data for export (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<{
    profile: UserProfile | null;
    ratings: BusinessRating[];
    activityLog: any[];
    accountInfo: any;
    exportMetadata: {
      exportedAt: Date;
      exportedBy: string;
      dataVersion: string;
    };
  }> {
    try {
      // Get user profile
      const profile = await this.getUserProfile(userId);
      
      // Get user's ratings
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('userId', '==', userId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery.withConverter(createFirestoreConverter<BusinessRating>()));
      const ratings = ratingsSnapshot.docs.map(doc => doc.data());
      
      // Get account information
      let accountInfo: any = null;
      if (profile?.accountType === 'full') {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef.withConverter(createFirestoreConverter<AppUser>()));
        accountInfo = userDoc.exists() ? userDoc.data() : null;
      } else if (profile?.accountType === 'cookie') {
        const cookieRef = doc(db, 'cookieAccounts', userId);
        const cookieDoc = await getDoc(cookieRef.withConverter(createFirestoreConverter<CookieAccount>()));
        accountInfo = cookieDoc.exists() ? cookieDoc.data() : null;
      }
      
      // Create activity log from IP history and other activities
      const activityLog = this.createActivityLog(profile, ratings);
      
      // Track data export activity
      await this.trackProfileActivity(userId, 'data_exported');
      
      return {
        profile,
        ratings,
        activityLog,
        accountInfo,
        exportMetadata: {
          exportedAt: new Date(),
          exportedBy: userId,
          dataVersion: '1.0'
        }
      };
    } catch (error) {
      throw createFirestoreError('exportUserData', error, { userId });
    }
  }

  /**
   * Delete user account and all associated data (GDPR compliance)
   */
  async deleteAccount(
    userId: string, 
    deletionInfo: {
      reason?: string;
      confirmedAt: Date;
      userAgent: string;
    }
  ): Promise<void> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      const batch = writeBatch(db);
      const deletionLog: AccountDeletionLog = {
        userId,
        accountType: profile.accountType,
        deletedAt: new Date(),
        reason: deletionInfo.reason,
        confirmedAt: deletionInfo.confirmedAt,
        userAgent: deletionInfo.userAgent,
        ipAddress: await ipAddressService.getCurrentIPAddress(),
        dataDeleted: {
          profile: false,
          ratings: 0,
          cookieAccount: false,
          firebaseAuth: false
        }
      };

      // Delete user ratings
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('userId', '==', userId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      
      ratingsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletionLog.dataDeleted.ratings++;
      });

      // Delete user profile
      const profileRef = doc(db, 'userProfiles', userId);
      batch.delete(profileRef);
      deletionLog.dataDeleted.profile = true;

      // Delete account-specific data
      if (profile.accountType === 'full') {
        // Delete Firebase Auth user
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === userId) {
          await deleteUser(currentUser);
          deletionLog.dataDeleted.firebaseAuth = true;
        }
        
        // Delete user document
        const userRef = doc(db, 'users', userId);
        batch.delete(userRef);
      } else if (profile.accountType === 'cookie') {
        // Delete cookie account
        const cookieRef = doc(db, 'cookieAccounts', userId);
        batch.delete(cookieRef);
        deletionLog.dataDeleted.cookieAccount = true;
      }

      // Update business rating aggregations
      await this.updateBusinessAggregationsAfterDeletion(userId);

      // Commit all deletions
      await batch.commit();

      // Log the deletion (in a separate collection for audit purposes)
      await this.logAccountDeletion(deletionLog);

      // Clear local storage if it's a cookie account
      if (profile.accountType === 'cookie') {
        try {
          localStorage.removeItem('welcomeWinks_cookieId');
        } catch (error) {
          console.warn('Failed to clear local storage:', error);
        }
      }

    } catch (error) {
      throw createFirestoreError('deleteAccount', error, { userId });
    }
  }

  /**
   * Get account activity summary
   */
  async getAccountActivity(userId: string): Promise<{
    totalRatings: number;
    lastActivity: Date | null;
    accountAge: number; // days
    ipAddressCount: number;
    recentActivity: any[];
  }> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      // Get ratings count
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('userId', '==', userId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      const totalRatings = ratingsSnapshot.size;

      // Calculate account age
      const accountAge = Math.floor(
        (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get IP address count and recent activity
      const ipAddressCount = profile.ipAddressHistory?.length || 0;
      const recentActivity = profile.ipAddressHistory?.slice(0, 10) || [];

      // Get last activity date
      let lastActivity: Date | null = null;
      if (profile.accountType === 'cookie') {
        const cookieRef = doc(db, 'cookieAccounts', userId);
        const cookieDoc = await getDoc(cookieRef.withConverter(createFirestoreConverter<CookieAccount>()));
        if (cookieDoc.exists()) {
          lastActivity = cookieDoc.data().lastActiveAt;
        }
      } else {
        lastActivity = profile.updatedAt;
      }

      return {
        totalRatings,
        lastActivity,
        accountAge,
        ipAddressCount,
        recentActivity
      };
    } catch (error) {
      throw createFirestoreError('getAccountActivity', error, { userId });
    }
  }

  /**
   * Anonymize user data (for expired cookie accounts)
   */
  async anonymizeUserData(userId: string): Promise<void> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return; // Already deleted or doesn't exist
      }

      // Anonymize profile data
      const anonymizedProfile: Partial<UserProfile> = {
        name: undefined,
        location: undefined,
        gender: undefined,
        race: undefined,
        veteranStatus: undefined,
        politicalPosition: undefined,
        ipAddressHistory: profile.ipAddressHistory?.map(entry => ({
          ...entry,
          ipAddress: ipAddressService.anonymizeIPAddress(entry.ipAddress),
          geolocation: undefined
        })),
        updatedAt: new Date()
      };

      await this.updateUserProfile(userId, anonymizedProfile, false);

      // Anonymize ratings IP addresses
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('userId', '==', userId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      
      const batch = writeBatch(db);
      ratingsSnapshot.docs.forEach(doc => {
        const rating = doc.data();
        batch.update(doc.ref, {
          userIpAddress: ipAddressService.anonymizeIPAddress(rating.userIpAddress)
        });
      });
      
      await batch.commit();

      // Track anonymization activity
      await this.trackProfileActivity(userId, 'data_anonymized');

    } catch (error) {
      throw createFirestoreError('anonymizeUserData', error, { userId });
    }
  }

  /**
   * Check if user has GDPR rights (EU users)
   */
  async checkGDPRRights(userId: string): Promise<{
    hasGDPRRights: boolean;
    detectedLocation?: string;
    rightsExplanation: string;
  }> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile || !profile.ipAddressHistory) {
        return {
          hasGDPRRights: false,
          rightsExplanation: 'Unable to determine location for GDPR rights assessment.'
        };
      }

      // Check if user has accessed from EU countries
      const euCountries = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
      ];

      const hasEUAccess = profile.ipAddressHistory.some(entry => 
        entry.geolocation?.country && euCountries.includes(entry.geolocation.country)
      );

      const detectedLocation = profile.ipAddressHistory[0]?.geolocation?.country;

      return {
        hasGDPRRights: hasEUAccess,
        detectedLocation,
        rightsExplanation: hasEUAccess 
          ? 'You have GDPR rights including data portability, rectification, and erasure.'
          : 'GDPR rights apply if you are an EU resident or have accessed our service from the EU.'
      };
    } catch (error) {
      console.warn('Failed to check GDPR rights:', error);
      return {
        hasGDPRRights: true, // Default to granting rights if check fails
        rightsExplanation: 'We respect your privacy rights regardless of location.'
      };
    }
  }

  /**
   * Track profile activity for monitoring
   */
  private async trackProfileActivity(userId: string, action: string): Promise<void> {
    try {
      const currentIP = await ipAddressService.getCurrentIPAddress();
      const ipGeolocation = await ipAddressService.getIPGeolocation(currentIP);
      
      const profileRef = doc(db, 'userProfiles', userId);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const profile = profileDoc.data();
        const ipHistory = profile.ipAddressHistory || [];
        
        // Add new activity entry
        const newEntry = {
          ipAddress: currentIP,
          timestamp: new Date(),
          action,
          geolocation: ipGeolocation
        };
        
        // Keep only last 20 entries for performance
        const updatedHistory = [newEntry, ...ipHistory].slice(0, 20);
        
        await updateDoc(profileRef, {
          ipAddressHistory: updatedHistory,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.warn('Failed to track profile activity:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Log profile updates for audit trail
   */
  private async logProfileUpdate(userId: string, changedFields: string[]): Promise<void> {
    try {
      const updateLog: ProfileUpdateLog = {
        userId,
        updatedFields: changedFields,
        updatedAt: new Date(),
        ipAddress: await ipAddressService.getCurrentIPAddress(),
        userAgent: navigator.userAgent
      };

      // Store in audit log collection
      const logRef = doc(collection(db, 'profileUpdateLogs'));
      await updateDoc(logRef, sanitizeForFirestore(updateLog));
    } catch (error) {
      console.warn('Failed to log profile update:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Log account deletion for audit trail
   */
  private async logAccountDeletion(deletionLog: AccountDeletionLog): Promise<void> {
    try {
      const logRef = doc(collection(db, 'accountDeletionLogs'));
      await updateDoc(logRef, sanitizeForFirestore(deletionLog));
    } catch (error) {
      console.warn('Failed to log account deletion:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Update business rating aggregations after user deletion
   */
  private async updateBusinessAggregationsAfterDeletion(userId: string): Promise<void> {
    try {
      // Get all businesses that the user rated
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('userId', '==', userId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      
      const businessIds = new Set<string>();
      ratingsSnapshot.docs.forEach(doc => {
        const rating = doc.data();
        businessIds.add(rating.businessId);
      });

      // Update aggregations for each business
      const { ratingsService } = await import('./ratings.service');
      for (const businessId of businessIds) {
        try {
          await ratingsService.updateBusinessAggregation(businessId);
        } catch (error) {
          console.warn(`Failed to update aggregation for business ${businessId}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to update business aggregations after deletion:', error);
    }
  }

  /**
   * Create activity log from user data
   */
  private createActivityLog(profile: UserProfile | null, ratings: BusinessRating[]): any[] {
    const activities: any[] = [];

    // Add profile activities
    if (profile?.ipAddressHistory) {
      activities.push(...profile.ipAddressHistory.map(entry => ({
        type: 'account_activity',
        action: entry.action,
        timestamp: entry.timestamp,
        location: entry.geolocation ? {
          country: entry.geolocation.country,
          region: entry.geolocation.region
        } : undefined
      })));
    }

    // Add rating activities
    activities.push(...ratings.map(rating => ({
      type: 'business_rating',
      action: 'rating_submitted',
      timestamp: rating.createdAt,
      businessId: rating.businessId,
      welcomingLevel: rating.welcomingLevel
    })));

    // Sort by timestamp (newest first)
    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get changed fields between current and updated profile
   */
  private getChangedFields(current: UserProfile, updates: Partial<UserProfile>): string[] {
    const changedFields: string[] = [];
    
    const fieldsToCheck = [
      'name', 'location', 'gender', 'race', 'veteranStatus', 'politicalPosition',
      'privacyConsent', 'termsAccepted'
    ];

    fieldsToCheck.forEach(field => {
      const currentValue = (current as any)[field];
      const updateValue = (updates as any)[field];
      
      if (updateValue !== undefined && currentValue !== updateValue) {
        changedFields.push(field);
      }
    });

    // Check preferences changes
    if (updates.preferences) {
      const currentPrefs = current.preferences;
      const updatePrefs = updates.preferences;
      
      if (JSON.stringify(currentPrefs) !== JSON.stringify(updatePrefs)) {
        changedFields.push('preferences');
      }
    }

    return changedFields;
  }
}

// Export singleton instance
export const profileService = ProfileService.getInstance();