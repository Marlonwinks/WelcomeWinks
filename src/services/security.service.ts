import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { ipAddressService } from './ipAddress.service';
import { errorHandlingService } from './errorHandling.service';
import {
  createFirestoreConverter,
  generateDocumentId,
  sanitizeForFirestore
} from '../utils/firestore';
import { FirebaseAppError } from '../utils/firebase-errors';

/**
 * Security and abuse prevention service
 */
export class SecurityService {
  private static instance: SecurityService;
  private rateLimitCache = new Map<string, RateLimitEntry>();
  private suspiciousActivityCache = new Map<string, SuspiciousActivity>();

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  constructor() {
    // Clean up rate limit cache every 5 minutes
    setInterval(() => {
      this.cleanupRateLimitCache();
    }, 5 * 60 * 1000);

    // Clean up suspicious activity cache every hour
    setInterval(() => {
      this.cleanupSuspiciousActivityCache();
    }, 60 * 60 * 1000);
  }

  /**
   * Check if user can submit a rating (duplicate prevention)
   */
  async canUserRateBusiness(userId: string, businessId: string): Promise<RatingPermissionResult> {
    return await errorHandlingService.executeOperation(async () => {
      // Check for existing rating
      const ratingsRef = collection(db, 'ratings');
      const existingRatingQuery = query(
        ratingsRef,
        where('userId', '==', userId),
        where('businessId', '==', businessId),
        limit(1)
      );

      const existingRatingSnapshot = await getDocs(existingRatingQuery);
      
      if (!existingRatingSnapshot.empty) {
        return {
          canRate: false,
          reason: 'duplicate_rating',
          message: 'You have already rated this business',
          existingRatingId: existingRatingSnapshot.docs[0].id
        };
      }

      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(userId, 'rating_submission');
      if (!rateLimitResult.allowed) {
        return {
          canRate: false,
          reason: 'rate_limited',
          message: `Too many ratings submitted. Please wait ${Math.ceil(rateLimitResult.retryAfter! / 1000)} seconds.`,
          retryAfter: rateLimitResult.retryAfter
        };
      }

      // Check for suspicious activity
      const suspiciousResult = await this.checkSuspiciousActivity(userId, 'rating_submission');
      if (suspiciousResult.isSuspicious) {
        return {
          canRate: false,
          reason: 'suspicious_activity',
          message: 'Account flagged for suspicious activity. Please contact support.',
          suspiciousFlags: suspiciousResult.flags
        };
      }

      return {
        canRate: true,
        reason: 'allowed',
        message: 'Rating submission allowed'
      };
    }, {
      operationName: 'security.canUserRateBusiness',
      retryOptions: { maxRetries: 2 }
    });
  }

  /**
   * Check if user can create an account (rate limiting)
   */
  async canCreateAccount(ipAddress: string, accountType: 'full' | 'cookie'): Promise<AccountCreationPermissionResult> {
    return await errorHandlingService.executeOperation(async () => {
      const identifier = `account_creation_${ipAddress}`;
      
      // Different limits for different account types
      const limits = {
        full: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
        cookie: { maxAttempts: 10, windowMs: 60 * 60 * 1000 } // 10 per hour
      };

      const limit = limits[accountType];
      const rateLimitResult = await this.checkRateLimit(identifier, 'account_creation', limit);
      
      if (!rateLimitResult.allowed) {
        return {
          canCreate: false,
          reason: 'rate_limited',
          message: `Too many account creation attempts from this IP. Please wait ${Math.ceil(rateLimitResult.retryAfter! / (1000 * 60))} minutes.`,
          retryAfter: rateLimitResult.retryAfter
        };
      }

      // Check for suspicious IP activity
      const suspiciousResult = await this.checkSuspiciousIPActivity(ipAddress);
      if (suspiciousResult.isSuspicious) {
        return {
          canCreate: false,
          reason: 'suspicious_ip',
          message: 'This IP address has been flagged for suspicious activity.',
          suspiciousFlags: suspiciousResult.flags
        };
      }

      return {
        canCreate: true,
        reason: 'allowed',
        message: 'Account creation allowed'
      };
    }, {
      operationName: 'security.canCreateAccount',
      retryOptions: { maxRetries: 2 }
    });
  }

  /**
   * Record rating submission for audit trail
   */
  async recordRatingSubmission(auditData: RatingAuditData): Promise<void> {
    return await errorHandlingService.executeOperation(async () => {
      const auditId = generateDocumentId();
      const currentIP = await ipAddressService.getCurrentIPAddress();
      
      const auditRecord: AuditRecord = {
        auditId,
        eventType: 'rating_submission',
        userId: auditData.userId,
        userAccountType: auditData.userAccountType,
        businessId: auditData.businessId,
        ratingId: auditData.ratingId,
        ipAddress: currentIP,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        metadata: {
          totalScore: auditData.totalScore,
          welcomingLevel: auditData.welcomingLevel,
          surveyResponses: auditData.surveyResponses
        }
      };

      // Save audit record
      const auditRef = doc(db, 'auditTrail', auditId);
      await setDoc(
        auditRef.withConverter(createFirestoreConverter<AuditRecord>()),
        sanitizeForFirestore(auditRecord)
      );

      // Update rate limiting
      await this.recordRateLimitedAction(auditData.userId, 'rating_submission');
      
      // Check for patterns that might indicate manipulation
      await this.analyzeRatingPatterns(auditData.userId, auditData.businessId);
    }, {
      operationName: 'security.recordRatingSubmission',
      retryOptions: { maxRetries: 3 }
    });
  }

  /**
   * Record account creation for audit trail
   */
  async recordAccountCreation(auditData: AccountAuditData): Promise<void> {
    return await errorHandlingService.executeOperation(async () => {
      const auditId = generateDocumentId();
      const currentIP = await ipAddressService.getCurrentIPAddress();
      
      const auditRecord: AuditRecord = {
        auditId,
        eventType: 'account_creation',
        userId: auditData.userId,
        userAccountType: auditData.accountType,
        ipAddress: currentIP,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        metadata: {
          email: auditData.email,
          registrationMethod: auditData.registrationMethod,
          demographicData: auditData.demographicData
        }
      };

      // Save audit record
      const auditRef = doc(db, 'auditTrail', auditId);
      await setDoc(
        auditRef.withConverter(createFirestoreConverter<AuditRecord>()),
        sanitizeForFirestore(auditRecord)
      );

      // Update rate limiting
      const identifier = `account_creation_${currentIP}`;
      await this.recordRateLimitedAction(identifier, 'account_creation');
    }, {
      operationName: 'security.recordAccountCreation',
      retryOptions: { maxRetries: 3 }
    });
  }

  /**
   * Record account migration for audit trail
   */
  async recordAccountMigration(fromUserId: string, toUserId: string, migratedData: any): Promise<void> {
    return await errorHandlingService.executeOperation(async () => {
      const auditId = generateDocumentId();
      const currentIP = await ipAddressService.getCurrentIPAddress();
      
      const auditRecord: AuditRecord = {
        auditId,
        eventType: 'account_migration',
        userId: toUserId,
        userAccountType: 'full',
        ipAddress: currentIP,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        metadata: {
          fromUserId,
          toUserId,
          migratedRatings: migratedData.ratings,
          migratedProfile: migratedData.profile,
          migrationSuccess: migratedData.success
        }
      };

      // Save audit record
      const auditRef = doc(db, 'auditTrail', auditId);
      await setDoc(
        auditRef.withConverter(createFirestoreConverter<AuditRecord>()),
        sanitizeForFirestore(auditRecord)
      );
    }, {
      operationName: 'security.recordAccountMigration',
      retryOptions: { maxRetries: 3 }
    });
  }

  /**
   * Get audit trail for a user
   */
  async getUserAuditTrail(userId: string, limitCount: number = 50): Promise<AuditRecord[]> {
    return await errorHandlingService.executeOperation(async () => {
      const auditRef = collection(db, 'auditTrail');
      const auditQuery = query(
        auditRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const auditSnapshot = await getDocs(auditQuery.withConverter(createFirestoreConverter<AuditRecord>()));
      return auditSnapshot.docs.map(doc => doc.data());
    }, {
      operationName: 'security.getUserAuditTrail',
      retryOptions: { maxRetries: 2 }
    });
  }

  /**
   * Get audit trail for a business
   */
  async getBusinessAuditTrail(businessId: string, limitCount: number = 100): Promise<AuditRecord[]> {
    return await errorHandlingService.executeOperation(async () => {
      const auditRef = collection(db, 'auditTrail');
      const auditQuery = query(
        auditRef,
        where('businessId', '==', businessId),
        where('eventType', '==', 'rating_submission'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const auditSnapshot = await getDocs(auditQuery.withConverter(createFirestoreConverter<AuditRecord>()));
      return auditSnapshot.docs.map(doc => doc.data());
    }, {
      operationName: 'security.getBusinessAuditTrail',
      retryOptions: { maxRetries: 2 }
    });
  }

  /**
   * Flag user for suspicious activity
   */
  async flagSuspiciousUser(userId: string, reason: string, evidence: any): Promise<void> {
    return await errorHandlingService.executeOperation(async () => {
      const flagId = generateDocumentId();
      const currentIP = await ipAddressService.getCurrentIPAddress();
      
      const suspiciousFlag: SuspiciousActivityFlag = {
        flagId,
        userId,
        reason,
        evidence,
        ipAddress: currentIP,
        timestamp: new Date(),
        status: 'active',
        reviewedBy: null,
        reviewedAt: null
      };

      // Save suspicious activity flag
      const flagRef = doc(db, 'suspiciousActivity', flagId);
      await setDoc(
        flagRef.withConverter(createFirestoreConverter<SuspiciousActivityFlag>()),
        sanitizeForFirestore(suspiciousFlag)
      );

      // Update cache
      this.suspiciousActivityCache.set(userId, {
        userId,
        flags: [suspiciousFlag],
        lastUpdated: Date.now()
      });
    }, {
      operationName: 'security.flagSuspiciousUser',
      retryOptions: { maxRetries: 3 }
    });
  }

  /**
   * Get security statistics for monitoring
   */
  async getSecurityStatistics(): Promise<SecurityStatistics> {
    return await errorHandlingService.executeOperation(async () => {
      const now = Date.now();
      const last24Hours = now - (24 * 60 * 60 * 1000);
      const last7Days = now - (7 * 24 * 60 * 60 * 1000);

      // Get recent audit records
      const auditRef = collection(db, 'auditTrail');
      const recent24hQuery = query(
        auditRef,
        where('timestamp', '>=', Timestamp.fromMillis(last24Hours)),
        orderBy('timestamp', 'desc')
      );

      const recent7dQuery = query(
        auditRef,
        where('timestamp', '>=', Timestamp.fromMillis(last7Days)),
        orderBy('timestamp', 'desc')
      );

      const [recent24hSnapshot, recent7dSnapshot] = await Promise.all([
        getDocs(recent24hQuery),
        getDocs(recent7dQuery)
      ]);

      const recent24hRecords = recent24hSnapshot.docs.map(doc => doc.data());
      const recent7dRecords = recent7dSnapshot.docs.map(doc => doc.data());

      // Get suspicious activity flags
      const suspiciousRef = collection(db, 'suspiciousActivity');
      const activeFlagsQuery = query(
        suspiciousRef,
        where('status', '==', 'active')
      );
      const activeFlagsSnapshot = await getDocs(activeFlagsQuery);

      // Calculate statistics
      const ratingSubmissions24h = recent24hRecords.filter(r => r.eventType === 'rating_submission').length;
      const accountCreations24h = recent24hRecords.filter(r => r.eventType === 'account_creation').length;
      const ratingSubmissions7d = recent7dRecords.filter(r => r.eventType === 'rating_submission').length;
      const accountCreations7d = recent7dRecords.filter(r => r.eventType === 'account_creation').length;

      return {
        ratingSubmissions24h,
        accountCreations24h,
        ratingSubmissions7d,
        accountCreations7d,
        activeSuspiciousFlags: activeFlagsSnapshot.size,
        rateLimitedActions24h: this.countRateLimitedActions(last24Hours),
        averageRatingsPerUser: ratingSubmissions7d > 0 ? ratingSubmissions7d / accountCreations7d : 0,
        suspiciousActivityRate: activeFlagsSnapshot.size / Math.max(accountCreations7d, 1)
      };
    }, {
      operationName: 'security.getSecurityStatistics',
      retryOptions: { maxRetries: 2 }
    });
  }

  /**
   * Check rate limiting for an action
   */
  private async checkRateLimit(
    identifier: string, 
    action: string, 
    customLimits?: { maxAttempts: number; windowMs: number }
  ): Promise<RateLimitResult> {
    const limits = customLimits || this.getDefaultRateLimits(action);
    const now = Date.now();
    const windowStart = now - limits.windowMs;

    // Check cache first
    const cached = this.rateLimitCache.get(identifier);
    if (cached) {
      // Remove old attempts
      cached.attempts = cached.attempts.filter(timestamp => timestamp > windowStart);
      
      if (cached.attempts.length >= limits.maxAttempts) {
        const oldestAttempt = Math.min(...cached.attempts);
        const retryAfter = oldestAttempt + limits.windowMs - now;
        
        return {
          allowed: false,
          retryAfter: Math.max(retryAfter, 0),
          attemptsRemaining: 0
        };
      }
    }

    return {
      allowed: true,
      retryAfter: 0,
      attemptsRemaining: limits.maxAttempts - (cached?.attempts.length || 0)
    };
  }

  /**
   * Record a rate-limited action
   */
  private async recordRateLimitedAction(identifier: string, action: string): Promise<void> {
    const now = Date.now();
    const limits = this.getDefaultRateLimits(action);
    const windowStart = now - limits.windowMs;

    let entry = this.rateLimitCache.get(identifier);
    if (!entry) {
      entry = { identifier, attempts: [], lastUpdated: now };
      this.rateLimitCache.set(identifier, entry);
    }

    // Add current attempt and clean old ones
    entry.attempts.push(now);
    entry.attempts = entry.attempts.filter(timestamp => timestamp > windowStart);
    entry.lastUpdated = now;
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(userId: string, action: string): Promise<SuspiciousActivityResult> {
    // Check cache first
    const cached = this.suspiciousActivityCache.get(userId);
    if (cached && (Date.now() - cached.lastUpdated) < 5 * 60 * 1000) { // 5 minutes cache
      return {
        isSuspicious: cached.flags.length > 0,
        flags: cached.flags.map(f => f.reason)
      };
    }

    // Query database for active flags
    const suspiciousRef = collection(db, 'suspiciousActivity');
    const userFlagsQuery = query(
      suspiciousRef,
      where('userId', '==', userId),
      where('status', '==', 'active')
    );

    const flagsSnapshot = await getDocs(userFlagsQuery.withConverter(createFirestoreConverter<SuspiciousActivityFlag>()));
    const flags = flagsSnapshot.docs.map(doc => doc.data());

    // Update cache
    this.suspiciousActivityCache.set(userId, {
      userId,
      flags,
      lastUpdated: Date.now()
    });

    return {
      isSuspicious: flags.length > 0,
      flags: flags.map(f => f.reason)
    };
  }

  /**
   * Check for suspicious IP activity
   */
  private async checkSuspiciousIPActivity(ipAddress: string): Promise<SuspiciousActivityResult> {
    // This would typically check against known bad IP lists, VPN detection, etc.
    // For now, we'll implement basic checks
    
    const suspiciousPatterns = [
      // Check for too many account creations from same IP
      { pattern: 'multiple_accounts', threshold: 20 },
      // Check for rapid rating submissions
      { pattern: 'rapid_ratings', threshold: 50 }
    ];

    const flags: string[] = [];

    // In a real implementation, you would check these patterns against the database
    // For now, we'll return a basic result
    return {
      isSuspicious: flags.length > 0,
      flags
    };
  }

  /**
   * Analyze rating patterns for potential manipulation
   */
  private async analyzeRatingPatterns(userId: string, businessId: string): Promise<void> {
    // This would analyze patterns like:
    // - User rating many businesses in a short time
    // - User always giving extreme ratings
    // - Multiple users from same IP rating same business
    // - Coordinated rating campaigns
    
    // For now, we'll implement basic pattern detection
    const recentRatings = await this.getUserRecentRatings(userId, 24 * 60 * 60 * 1000); // Last 24 hours
    
    if (recentRatings.length > 10) {
      await this.flagSuspiciousUser(userId, 'excessive_rating_activity', {
        ratingsIn24h: recentRatings.length,
        threshold: 10
      });
    }
  }

  /**
   * Get user's recent ratings for pattern analysis
   */
  private async getUserRecentRatings(userId: string, timeWindowMs: number): Promise<any[]> {
    const ratingsRef = collection(db, 'ratings');
    const recentQuery = query(
      ratingsRef,
      where('userId', '==', userId),
      where('createdAt', '>=', Timestamp.fromMillis(Date.now() - timeWindowMs))
    );

    const snapshot = await getDocs(recentQuery);
    return snapshot.docs.map(doc => doc.data());
  }

  /**
   * Get default rate limits for different actions
   */
  private getDefaultRateLimits(action: string): { maxAttempts: number; windowMs: number } {
    const limits = {
      rating_submission: { maxAttempts: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
      account_creation: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
      login_attempt: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
      password_reset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 } // 3 per hour
    };

    return limits[action as keyof typeof limits] || { maxAttempts: 10, windowMs: 60 * 60 * 1000 };
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimitCache(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [identifier, entry] of this.rateLimitCache.entries()) {
      if (now - entry.lastUpdated > maxAge) {
        this.rateLimitCache.delete(identifier);
      }
    }
  }

  /**
   * Clean up expired suspicious activity cache
   */
  private cleanupSuspiciousActivityCache(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [userId, activity] of this.suspiciousActivityCache.entries()) {
      if (now - activity.lastUpdated > maxAge) {
        this.suspiciousActivityCache.delete(userId);
      }
    }
  }

  /**
   * Count rate-limited actions in time window
   */
  private countRateLimitedActions(since: number): number {
    let count = 0;
    for (const entry of this.rateLimitCache.values()) {
      count += entry.attempts.filter(timestamp => timestamp > since).length;
    }
    return count;
  }
}

/**
 * Interfaces
 */
export interface RatingPermissionResult {
  canRate: boolean;
  reason: 'allowed' | 'duplicate_rating' | 'rate_limited' | 'suspicious_activity';
  message: string;
  existingRatingId?: string;
  retryAfter?: number;
  suspiciousFlags?: string[];
}

export interface AccountCreationPermissionResult {
  canCreate: boolean;
  reason: 'allowed' | 'rate_limited' | 'suspicious_ip';
  message: string;
  retryAfter?: number;
  suspiciousFlags?: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  attemptsRemaining: number;
}

export interface SuspiciousActivityResult {
  isSuspicious: boolean;
  flags: string[];
}

export interface RateLimitEntry {
  identifier: string;
  attempts: number[];
  lastUpdated: number;
}

export interface SuspiciousActivity {
  userId: string;
  flags: SuspiciousActivityFlag[];
  lastUpdated: number;
}

export interface AuditRecord {
  auditId: string;
  eventType: 'rating_submission' | 'account_creation' | 'account_migration' | 'login' | 'logout';
  userId: string;
  userAccountType: 'full' | 'cookie';
  businessId?: string;
  ratingId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface SuspiciousActivityFlag {
  flagId: string;
  userId: string;
  reason: string;
  evidence: any;
  ipAddress: string;
  timestamp: Date;
  status: 'active' | 'reviewed' | 'dismissed';
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

export interface RatingAuditData {
  userId: string;
  userAccountType: 'full' | 'cookie';
  businessId: string;
  ratingId: string;
  totalScore: number;
  welcomingLevel: string;
  surveyResponses: Record<string, number>;
}

export interface AccountAuditData {
  userId: string;
  accountType: 'full' | 'cookie';
  email?: string;
  registrationMethod: 'email' | 'cookie';
  demographicData?: Record<string, any>;
}

export interface SecurityStatistics {
  ratingSubmissions24h: number;
  accountCreations24h: number;
  ratingSubmissions7d: number;
  accountCreations7d: number;
  activeSuspiciousFlags: number;
  rateLimitedActions24h: number;
  averageRatingsPerUser: number;
  suspiciousActivityRate: number;
}

// Export singleton instance
export const securityService = SecurityService.getInstance();