import { collection, getDocs, query, where, limit, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { BusinessRating, UserProfile, CookieAccount } from '../types/firebase';
import { createFirestoreConverter, createFirestoreError } from '../utils/firestore';
import { RatingsService } from './ratings.service';

export interface ReviewWithUserInfo {
  rating: BusinessRating;
  userProfile?: UserProfile;
  cookieAccount?: CookieAccount;
  businessName?: string;
  userEmail?: string;
  userLocation?: string;
  ipGeolocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export interface ReviewFilter {
  ipAddress?: string;
  email?: string;
  location?: string;
  businessName?: string;
  userId?: string;
  businessId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
  maxScore?: number;
}

export interface BulkDeleteResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  errors: string[];
}

class AdminReviewsService {
  private static instance: AdminReviewsService;

  public static getInstance(): AdminReviewsService {
    if (!AdminReviewsService.instance) {
      AdminReviewsService.instance = new AdminReviewsService();
    }
    return AdminReviewsService.instance;
  }

  /**
   * Get reviews with user information and filtering
   */
  async getReviewsWithUserInfo(filter: ReviewFilter = {}, limitCount: number = 100): Promise<ReviewWithUserInfo[]> {
    try {
      console.log('🔍 Fetching reviews with filter:', filter);

      // Get all ratings first
      const ratings = await this.getFilteredRatings(filter, limitCount);
      console.log(`📊 Found ${ratings.length} ratings matching filter`);

      // Get user information for each rating
      const reviewsWithUserInfo: ReviewWithUserInfo[] = [];

      for (const rating of ratings) {
        const reviewInfo: ReviewWithUserInfo = {
          rating,
        };

        // Get user profile or cookie account
        try {
          const userProfile = await this.getUserProfile(rating.userId);
          if (userProfile) {
            reviewInfo.userProfile = userProfile;
            reviewInfo.userEmail = userProfile.accountType === 'full' ? await this.getUserEmail(rating.userId) : undefined;
            reviewInfo.userLocation = userProfile.location;
            
            // Get IP geolocation from user's IP history
            if (userProfile.ipAddressHistory && userProfile.ipAddressHistory.length > 0) {
              const latestIpEntry = userProfile.ipAddressHistory[0];
              reviewInfo.ipGeolocation = latestIpEntry.geolocation;
            }
          } else {
            // Try to get cookie account
            const cookieAccount = await this.getCookieAccount(rating.userId);
            if (cookieAccount) {
              reviewInfo.cookieAccount = cookieAccount;
            }
          }
        } catch (error) {
          console.warn(`Failed to get user info for ${rating.userId}:`, error);
        }

        // Get business name
        try {
          const businessName = await this.getBusinessName(rating.businessId);
          reviewInfo.businessName = businessName;
        } catch (error) {
          console.warn(`Failed to get business name for ${rating.businessId}:`, error);
        }

        reviewsWithUserInfo.push(reviewInfo);
      }

      // Apply business name filter after enriching data
      let filteredReviews = reviewsWithUserInfo;
      if (filter.businessName) {
        filteredReviews = reviewsWithUserInfo.filter(review => 
          review.businessName && 
          review.businessName.toLowerCase().includes(filter.businessName!.toLowerCase())
        );
        console.log(`🏢 Filtered to ${filteredReviews.length} reviews matching business name: ${filter.businessName}`);
      }

      // Apply email filter after enriching data
      if (filter.email) {
        filteredReviews = filteredReviews.filter(review => 
          review.userEmail && 
          review.userEmail.toLowerCase().includes(filter.email!.toLowerCase())
        );
        console.log(`📧 Filtered to ${filteredReviews.length} reviews matching email: ${filter.email}`);
      }

      // Apply location filter after enriching data
      if (filter.location) {
        filteredReviews = filteredReviews.filter(review => {
          const userLocation = review.userLocation?.toLowerCase() || '';
          const ipLocation = review.ipGeolocation ? 
            `${review.ipGeolocation.city || ''}, ${review.ipGeolocation.region || ''}`.toLowerCase() : '';
          
          return userLocation.includes(filter.location!.toLowerCase()) || 
                 ipLocation.includes(filter.location!.toLowerCase());
        });
        console.log(`📍 Filtered to ${filteredReviews.length} reviews matching location: ${filter.location}`);
      }

      console.log(`✅ Enriched and filtered ${filteredReviews.length} reviews with user info`);
      return filteredReviews;
    } catch (error) {
      throw createFirestoreError('getReviewsWithUserInfo', error, { filter });
    }
  }

  /**
   * Get filtered ratings from Firestore
   */
  private async getFilteredRatings(filter: ReviewFilter, limitCount: number): Promise<BusinessRating[]> {
    try {
      const ratingsRef = collection(db, 'ratings');
      let q = query(ratingsRef, limit(limitCount));

      // Apply filters
      if (filter.businessId) {
        q = query(ratingsRef, where('businessId', '==', filter.businessId), limit(limitCount));
      }

      if (filter.userId) {
        q = query(ratingsRef, where('userId', '==', filter.userId), limit(limitCount));
      }

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
      let ratings = querySnapshot.docs.map(doc => doc.data());

      // Apply additional filters manually (since Firestore has limited query capabilities)
      if (filter.ipAddress) {
        ratings = ratings.filter(rating => 
          rating.userIpAddress && rating.userIpAddress.includes(filter.ipAddress!)
        );
      }

      if (filter.dateFrom) {
        ratings = ratings.filter(rating => 
          rating.createdAt.getTime() >= filter.dateFrom!.getTime()
        );
      }

      if (filter.dateTo) {
        ratings = ratings.filter(rating => 
          rating.createdAt.getTime() <= filter.dateTo!.getTime()
        );
      }

      if (filter.minScore !== undefined) {
        ratings = ratings.filter(rating => rating.totalScore >= filter.minScore!);
      }

      if (filter.maxScore !== undefined) {
        ratings = ratings.filter(rating => rating.totalScore <= filter.maxScore!);
      }

      return ratings;
    } catch (error) {
      throw createFirestoreError('getFilteredRatings', error, { filter });
    }
  }

  /**
   * Get user profile by ID
   */
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profilesRef = collection(db, 'userProfiles');
      const q = query(profilesRef, where('userId', '==', userId), limit(1));
      
      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<UserProfile>()));
      return querySnapshot.empty ? null : querySnapshot.docs[0].data();
    } catch (error) {
      console.warn('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Get cookie account by ID
   */
  private async getCookieAccount(cookieId: string): Promise<CookieAccount | null> {
    try {
      const cookiesRef = collection(db, 'cookieAccounts');
      const q = query(cookiesRef, where('cookieId', '==', cookieId), limit(1));
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const data = querySnapshot.docs[0].data();
      return {
        cookieId,
        ipAddress: data.ipAddress,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || new Date(),
        accountType: 'cookie',
        isExpired: data.isExpired || false
      };
    } catch (error) {
      console.warn('Failed to get cookie account:', error);
      return null;
    }
  }

  /**
   * Get user email from Firebase Auth (mock implementation)
   */
  private async getUserEmail(userId: string): Promise<string | undefined> {
    try {
      // In a real implementation, you would query Firebase Auth
      // For now, we'll try to extract from user profile or return undefined
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', userId), limit(1));
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return userData.email;
      }
      
      return undefined;
    } catch (error) {
      console.warn('Failed to get user email:', error);
      return undefined;
    }
  }

  /**
   * Get business name by ID
   */
  private async getBusinessName(businessId: string): Promise<string | undefined> {
    try {
      const businessesRef = collection(db, 'businesses');
      const q = query(businessesRef, where('businessId', '==', businessId), limit(1));
      
      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<any>()));
      if (!querySnapshot.empty) {
        const business = querySnapshot.docs[0].data();
        return business.name;
      }
      
      return undefined;
    } catch (error) {
      console.warn('Failed to get business name:', error);
      return undefined;
    }
  }

  /**
   * Delete a single review and update business aggregation
   */
  async deleteReview(ratingId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting review: ${ratingId}`);
      
      // Get the rating first to know which business to update
      const ratingRef = doc(db, 'ratings', ratingId);
      const ratingDoc = await getDocs(query(collection(db, 'ratings'), where('ratingId', '==', ratingId), limit(1)));
      
      let businessId: string | null = null;
      if (!ratingDoc.empty) {
        const rating = ratingDoc.docs[0].data() as BusinessRating;
        businessId = rating.businessId;
      }
      
      // Delete the review
      await deleteDoc(ratingRef);
      console.log(`✅ Successfully deleted review: ${ratingId}`);
      
      // Update business aggregation if we know the business ID
      if (businessId) {
        try {
          console.log(`🔄 Updating business aggregation for: ${businessId}`);
          const ratingsService = RatingsService.getInstance();
          await ratingsService.updateBusinessAggregation(businessId);
          console.log(`✅ Updated business aggregation for: ${businessId}`);
        } catch (aggregationError) {
          console.warn(`⚠️ Failed to update business aggregation for ${businessId}:`, aggregationError);
          // Don't fail the entire operation if aggregation update fails
        }
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete review ${ratingId}:`, error);
      throw createFirestoreError('deleteReview', error, { ratingId });
    }
  }

  /**
   * Bulk delete reviews and update business aggregations
   */
  async bulkDeleteReviews(ratingIds: string[]): Promise<BulkDeleteResult> {
    try {
      console.log(`🗑️ Bulk deleting ${ratingIds.length} reviews`);
      
      // First, get all the ratings to know which businesses need updating
      const affectedBusinesses = new Set<string>();
      const ratingsToDelete: { ratingId: string; businessId: string }[] = [];
      
      console.log(`🔍 Fetching ratings to identify affected businesses...`);
      for (const ratingId of ratingIds) {
        try {
          const ratingQuery = query(collection(db, 'ratings'), where('ratingId', '==', ratingId), limit(1));
          const ratingDoc = await getDocs(ratingQuery);
          
          if (!ratingDoc.empty) {
            const rating = ratingDoc.docs[0].data() as BusinessRating;
            ratingsToDelete.push({ ratingId, businessId: rating.businessId });
            affectedBusinesses.add(rating.businessId);
          }
        } catch (error) {
          console.warn(`Failed to fetch rating ${ratingId}:`, error);
        }
      }
      
      console.log(`📊 Found ${affectedBusinesses.size} businesses that will be affected`);
      
      const errors: string[] = [];
      let deletedCount = 0;
      let failedCount = 0;

      // Delete reviews in batches (max 500 operations per batch)
      const batchSize = 500;
      const batches: string[][] = [];
      
      for (let i = 0; i < ratingIds.length; i += batchSize) {
        batches.push(ratingIds.slice(i, i + batchSize));
      }

      for (const batchIds of batches) {
        const currentBatch = writeBatch(db);
        
        for (const ratingId of batchIds) {
          try {
            const ratingRef = doc(db, 'ratings', ratingId);
            currentBatch.delete(ratingRef);
          } catch (error) {
            errors.push(`Failed to prepare delete for ${ratingId}: ${error}`);
            failedCount++;
          }
        }

        try {
          await currentBatch.commit();
          deletedCount += batchIds.length;
          console.log(`✅ Batch deleted ${batchIds.length} reviews`);
        } catch (error) {
          errors.push(`Batch commit failed: ${error}`);
          failedCount += batchIds.length;
        }
      }

      // Update business aggregations for all affected businesses
      console.log(`🔄 Updating aggregations for ${affectedBusinesses.size} businesses...`);
      const ratingsService = RatingsService.getInstance();
      let aggregationUpdateCount = 0;
      let businessesDeleted = 0;
      
      for (const businessId of affectedBusinesses) {
        try {
          // Check if business will have any ratings left after deletion
          const remainingRatings = await this.getRemainingRatingsCount(businessId, ratingIds);
          
          await ratingsService.updateBusinessAggregation(businessId);
          aggregationUpdateCount++;
          
          if (remainingRatings === 0) {
            businessesDeleted++;
            console.log(`🗑️ Deleted business ${businessId} from database (no ratings remaining)`);
          } else {
            console.log(`✅ Updated aggregation for business ${businessId} (${remainingRatings} ratings remaining)`);
          }
        } catch (aggregationError) {
          console.warn(`⚠️ Failed to update aggregation for business ${businessId}:`, aggregationError);
          errors.push(`Failed to update aggregation for business ${businessId}: ${aggregationError}`);
        }
      }

      if (businessesDeleted > 0) {
        console.log(`🗑️ Deleted ${businessesDeleted} businesses from database (all reviews removed)`);
      }

      const result: BulkDeleteResult = {
        success: failedCount === 0,
        deletedCount,
        failedCount,
        errors
      };

      console.log(`🎯 Bulk delete completed:`);
      console.log(`   📊 Reviews deleted: ${deletedCount}`);
      console.log(`   ❌ Reviews failed: ${failedCount}`);
      console.log(`   🔄 Businesses updated: ${aggregationUpdateCount}/${affectedBusinesses.size}`);
      
      return result;
    } catch (error) {
      throw createFirestoreError('bulkDeleteReviews', error, { count: ratingIds.length });
    }
  }

  /**
   * Get reviews by IP address
   */
  async getReviewsByIP(ipAddress: string, limitCount: number = 50): Promise<ReviewWithUserInfo[]> {
    return this.getReviewsWithUserInfo({ ipAddress }, limitCount);
  }

  /**
   * Get reviews by email
   */
  async getReviewsByEmail(email: string, limitCount: number = 50): Promise<ReviewWithUserInfo[]> {
    return this.getReviewsWithUserInfo({ email }, limitCount);
  }

  /**
   * Get reviews by location
   */
  async getReviewsByLocation(location: string, limitCount: number = 50): Promise<ReviewWithUserInfo[]> {
    return this.getReviewsWithUserInfo({ location }, limitCount);
  }

  /**
   * Get count of remaining ratings for a business after deletions
   */
  private async getRemainingRatingsCount(businessId: string, ratingIdsToDelete: string[]): Promise<number> {
    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(ratingsRef, where('businessId', '==', businessId), limit(1000));
      
      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
      const allRatings = querySnapshot.docs.map(doc => doc.data());
      
      // Filter out ratings that will be deleted
      const remainingRatings = allRatings.filter(rating => 
        !ratingIdsToDelete.includes(rating.ratingId)
      );
      
      return remainingRatings.length;
    } catch (error) {
      console.warn(`Failed to count remaining ratings for ${businessId}:`, error);
      return 0; // Assume no ratings remaining if we can't count
    }
  }

  /**
   * Refresh business aggregations for all businesses
   */
  async refreshAllBusinessAggregations(): Promise<{ updated: number; failed: number; errors: string[] }> {
    try {
      console.log('🔄 Refreshing all business aggregations...');
      
      // Get all businesses
      const businessesRef = collection(db, 'businesses');
      const businessQuery = query(businessesRef, limit(1000));
      const businessSnapshot = await getDocs(businessQuery);
      
      const businesses = businessSnapshot.docs.map(doc => doc.data());
      console.log(`📊 Found ${businesses.length} businesses to update`);
      
      const ratingsService = RatingsService.getInstance();
      let updated = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (const business of businesses) {
        try {
          await ratingsService.updateBusinessAggregation(business.businessId);
          updated++;
          
          if (updated % 10 === 0) {
            console.log(`✅ Updated ${updated}/${businesses.length} businesses`);
          }
        } catch (error) {
          failed++;
          const errorMsg = `Failed to update ${business.businessId}: ${error}`;
          errors.push(errorMsg);
          console.warn(errorMsg);
        }
      }
      
      console.log(`🎯 Aggregation refresh completed: ${updated} updated, ${failed} failed`);
      return { updated, failed, errors };
    } catch (error) {
      throw createFirestoreError('refreshAllBusinessAggregations', error);
    }
  }

  /**
   * Get suspicious review patterns
   */
  async getSuspiciousReviews(): Promise<{
    duplicateIPs: ReviewWithUserInfo[];
    rapidReviews: ReviewWithUserInfo[];
    extremeScores: ReviewWithUserInfo[];
  }> {
    try {
      console.log('🔍 Analyzing suspicious review patterns...');

      // Get all recent reviews with more comprehensive data
      const allReviews = await this.getReviewsWithUserInfo({}, 2000);
      console.log(`📊 Analyzing ${allReviews.length} reviews for suspicious patterns`);

      if (allReviews.length === 0) {
        console.log('⚠️ No reviews found for analysis');
        return {
          duplicateIPs: [],
          rapidReviews: [],
          extremeScores: []
        };
      }

      // Find duplicate IPs (lowered threshold for testing)
      const ipCounts: { [ip: string]: ReviewWithUserInfo[] } = {};
      let reviewsWithIPs = 0;
      
      allReviews.forEach(review => {
        const ip = review.rating.userIpAddress;
        if (ip && ip !== '0.0.0.0' && ip !== 'unknown') {
          reviewsWithIPs++;
          if (!ipCounts[ip]) ipCounts[ip] = [];
          ipCounts[ip].push(review);
        }
      });

      console.log(`📍 Found ${reviewsWithIPs} reviews with valid IP addresses`);
      console.log(`📍 Unique IPs: ${Object.keys(ipCounts).length}`);

      // Lower threshold for duplicate IPs to catch more patterns
      const duplicateIPs = Object.entries(ipCounts)
        .filter(([ip, reviews]) => {
          const count = reviews.length;
          if (count > 3) { // More than 3 reviews from same IP
            console.log(`🚨 Suspicious IP ${ip}: ${count} reviews`);
            return true;
          }
          return false;
        })
        .map(([ip, reviews]) => reviews)
        .flat();

      // Find rapid reviews (more than 5 reviews in 24 hours - lowered threshold)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Check both 24 hours and 7 days for different patterns
      const userReviewCounts24h: { [userId: string]: ReviewWithUserInfo[] } = {};
      const userReviewCounts7d: { [userId: string]: ReviewWithUserInfo[] } = {};
      
      allReviews.forEach(review => {
        const userId = review.rating.userId;
        const reviewTime = review.rating.createdAt.getTime();
        
        // 24 hour window
        if (reviewTime >= oneDayAgo.getTime()) {
          if (!userReviewCounts24h[userId]) userReviewCounts24h[userId] = [];
          userReviewCounts24h[userId].push(review);
        }
        
        // 7 day window
        if (reviewTime >= oneWeekAgo.getTime()) {
          if (!userReviewCounts7d[userId]) userReviewCounts7d[userId] = [];
          userReviewCounts7d[userId].push(review);
        }
      });

      // Find rapid reviewers (5+ in 24h or 15+ in 7 days)
      const rapidReviews: ReviewWithUserInfo[] = [];
      
      Object.entries(userReviewCounts24h).forEach(([userId, reviews]) => {
        if (reviews.length >= 5) {
          console.log(`⚡ Rapid reviewer ${userId}: ${reviews.length} reviews in 24h`);
          rapidReviews.push(...reviews);
        }
      });
      
      Object.entries(userReviewCounts7d).forEach(([userId, reviews]) => {
        if (reviews.length >= 15) {
          console.log(`⚡ Heavy reviewer ${userId}: ${reviews.length} reviews in 7 days`);
          // Only add if not already added from 24h check
          const alreadyAdded = rapidReviews.some(r => r.rating.userId === userId);
          if (!alreadyAdded) {
            rapidReviews.push(...reviews);
          }
        }
      });

      // Find extreme scores (lowered thresholds)
      const extremeScores = allReviews.filter(review => {
        const score = review.rating.totalScore;
        // Catch more extreme patterns
        return score <= 1.0 || score >= 4.0;
      });

      // Additional suspicious patterns
      const sameBusinessMultipleReviews: { [key: string]: ReviewWithUserInfo[] } = {};
      allReviews.forEach(review => {
        const key = `${review.rating.userId}_${review.rating.businessId}`;
        if (!sameBusinessMultipleReviews[key]) sameBusinessMultipleReviews[key] = [];
        sameBusinessMultipleReviews[key].push(review);
      });

      // Find users who reviewed the same business multiple times
      const multipleReviewsSameBusiness = Object.values(sameBusinessMultipleReviews)
        .filter(reviews => reviews.length > 1)
        .flat();

      console.log(`🚨 Suspicious patterns found:`);
      console.log(`   🔄 Duplicate IPs: ${duplicateIPs.length} reviews from ${Object.keys(ipCounts).filter(ip => ipCounts[ip].length > 3).length} IPs`);
      console.log(`   ⚡ Rapid reviews: ${rapidReviews.length} reviews from rapid reviewers`);
      console.log(`   📊 Extreme scores: ${extremeScores.length} reviews with extreme scores`);
      console.log(`   🔁 Multiple reviews same business: ${multipleReviewsSameBusiness.length} reviews`);

      // Combine rapid reviews with multiple reviews of same business for more comprehensive detection
      const allRapidReviews = [...new Set([...rapidReviews, ...multipleReviewsSameBusiness])];

      return {
        duplicateIPs,
        rapidReviews: allRapidReviews,
        extremeScores
      };
    } catch (error) {
      console.error('❌ Error analyzing suspicious reviews:', error);
      throw createFirestoreError('getSuspiciousReviews', error);
    }
  }
}

export const adminReviewsService = AdminReviewsService.getInstance();