import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { errorHandlingService } from './errorHandling.service';
import { securityService } from './security.service';
import { ipAddressService } from './ipAddress.service';
import {
  Business,
  BusinessRating,
  RatingAggregation
} from '../types/firebase';
import {
  createFirestoreConverter,
  createFirestoreError,
  generateDocumentId,
  sanitizeForFirestore,
  validateRequiredFields
} from '../utils/firestore';
import { FirebaseAppError } from '../utils/firebase-errors';
import { scoringConfigService, ScoringConfiguration } from './scoringConfig.service';
import { notificationService } from './notification.service';
import { reviewCookiesService } from './reviewCookies.service';

/**
 * Survey response interface
 */
export interface SurveyResponses {
  trumpWelcome: number; // 0 to 0.833 (scaled)
  obamaWelcome: number; // 0 to 0.833 (scaled)
  personOfColorComfort: number; // 0 to 0.833 (scaled)
  lgbtqSafety: number; // 0 to 0.833 (scaled)
  undocumentedSafety: number; // 0 to 0.833 (scaled)
  firearmNormal: number; // 0 to 0.833 (scaled)
}

/**
 * Scoring configuration interface
 */
export interface ScoringConfig {
  responseValues: {
    yes: number;        // 0.833
    probably: number;   // 0.56
    probablyNot: number; // 0.28
    no: number;         // 0
  };
  maxPossibleScore: number; // Configurable based on number of questions
  questionCount: number;    // Number of questions in survey
}

/**
 * Response option values
 */
export const DEFAULT_RESPONSE_VALUES = {
  yes: 0.833, // Adjusted to make max score 5.0 (6 questions × 0.833 = 5.0)
  probably: 0.56,
  probablyNot: 0.28,
  no: 0
} as const;

/**
 * Survey questions configuration
 */
export const SURVEY_QUESTIONS = [
  {
    id: 'trumpWelcome',
    text: "Would President Trump be welcome in this establishment?",
    reverseScored: true,
    firebaseKey: 'trumpWelcome' as keyof SurveyResponses
  },
  {
    id: 'obamaWelcome',
    text: "Would President Obama be welcome in this establishment?",
    reverseScored: false,
    firebaseKey: 'obamaWelcome' as keyof SurveyResponses
  },
  {
    id: 'personOfColorComfort',
    text: "Would a person of color feel comfortable in this establishment?",
    reverseScored: false,
    firebaseKey: 'personOfColorComfort' as keyof SurveyResponses
  },
  {
    id: 'lgbtqSafety',
    text: "Would a member of the LGBTQ community feel safe in this establishment?",
    reverseScored: false,
    firebaseKey: 'lgbtqSafety' as keyof SurveyResponses
  },
  {
    id: 'undocumentedSafety',
    text: "Would an undocumented individual feel safe in this establishment?",
    reverseScored: false,
    firebaseKey: 'undocumentedSafety' as keyof SurveyResponses
  },
  {
    id: 'firearmNormal',
    text: "Would a person carrying a firearm be normal in this establishment?",
    reverseScored: true,
    firebaseKey: 'firearmNormal' as keyof SurveyResponses
  },
] as const;

/**
 * Welcoming level type
 */
export type WelcomingLevel = 'very-welcoming' | 'moderately-welcoming' | 'not-welcoming';

/**
 * Ratings Service
 * Handles business creation, rating submission, and aggregation
 */
export class RatingsService {
  private static instance: RatingsService;

  public static getInstance(): RatingsService {
    if (!RatingsService.instance) {
      RatingsService.instance = new RatingsService();
    }
    return RatingsService.instance;
  }

  /**
   * Create a new business from Google Places data
   */
  async createBusiness(googlePlacesData: any): Promise<Business> {
    try {
      const businessId = googlePlacesData.place_id;

      if (!businessId) {
        throw new Error('Place ID is required to create a business');
      }

      // Check if business already exists
      const existingBusiness = await this.getBusiness(businessId);
      if (existingBusiness) {
        return existingBusiness;
      }

      // Validate required Google Places data
      if (!googlePlacesData.geometry || !googlePlacesData.geometry.location) {
        throw new Error('Place geometry data is required. Please select a place from the suggestions.');
      }

      let latitude: number, longitude: number;

      // Handle both function-based and object-based location data
      if (typeof googlePlacesData.geometry.location.lat === 'function') {
        latitude = googlePlacesData.geometry.location.lat();
        longitude = googlePlacesData.geometry.location.lng();
      } else {
        latitude = googlePlacesData.geometry.location.lat;
        longitude = googlePlacesData.geometry.location.lng;
      }

      if (!latitude || !longitude) {
        throw new Error('Valid location coordinates are required');
      }

      // Sanitize Google Places data to remove functions and non-serializable data
      const sanitizedGooglePlacesData = {
        place_id: googlePlacesData.place_id,
        name: googlePlacesData.name,
        formatted_address: googlePlacesData.formatted_address,
        vicinity: googlePlacesData.vicinity,
        types: googlePlacesData.types,
        rating: googlePlacesData.rating,
        user_ratings_total: googlePlacesData.user_ratings_total,
        price_level: googlePlacesData.price_level,
        website: googlePlacesData.website,
        formatted_phone_number: googlePlacesData.formatted_phone_number,
        geometry: {
          location: {
            lat: latitude,
            lng: longitude
          }
        },
        // Add any other serializable fields as needed
        opening_hours: googlePlacesData.opening_hours ? {
          open_now: googlePlacesData.opening_hours.open_now,
          weekday_text: googlePlacesData.opening_hours.weekday_text
        } : undefined
      };

      const business: Business = {
        businessId,
        name: googlePlacesData.name || 'Unknown Business',
        address: googlePlacesData.formatted_address || googlePlacesData.vicinity || 'Unknown Address',
        location: {
          latitude,
          longitude
        },
        googlePlacesData: sanitizedGooglePlacesData,
        averageScore: null,
        totalRatings: 0,
        ratingBreakdown: {
          veryWelcoming: 0,
          moderatelyWelcoming: 0,
          notWelcoming: 0
        },
        status: 'neutral',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate required fields
      validateRequiredFields(business, ['businessId', 'name', 'address', 'location']);

      // Save to Firestore
      const converter = createFirestoreConverter<Business>();
      await setDoc(
        doc(db, 'businesses', businessId).withConverter(converter),
        sanitizeForFirestore(business)
      );

      return business;
    } catch (error) {
      throw createFirestoreError('createBusiness', error, { googlePlacesData });
    }
  }

  /**
   * Get business by ID
   */
  async getBusiness(businessId: string): Promise<Business | null> {
    try {
      const businessRef = doc(db, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef.withConverter(createFirestoreConverter<Business>()));

      return businessDoc.exists() ? businessDoc.data() : null;
    } catch (error) {
      throw createFirestoreError('getBusiness', error, { businessId });
    }
  }

  /**
   * Get businesses by location within radius (in kilometers)
   */
  async getBusinessesByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limitCount: number = 50
  ): Promise<Business[]> {
    try {
      // Calculate approximate bounding box for the radius
      const latDelta = radiusKm / 111; // Rough conversion: 1 degree ≈ 111 km
      const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

      const minLat = latitude - latDelta;
      const maxLat = latitude + latDelta;
      const minLng = longitude - lngDelta;
      const maxLng = longitude + lngDelta;

      // Query businesses within bounding box
      const businessesRef = collection(db, 'businesses');
      const q = query(
        businessesRef,
        where('location.latitude', '>=', minLat),
        where('location.latitude', '<=', maxLat),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<Business>()));
      const businesses = querySnapshot.docs.map(doc => doc.data());

      // Filter by longitude and exact distance
      return businesses.filter(business => {
        const distance = this.calculateDistance(
          { latitude, longitude },
          { latitude: business.location.latitude, longitude: business.location.longitude }
        );
        return distance <= radiusKm &&
          business.location.longitude >= minLng &&
          business.location.longitude <= maxLng;
      });
    } catch (error) {
      throw createFirestoreError('getBusinessesByLocation', error, { latitude, longitude, radiusKm });
    }
  }

  /**
   * Submit a rating for a business with security checks
   */
  async submitRating(
    businessId: string,
    userId: string,
    userAccountType: 'full' | 'cookie' | 'anonymous',
    responses: SurveyResponses,
    userIpAddress?: string
  ): Promise<BusinessRating> {
    return await errorHandlingService.executeOperation(async () => {
      // Check if this device has already reviewed this business
      if (reviewCookiesService.hasReviewedBusiness(businessId)) {
        console.log('🍪 COOKIE-BLOCK: This device has already reviewed this business');
        throw new Error('This device has already reviewed this business. Each device can only review a business once.');
      }

      // Check for existing rating first - if found, automatically update instead of throwing error
      const existingRating = await this.getUserRatingForBusiness(businessId, userId);
      if (existingRating) {
        console.log('🔄 AUTO-UPDATE: Found existing rating, automatically updating instead of creating new:', existingRating.ratingId);

        // Automatically call updateRating instead of throwing an error
        return await this.updateRating(
          existingRating.ratingId,
          businessId,
          userId,
          userAccountType,
          responses,
          userIpAddress
        );
      }

      // Validate responses
      this.validateSurveyResponses(responses);

      // Get IP address if not provided (optional for anonymous users)
      let ipAddress = userIpAddress;
      if (!ipAddress) {
        try {
          ipAddress = await ipAddressService.getCurrentIPAddress();
        } catch (error) {
          console.warn('Failed to get IP address for rating:', error);
          ipAddress = '0.0.0.0'; // Fallback for anonymous users
        }
      }

      // Calculate total score and welcoming level
      const totalScore = Object.values(responses).reduce((sum, score) => sum + score, 0);
      const welcomingLevel = await this.calculateWelcomingLevel(totalScore);

      const ratingId = generateDocumentId();
      const rating: BusinessRating = {
        ratingId,
        businessId,
        userId,
        userAccountType,
        responses,
        totalScore,
        welcomingLevel,
        createdAt: new Date(),
        userIpAddress: ipAddress || '0.0.0.0'
      };

      // Save rating to Firestore
      const converter = createFirestoreConverter<BusinessRating>();
      await setDoc(
        doc(db, 'ratings', ratingId).withConverter(converter),
        sanitizeForFirestore(rating)
      );

      // Update business aggregation (with error handling for missing indexes)
      try {
        await this.updateBusinessAggregation(businessId);
      } catch (aggregationError) {
        console.warn('Failed to update business aggregation (likely missing index):', aggregationError);
        // Don't fail the entire rating submission if aggregation fails
        // The rating is still saved, just the aggregation will be updated later
      }

      // Trigger notifications for score updates
      try {
        console.log('🎉 Rating submitted successfully! Triggering notifications...');
        const business = await this.getBusiness(businessId);
        if (business) {
          console.log(`📊 Business found: ${business.name}`);

          // Notify about score update for this business (Fire and forget)
          notificationService.notifyScoreUpdate(
            userId,
            business.name,
            businessId,
            business.averageScore || 0,
            totalScore
          ).catch(err => console.error('❌ Failed to send score update notification:', err));

          console.log('✅ Score update notification initiated');

          // Check and unlock achievements (Fire and forget)
          this.calculateUserStats(userId).then(async (userStats) => {
            try {
              const achievementsService = (await import('./achievements.service')).achievementsService;
              const unlockedAchievements = await achievementsService.checkAndUnlockAchievements(userId, userStats);

              if (unlockedAchievements.length > 0) {
                console.log(`🏆 Unlocked ${unlockedAchievements.length} achievements:`, unlockedAchievements.map(a => a.title));

                // Notify about each unlocked achievement
                for (const achievement of unlockedAchievements) {
                  await notificationService.notifyAchievement(
                    userId,
                    achievement.title,
                    achievement.description
                  );
                }
              }
            } catch (achievementError) {
              console.error('❌ Failed to check achievements:', achievementError);
            }
          });

          // Notify nearby users about this new rating (Fire and forget)
          this.notifyNearbyUsers(businessId, business, totalScore)
            .catch(err => console.error('❌ Failed to send nearby notifications:', err));

          console.log('📍 Nearby user notifications initiated');

          console.log('🎉 notification processes initiated successfully!');
        } else {
          console.warn('⚠️ Business not found, skipping notifications');
        }
      } catch (notificationError) {
        console.error('❌ Error initiating notifications:', notificationError);
      }

      // Mark this business as reviewed on this device
      try {
        reviewCookiesService.markBusinessAsReviewed(businessId, userId);
        console.log('🍪 Marked business as reviewed on this device');
      } catch (cookieError) {
        console.warn('Failed to set review cookie (non-critical):', cookieError);
        // Don't fail the rating submission if cookie setting fails
      }

      return rating;
    }, {
      operationName: 'ratings.submitRating',
      retryOptions: {
        maxRetries: 2,
        baseDelay: 1000
      }
    });
  }

  /**
   * Calculate user statistics for achievement checking
   */
  async calculateUserStats(userId: string): Promise<{
    averageScore: number;
    totalRatings: number;
    uniqueBusinesses: number;
    businessesHelped: number;
    highestScore: number;
  }> {
    try {
      const userRatings = await this.getUserRatings(userId);

      if (userRatings.length === 0) {
        return {
          averageScore: 0,
          totalRatings: 0,
          uniqueBusinesses: 0,
          businessesHelped: 0,
          highestScore: 0
        };
      }

      const totalScore = userRatings.reduce((sum, rating) => sum + rating.totalScore, 0);
      const averageScore = totalScore / userRatings.length;
      const uniqueBusinesses = new Set(userRatings.map(r => r.businessId)).size;
      const businessesHelped = userRatings.filter(r => r.totalScore >= 4.0).length;
      const highestScore = Math.max(...userRatings.map(r => r.totalScore));

      return {
        averageScore,
        totalRatings: userRatings.length,
        uniqueBusinesses,
        businessesHelped,
        highestScore
      };
    } catch (error) {
      console.error('Failed to calculate user stats:', error);
      return {
        averageScore: 0,
        totalRatings: 0,
        uniqueBusinesses: 0,
        businessesHelped: 0,
        highestScore: 0
      };
    }
  }

  /**
   * Get all ratings for a business
   */
  async getBusinessRatings(businessId: string, limitCount: number = 100): Promise<BusinessRating[]> {
    try {
      const ratingsRef = collection(db, 'ratings');

      // Try the full query first
      try {
        const q = query(
          ratingsRef,
          where('businessId', '==', businessId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );

        const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
        return querySnapshot.docs.map(doc => doc.data());
      } catch (indexError) {
        console.warn('Index-based query failed, trying simple query:', indexError);

        // Fallback to simple query without orderBy if index is missing
        const simpleQ = query(
          ratingsRef,
          where('businessId', '==', businessId),
          limit(limitCount)
        );

        const querySnapshot = await getDocs(simpleQ.withConverter(createFirestoreConverter<BusinessRating>()));
        const ratings = querySnapshot.docs.map(doc => doc.data());

        // Sort manually by createdAt
        return ratings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
    } catch (error) {
      throw createFirestoreError('getBusinessRatings', error, { businessId });
    }
  }

  /**
   * Notify nearby users about a new rating within 1 mile radius
   */
  private async notifyNearbyUsers(businessId: string, business: Business, ratingScore: number): Promise<void> {
    try {
      // Get business coordinates
      const businessCoords = this.getBusinessCoordinates(business);
      if (!businessCoords) {
        console.log(`No coordinates available for ${business.name}, skipping nearby notifications`);
        return;
      }

      // Get all ratings to find users who have rated nearby businesses
      const allRatings = await this.getAllRatings();
      const nearbyUsers = new Set<string>();
      const ONE_MILE_RADIUS = 1.0;

      // Find users who have rated businesses within 1 mile
      for (const rating of allRatings) {
        try {
          const otherBusiness = await this.getBusiness(rating.businessId);
          if (otherBusiness) {
            const otherCoords = this.getBusinessCoordinates(otherBusiness);
            if (otherCoords) {
              const distance = this.calculateDistance(businessCoords, otherCoords);
              if (distance <= ONE_MILE_RADIUS) {
                nearbyUsers.add(rating.userId);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to check business ${rating.businessId} for nearby detection:`, error);
        }
      }

      // Limit to 10 nearby users to prevent spam
      const limitedNearbyUsers = Array.from(nearbyUsers).slice(0, 10);

      if (limitedNearbyUsers.length > 0) {
        console.log(`Found ${limitedNearbyUsers.length} nearby users for ${business.name}`);

        // Notify each nearby user
        for (const userId of limitedNearbyUsers) {
          try {
            const distance = this.calculateDistance(businessCoords, this.getBusinessCoordinates(business)!);
            await notificationService.notifyNearbyRating(
              userId,
              business.name,
              businessId,
              ratingScore,
              distance
            );
          } catch (error) {
            console.warn(`Failed to notify nearby user ${userId}:`, error);
          }
        }
      } else {
        console.log(`No nearby users found for ${business.name}`);
      }
    } catch (error) {
      console.warn('Failed to notify nearby users:', error);
    }
  }

  /**
   * Get business coordinates from various possible fields
   */
  private getBusinessCoordinates(business: Business): { latitude: number; longitude: number } | null {
    // Try different possible location fields
    const locationFields = [
      business.location,
      (business as any).coordinates,
      business.address,
      (business as any).geometry?.location,
    ];

    for (const field of locationFields) {
      if (field) {
        if (typeof field === 'string') {
          const coords = this.parseCoordinatesFromString(field);
          if (coords) return coords;
        } else if (field.latitude && field.longitude) {
          return {
            latitude: field.latitude,
            longitude: field.longitude
          };
        } else if ((field as any).lat && (field as any).lng) {
          return {
            latitude: (field as any).lat,
            longitude: (field as any).lng
          };
        }
      }
    }

    return null;
  }

  /**
   * Parse coordinates from a string
   */
  private parseCoordinatesFromString(locationString: string): { latitude: number; longitude: number } | null {
    const coordPatterns = [
      /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
      /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/,
    ];

    for (const pattern of coordPatterns) {
      const match = locationString.match(pattern);
      if (match) {
        const lat = parseFloat(match[1] || '0');
        const lng = parseFloat(match[2] || '0');

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { latitude: lat, longitude: lng };
        }
      }
    }

    return null;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(coord1: { latitude: number; longitude: number }, coord2: { latitude: number; longitude: number }): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(Number(coord2.latitude) - Number(coord1.latitude));
    const dLon = this.toRadians(Number(coord2.longitude) - Number(coord1.longitude));

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(Number(coord1.latitude))) * Math.cos(this.toRadians(Number(coord2.latitude))) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get all ratings (for nearby user detection)
   */
  private async getAllRatings(): Promise<BusinessRating[]> {
    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(ratingsRef, limit(1000)); // Limit to avoid performance issues

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn('Failed to get all ratings for nearby notifications:', error);
      return [];
    }
  }

  /**
   * Get all ratings by a user
   */
  async getUserRatings(userId: string, limitCount: number = 100): Promise<BusinessRating[]> {
    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(
        ratingsRef,
        where('userId', '==', userId),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
      const ratings = querySnapshot.docs.map(doc => doc.data());

      // Sort in memory to avoid requiring a composite index
      return ratings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      throw createFirestoreError('getUserRatings', error, { userId });
    }
  }

  /**
   * Get user's rating for a specific business
   */
  async getUserRatingForBusiness(businessId: string, userId: string): Promise<BusinessRating | null> {
    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(
        ratingsRef,
        where('businessId', '==', businessId),
        where('userId', '==', userId),
        limit(1)
      );

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
      return querySnapshot.empty ? null : querySnapshot.docs[0].data();
    } catch (error) {
      throw createFirestoreError('getUserRatingForBusiness', error, { businessId, userId });
    }
  }

  /**
   * Update an existing rating for a business
   */
  async updateRating(
    ratingId: string,
    businessId: string,
    userId: string,
    userAccountType: 'full' | 'cookie' | 'anonymous',
    responses: SurveyResponses,
    userIpAddress?: string
  ): Promise<BusinessRating> {
    return await errorHandlingService.executeOperation(async () => {
      // Check if this device has reviewed this business (for updates, we allow it but log it)
      if (!reviewCookiesService.hasReviewedBusiness(businessId)) {
        console.log('🍪 UPDATE-WARNING: This device is updating a review for a business it hasn\'t reviewed before');
        // Don't block the update, but mark the business as reviewed now
        reviewCookiesService.markBusinessAsReviewed(businessId, userId);
      }

      // Validate responses
      this.validateSurveyResponses(responses);

      // Get IP address if not provided
      let ipAddress = userIpAddress;
      if (!ipAddress) {
        try {
          ipAddress = await ipAddressService.getCurrentIPAddress();
        } catch (error) {
          console.warn('Failed to get IP address for rating update:', error);
          ipAddress = '0.0.0.0';
        }
      }

      // Calculate total score and welcoming level
      const totalScore = Object.values(responses).reduce((sum, score) => sum + score, 0);
      const welcomingLevel = await this.calculateWelcomingLevel(totalScore);

      const updatedRating: BusinessRating = {
        ratingId,
        businessId,
        userId,
        userAccountType,
        responses,
        totalScore,
        welcomingLevel,
        createdAt: new Date(), // Keep original creation date in practice, but this will be overwritten
        updatedAt: new Date(), // Add updated timestamp
        userIpAddress: ipAddress || '0.0.0.0'
      };

      // Update rating in Firestore
      const ratingRef = doc(db, 'ratings', ratingId);
      await updateDoc(ratingRef, {
        responses: sanitizeForFirestore(responses),
        totalScore,
        welcomingLevel,
        updatedAt: serverTimestamp(),
        userIpAddress: ipAddress || '0.0.0.0'
      });

      // Update business aggregation
      try {
        await this.updateBusinessAggregation(businessId);
      } catch (aggregationError) {
        console.warn('Failed to update business aggregation after rating update:', aggregationError);
      }

      // Trigger notifications for score updates
      try {
        console.log('🔄 Rating updated successfully! Triggering notifications...');
        const business = await this.getBusiness(businessId);
        if (business) {
          // Notify about score update for this business (Fire and forget)
          notificationService.notifyScoreUpdate(
            userId,
            business.name,
            businessId,
            business.averageScore || 0,
            totalScore
          ).catch(err => console.error('❌ Failed to send score update notification for edit:', err));

          console.log('✅ Score update notification initiated for rating edit');
        }
      } catch (notificationError) {
        console.error('❌ Error initiating notifications for rating update:', notificationError);
      }

      // Get the updated rating to return
      const updatedRatingDoc = await getDoc(ratingRef.withConverter(createFirestoreConverter<BusinessRating>()));
      return updatedRatingDoc.data() || updatedRating;
    }, {
      operationName: 'ratings.updateRating',
      retryOptions: {
        maxRetries: 2,
        baseDelay: 1000
      }
    });
  }

  /**
   * Update business rating aggregation
   */
  async updateBusinessAggregation(businessId: string): Promise<void> {
    try {
      const ratings = await this.getBusinessRatings(businessId);

      if (ratings.length === 0) {
        // Delete business document when no ratings exist
        console.log(`🗑️ Deleting business ${businessId} (no ratings remaining)`);

        try {
          // Delete business document
          const businessRef = doc(db, 'businesses', businessId);
          await deleteDoc(businessRef);
          console.log(`✅ Deleted business document: ${businessId}`);

          // Delete aggregation document
          const aggregationRef = doc(db, 'ratingAggregations', businessId);
          await deleteDoc(aggregationRef);
          console.log(`✅ Deleted aggregation document: ${businessId}`);

          console.log(`🎯 Successfully removed business ${businessId} from database`);
        } catch (deleteError) {
          console.error(`❌ Failed to delete business ${businessId}:`, deleteError);
          // If deletion fails, fall back to resetting to neutral state
          console.log(`🔄 Falling back to neutral state reset for business ${businessId}`);

          const businessRef = doc(db, 'businesses', businessId);
          await updateDoc(businessRef, {
            averageScore: null,
            totalRatings: 0,
            ratingBreakdown: {
              veryWelcoming: 0,
              moderatelyWelcoming: 0,
              notWelcoming: 0
            },
            status: 'neutral',
            updatedAt: serverTimestamp()
          });

          console.log(`✅ Reset business ${businessId} to neutral state as fallback`);
        }

        return;
      }

      // Calculate aggregation for businesses with ratings
      const totalRatings = ratings.length;
      const totalScore = ratings.reduce((sum, rating) => sum + rating.totalScore, 0);
      const averageScore = totalScore / totalRatings;

      const ratingBreakdown = {
        veryWelcoming: ratings.filter(r => r.welcomingLevel === 'very-welcoming').length,
        moderatelyWelcoming: ratings.filter(r => r.welcomingLevel === 'moderately-welcoming').length,
        notWelcoming: ratings.filter(r => r.welcomingLevel === 'not-welcoming').length
      };

      // Update business document
      const businessRef = doc(db, 'businesses', businessId);
      await updateDoc(businessRef, {
        averageScore,
        totalRatings,
        ratingBreakdown,
        status: 'rated',
        updatedAt: serverTimestamp()
      });

      // Create/update aggregation document
      const aggregation: RatingAggregation = {
        businessId,
        totalRatings,
        averageScore,
        scoreDistribution: ratingBreakdown,
        lastUpdated: new Date()
      };

      const aggregationRef = doc(db, 'ratingAggregations', businessId);
      await setDoc(
        aggregationRef.withConverter(createFirestoreConverter<RatingAggregation>()),
        sanitizeForFirestore(aggregation)
      );

      console.log(`✅ Updated business ${businessId} aggregation: ${totalRatings} ratings, avg ${averageScore.toFixed(2)}`);
    } catch (error) {
      throw createFirestoreError('updateBusinessAggregation', error, { businessId });
    }
  }

  /**
   * Calculate welcoming level from total score (configurable scoring system)
   */
  async calculateWelcomingLevel(totalScore: number): Promise<WelcomingLevel> {
    try {
      const config = await scoringConfigService.getActiveScoringConfig();

      if (!config) {
        // Fallback to default thresholds if no config is available
        const maxScore = SURVEY_QUESTIONS.length * DEFAULT_RESPONSE_VALUES.yes;
        const highThreshold = maxScore * 0.7;
        const lowThreshold = maxScore * 0.3;

        if (totalScore >= highThreshold) {
          return 'very-welcoming';
        } else if (totalScore >= lowThreshold) {
          return 'moderately-welcoming';
        } else {
          return 'not-welcoming';
        }
      }

      if (totalScore >= config.welcomingLevelThresholds.veryWelcoming) {
        return 'very-welcoming';
      } else if (totalScore >= config.welcomingLevelThresholds.moderatelyWelcoming) {
        return 'moderately-welcoming';
      } else {
        return 'not-welcoming';
      }
    } catch (error) {
      console.warn('Failed to get scoring config, using default thresholds:', error);
      // Fallback to default calculation
      const maxScore = SURVEY_QUESTIONS.length * DEFAULT_RESPONSE_VALUES.yes;
      const highThreshold = maxScore * 0.7;
      const lowThreshold = maxScore * 0.3;

      if (totalScore >= highThreshold) {
        return 'very-welcoming';
      } else if (totalScore >= lowThreshold) {
        return 'moderately-welcoming';
      } else {
        return 'not-welcoming';
      }
    }
  }

  /**
   * Get the maximum possible score based on current question count
   */
  async getMaxPossibleScore(): Promise<number> {
    try {
      const config = await scoringConfigService.getActiveScoringConfig();
      return config ? config.maxPossibleScore : (SURVEY_QUESTIONS.length * DEFAULT_RESPONSE_VALUES.yes);
    } catch (error) {
      console.warn('Failed to get scoring config, using default max score:', error);
      return SURVEY_QUESTIONS.length * DEFAULT_RESPONSE_VALUES.yes;
    }
  }

  /**
   * Calculate score from response value with reverse scoring support
   */
  calculateQuestionScore(responseValue: number, reverseScored: boolean): number {
    if (reverseScored) {
      // For reverse scored questions, flip the value
      // If user says "Yes" (0.833) to a reverse question, score should be 0 (not welcoming)
      // If user says "No" (0) to a reverse question, score should be 0.833 (welcoming)
      return DEFAULT_RESPONSE_VALUES.yes - responseValue;
    }
    return responseValue;
  }

  /**
   * Convert legacy scores (-2 to +2) to new scoring system (0 to 0.833)
   */
  convertLegacyScore(legacyScore: number, reverseScored: boolean): number {
    // Convert -2 to +2 scale to 0 to 0.833 scale
    const normalizedScore = (legacyScore + 2) / 4; // Convert to 0-1 range
    const scaledScore = normalizedScore * DEFAULT_RESPONSE_VALUES.yes; // Scale to 0-0.833

    if (reverseScored) {
      return DEFAULT_RESPONSE_VALUES.yes - scaledScore;
    }
    return scaledScore;
  }

  /**
   * Get scoring configuration
   */
  async getScoringConfig(): Promise<ScoringConfig> {
    try {
      const config = await scoringConfigService.getActiveScoringConfig();

      if (config) {
        return {
          responseValues: { ...config.responseValues },
          maxPossibleScore: config.maxPossibleScore,
          questionCount: config.questionCount
        };
      }

      // Fallback to default configuration
      return {
        responseValues: { ...DEFAULT_RESPONSE_VALUES },
        maxPossibleScore: SURVEY_QUESTIONS.length * DEFAULT_RESPONSE_VALUES.yes,
        questionCount: SURVEY_QUESTIONS.length
      };
    } catch (error) {
      console.warn('Failed to get scoring config, using default:', error);
      return {
        responseValues: { ...DEFAULT_RESPONSE_VALUES },
        maxPossibleScore: SURVEY_QUESTIONS.length * DEFAULT_RESPONSE_VALUES.yes,
        questionCount: SURVEY_QUESTIONS.length
      };
    }
  }

  /**
   * Get businesses with highest ratings
   */
  async getTopRatedBusinesses(limitCount: number = 20): Promise<Business[]> {
    try {
      const businessesRef = collection(db, 'businesses');

      // Try the full query first
      try {
        const q = query(
          businessesRef,
          where('status', '==', 'rated'),
          orderBy('averageScore', 'desc'),
          orderBy('totalRatings', 'desc'),
          limit(limitCount)
        );

        const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<Business>()));
        return querySnapshot.docs.map(doc => doc.data());
      } catch (indexError) {
        console.warn('Index-based query failed, trying simple query:', indexError);

        // Fallback to simple query without orderBy if index is missing
        const simpleQ = query(
          businessesRef,
          where('status', '==', 'rated'),
          limit(limitCount * 2) // Get more results to sort in memory
        );

        const querySnapshot = await getDocs(simpleQ.withConverter(createFirestoreConverter<Business>()));
        const businesses = querySnapshot.docs.map(doc => doc.data());

        // Sort in memory to avoid requiring a composite index
        return businesses
          .sort((a, b) => {
            // First sort by average score (descending)
            const scoreDiff = (b.averageScore || 0) - (a.averageScore || 0);
            if (scoreDiff !== 0) return scoreDiff;

            // Then by total ratings (descending)
            return (b.totalRatings || 0) - (a.totalRatings || 0);
          })
          .slice(0, limitCount);
      }
    } catch (error) {
      throw createFirestoreError('getTopRatedBusinesses', error, { limitCount });
    }
  }

  /**
   * Search businesses by name
   */
  async searchBusinessesByName(searchTerm: string, limitCount: number = 20): Promise<Business[]> {
    try {
      const businessesRef = collection(db, 'businesses');

      // Firestore doesn't support full-text search, so we'll do a simple prefix search
      const q = query(
        businessesRef,
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<Business>()));
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      throw createFirestoreError('searchBusinessesByName', error, { searchTerm });
    }
  }

  /**
   * Validate survey responses
   */
  private validateSurveyResponses(responses: SurveyResponses): void {
    const requiredFields: (keyof SurveyResponses)[] = [
      'trumpWelcome',
      'obamaWelcome',
      'personOfColorComfort',
      'lgbtqSafety',
      'undocumentedSafety',
      'firearmNormal'
    ];

    validateRequiredFields(responses, requiredFields);

    // Validate score ranges (0 to 0.833 for new system)
    for (const [key, value] of Object.entries(responses)) {
      if (typeof value !== 'number' || value < 0 || value > DEFAULT_RESPONSE_VALUES.yes) {
        throw new Error(`Invalid score for ${key}: must be between 0 and ${DEFAULT_RESPONSE_VALUES.yes}`);
      }
    }
  }


  /**
   * Batch update multiple businesses (for admin operations)
   */
  async batchUpdateBusinesses(updates: Array<{ businessId: string; data: Partial<Business> }>): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const update of updates) {
        const businessRef = doc(db, 'businesses', update.businessId);
        batch.update(businessRef, {
          ...sanitizeForFirestore(update.data),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      throw createFirestoreError('batchUpdateBusinesses', error, { updates });
    }
  }

  /**
   * Migrate user ratings from cookie account to full account
   */
  async migrateUserRatings(fromUserId: string, toUserId: string): Promise<number> {
    try {
      // Get all ratings for the cookie account
      const cookieRatings = await this.getUserRatings(fromUserId, 1000);

      if (cookieRatings.length === 0) {
        return 0;
      }

      // Use batch write for efficiency
      const batch = writeBatch(db);
      const migratedRatings: BusinessRating[] = [];

      for (const rating of cookieRatings) {
        // Create new rating with updated user ID
        const migratedRating: BusinessRating = {
          ...rating,
          userId: toUserId,
          userAccountType: 'full',
          // Keep original creation date but add migration timestamp
          migratedAt: new Date(),
          originalUserId: fromUserId
        };

        // Generate new rating ID to avoid conflicts
        const newRatingId = generateDocumentId();
        migratedRating.ratingId = newRatingId;

        // Add to batch
        const ratingRef = doc(db, 'ratings', newRatingId);
        batch.set(ratingRef, sanitizeForFirestore(migratedRating));

        // Delete old rating
        const oldRatingRef = doc(db, 'ratings', rating.ratingId);
        batch.delete(oldRatingRef);

        migratedRatings.push(migratedRating);
      }

      // Commit all changes
      await batch.commit();

      // Update business aggregations for affected businesses
      const uniqueBusinessIds = [...new Set(migratedRatings.map(r => r.businessId))];
      await Promise.all(
        uniqueBusinessIds.map(businessId => this.updateBusinessAggregation(businessId))
      );

      return migratedRatings.length;
    } catch (error) {
      throw createFirestoreError('migrateUserRatings', error, { fromUserId, toUserId });
    }
  }

  /**
   * Get user's rating history with migration information
   */
  async getUserRatingHistory(userId: string): Promise<Array<BusinessRating & {
    business?: Business;
    wasMigrated?: boolean;
  }>> {
    try {
      const ratings = await this.getUserRatings(userId, 1000);

      // Get business information for each rating
      const ratingsWithBusiness = await Promise.all(
        ratings.map(async (rating) => {
          try {
            const business = await this.getBusiness(rating.businessId);
            return {
              ...rating,
              business,
              wasMigrated: !!(rating as any).migratedAt
            };
          } catch (error) {
            console.warn(`Failed to get business for rating ${rating.ratingId}:`, error);
            return {
              ...rating,
              wasMigrated: !!(rating as any).migratedAt
            };
          }
        })
      );

      return ratingsWithBusiness;
    } catch (error) {
      throw createFirestoreError('getUserRatingHistory', error, { userId });
    }
  }

  /**
   * Get rating statistics for analytics
   */
  async getRatingStatistics(): Promise<{
    totalBusinesses: number;
    totalRatings: number;
    averageRatingsPerBusiness: number;
    welcomingLevelDistribution: Record<WelcomingLevel, number>;
  }> {
    try {
      const [businessesSnapshot, ratingsSnapshot] = await Promise.all([
        getDocs(collection(db, 'businesses')),
        getDocs(collection(db, 'ratings'))
      ]);

      const totalBusinesses = businessesSnapshot.size;
      const totalRatings = ratingsSnapshot.size;
      const averageRatingsPerBusiness = totalBusinesses > 0 ? totalRatings / totalBusinesses : 0;

      const ratings = ratingsSnapshot.docs.map(doc =>
        doc.data() as BusinessRating
      );

      const welcomingLevelDistribution = {
        'very-welcoming': ratings.filter(r => r.welcomingLevel === 'very-welcoming').length,
        'moderately-welcoming': ratings.filter(r => r.welcomingLevel === 'moderately-welcoming').length,
        'not-welcoming': ratings.filter(r => r.welcomingLevel === 'not-welcoming').length
      };

      return {
        totalBusinesses,
        totalRatings,
        averageRatingsPerBusiness,
        welcomingLevelDistribution
      };
    } catch (error) {
      throw createFirestoreError('getRatingStatistics', error);
    }
  }
}

// Export singleton instance
export const ratingsService = RatingsService.getInstance();