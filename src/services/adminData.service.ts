import { collection, getDocs, query, limit, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Business, BusinessRating, UserProfile, CookieAccount } from '../types/firebase';
import { createFirestoreConverter, createFirestoreError } from '../utils/firestore';

export interface AdminKPIs {
  totalBusinesses: number;
  totalReviews: number;
  dailyActiveUsers: number;
  trendingCategory: string;
}

export interface TopBusiness {
  businessId: string;
  name: string;
  marks: number;
  score: number;
  address: string;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface RecentBusiness {
  businessId: string;
  name: string;
  added: string;
  marks: number;
  address: string;
}

export interface PendingReport {
  id: string;
  business: string;
  businessId: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  date: string;
  reportedBy: string;
}

export interface CityStats {
  city: string;
  state: string;
  ratingsCount: number;
  businessesCount: number;
  averageScore: number;
}

export interface ActivityStats {
  hour: number;
  ratingsCount: number;
  label: string;
}

export interface UserEngagementStats {
  accountType: string;
  userCount: number;
  averageRatingsPerUser: number;
  percentage: number;
}

export interface CategoryStats {
  category: string;
  businessCount: number;
  ratingsCount: number;
  averageScore: number;
}

export interface AdminDashboardData {
  kpis: AdminKPIs;
  topBusinesses: TopBusiness[];
  scoreDistribution: ScoreDistribution[];
  recentBusinesses: RecentBusiness[];
  pendingReports: PendingReport[];
  topCities: CityStats[];
  peakActivityHours: ActivityStats[];
  userEngagement: UserEngagementStats[];
  topCategories: CategoryStats[];
}

class AdminDataService {
  private static instance: AdminDataService;

  public static getInstance(): AdminDataService {
    if (!AdminDataService.instance) {
      AdminDataService.instance = new AdminDataService();
    }
    return AdminDataService.instance;
  }

  /**
   * Get all admin dashboard data
   */
  async getDashboardData(timeFilter: string = '7d'): Promise<AdminDashboardData> {
    try {
      console.log('📊 Fetching admin dashboard data...');

      const [
        businesses,
        ratings,
        activeUserCount,
        userProfiles,
        cookieAccounts
      ] = await Promise.all([
        this.getAllBusinesses(),
        this.getAllRatings(),
        this.getActiveUserCount(timeFilter),
        this.getAllUserProfiles(),
        this.getAllCookieAccounts()
      ]);

      console.log(`📊 Data fetched: ${businesses.length} businesses, ${ratings.length} ratings, ${activeUserCount} active users`);

      const kpis = this.calculateKPIs(businesses, ratings, activeUserCount);
      const topBusinesses = this.getTopBusinesses(businesses, ratings);
      const scoreDistribution = this.calculateScoreDistribution(ratings);
      const recentBusinesses = this.getRecentBusinesses(businesses, ratings);
      const pendingReports = await this.getPendingReports();
      const topCities = this.getTopCities(businesses, ratings);
      const peakActivityHours = this.getPeakActivityHours(ratings);
      const userEngagement = this.getUserEngagementStats(ratings, userProfiles, cookieAccounts);
      const topCategories = this.getTopCategories(businesses, ratings);

      return {
        kpis,
        topBusinesses,
        scoreDistribution,
        recentBusinesses,
        pendingReports,
        topCities,
        peakActivityHours,
        userEngagement,
        topCategories
      };
    } catch (error) {
      console.error('❌ Failed to fetch admin dashboard data:', error);
      throw createFirestoreError('getDashboardData', error, { timeFilter });
    }
  }

  /**
   * Get all businesses from Firestore
   */
  private async getAllBusinesses(): Promise<Business[]> {
    try {
      const businessesRef = collection(db, 'businesses');
      const q = query(businessesRef, limit(1000)); // Limit to prevent performance issues

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<Business>()));
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn('Failed to fetch businesses:', error);
      return [];
    }
  }

  /**
   * Get all ratings from Firestore
   */
  private async getAllRatings(): Promise<BusinessRating[]> {
    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(ratingsRef, limit(5000)); // Limit to prevent performance issues

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn('Failed to fetch ratings:', error);
      return [];
    }
  }

  /**
   * Get all user profiles from Firestore
   */
  private async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      const userProfilesRef = collection(db, 'userProfiles');
      const q = query(userProfilesRef, limit(2000));

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<UserProfile>()));
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn('Failed to fetch user profiles:', error);
      return [];
    }
  }

  /**
   * Get all cookie accounts from Firestore
   */
  private async getAllCookieAccounts(): Promise<CookieAccount[]> {
    try {
      const cookieAccountsRef = collection(db, 'cookieAccounts');
      const q = query(cookieAccountsRef, limit(2000));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        cookieId: doc.id,
        ...doc.data()
      } as CookieAccount));
    } catch (error) {
      console.warn('Failed to fetch cookie accounts:', error);
      return [];
    }
  }

  /**
   * Get active user count including all user types (full accounts, cookie accounts, and anonymous)
   */
  private async getActiveUserCount(timeFilter: string): Promise<number> {
    try {
      // Calculate date threshold based on filter
      const now = new Date();
      let daysBack = 7;
      
      switch (timeFilter) {
        case '24h':
          daysBack = 1;
          break;
        case '7d':
          daysBack = 7;
          break;
        case '30d':
          daysBack = 30;
          break;
        case '90d':
          daysBack = 90;
          break;
      }
      
      const threshold = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
      console.log(`🔍 Counting active users since: ${threshold.toISOString()}`);

      const [
        activeFromRatings,
        activeFromProfiles,
        activeFromCookies
      ] = await Promise.all([
        this.getActiveUsersFromRatings(threshold),
        this.getActiveUsersFromProfiles(threshold),
        this.getActiveUsersFromCookieAccounts(threshold)
      ]);

      // Combine all unique user IDs
      const allActiveUsers = new Set([
        ...activeFromRatings,
        ...activeFromProfiles,
        ...activeFromCookies
      ]);

      const totalActiveUsers = allActiveUsers.size;
      console.log(`👥 Active users breakdown:`);
      console.log(`   📊 From ratings: ${activeFromRatings.length} users`);
      console.log(`   👤 From profiles: ${activeFromProfiles.length} users`);
      console.log(`   🍪 From cookies: ${activeFromCookies.length} users`);
      console.log(`   🎯 Total unique: ${totalActiveUsers} users`);
      console.log(`   📅 Time period: ${timeFilter} (since ${threshold.toISOString()})`);

      return totalActiveUsers;
    } catch (error) {
      console.warn('Failed to count active users:', error);
      return 0;
    }
  }

  /**
   * Get active users from ratings (includes anonymous users)
   */
  private async getActiveUsersFromRatings(threshold: Date): Promise<string[]> {
    try {
      const ratingsRef = collection(db, 'ratings');
      
      // Try with date filter first
      try {
        const q = query(
          ratingsRef,
          where('createdAt', '>=', Timestamp.fromDate(threshold)),
          limit(2000)
        );
        
        const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
        const ratings = querySnapshot.docs.map(doc => doc.data());
        
        // Extract unique user IDs
        const userIds = [...new Set(ratings.map(rating => rating.userId))];
        console.log(`📊 Found ${userIds.length} unique users from ${ratings.length} recent ratings`);
        return userIds;
      } catch (indexError) {
        console.warn('Index-based rating query failed, using fallback:', indexError);
        
        // Fallback: get all ratings and filter manually
        const q = query(ratingsRef, limit(2000));
        const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
        const allRatings = querySnapshot.docs.map(doc => doc.data());
        
        const recentRatings = allRatings.filter(rating => 
          rating.createdAt && rating.createdAt.getTime() >= threshold.getTime()
        );
        
        const userIds = [...new Set(recentRatings.map(rating => rating.userId))];
        console.log(`📊 Found ${userIds.length} unique users from ${recentRatings.length} recent ratings (fallback)`);
        return userIds;
      }
    } catch (error) {
      console.warn('Failed to get active users from ratings:', error);
      return [];
    }
  }

  /**
   * Get active users from user profiles
   */
  private async getActiveUsersFromProfiles(threshold: Date): Promise<string[]> {
    try {
      const userProfilesRef = collection(db, 'userProfiles');
      
      // Try with date filter first
      try {
        const q = query(
          userProfilesRef,
          where('updatedAt', '>=', Timestamp.fromDate(threshold)),
          limit(1000)
        );
        
        const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<UserProfile>()));
        const profiles = querySnapshot.docs.map(doc => doc.data());
        
        const userIds = profiles.map(profile => profile.userId);
        console.log(`👤 Found ${userIds.length} active users from profiles`);
        return userIds;
      } catch (indexError) {
        console.warn('Index-based profile query failed, using fallback:', indexError);
        
        // Fallback: get all profiles and filter manually
        const q = query(userProfilesRef, limit(1000));
        const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<UserProfile>()));
        const allProfiles = querySnapshot.docs.map(doc => doc.data());
        
        const recentProfiles = allProfiles.filter(profile => 
          profile.updatedAt && profile.updatedAt.getTime() >= threshold.getTime()
        );
        
        const userIds = recentProfiles.map(profile => profile.userId);
        console.log(`👤 Found ${userIds.length} active users from profiles (fallback)`);
        return userIds;
      }
    } catch (error) {
      console.warn('Failed to get active users from profiles:', error);
      return [];
    }
  }

  /**
   * Get active users from cookie accounts
   */
  private async getActiveUsersFromCookieAccounts(threshold: Date): Promise<string[]> {
    try {
      const cookieAccountsRef = collection(db, 'cookieAccounts');
      
      // Try with date filter first
      try {
        const q = query(
          cookieAccountsRef,
          where('lastActiveAt', '>=', Timestamp.fromDate(threshold)),
          where('isExpired', '==', false),
          limit(1000)
        );
        
        const querySnapshot = await getDocs(q);
        const cookieAccounts = querySnapshot.docs.map(doc => ({
          cookieId: doc.id,
          ...doc.data()
        }));
        
        const userIds = cookieAccounts.map(account => account.cookieId);
        console.log(`🍪 Found ${userIds.length} active cookie accounts`);
        return userIds;
      } catch (indexError) {
        console.warn('Index-based cookie query failed, using fallback:', indexError);
        
        // Fallback: get all cookie accounts and filter manually
        const q = query(cookieAccountsRef, limit(1000));
        const querySnapshot = await getDocs(q);
        const allCookieAccounts = querySnapshot.docs.map(doc => ({
          cookieId: doc.id,
          lastActiveAt: doc.data().lastActiveAt?.toDate(),
          isExpired: doc.data().isExpired,
          ...doc.data()
        }));
        
        const recentCookieAccounts = allCookieAccounts.filter(account => 
          account.lastActiveAt && 
          account.lastActiveAt.getTime() >= threshold.getTime() &&
          !account.isExpired
        );
        
        const userIds = recentCookieAccounts.map(account => account.cookieId);
        console.log(`🍪 Found ${userIds.length} active cookie accounts (fallback)`);
        return userIds;
      }
    } catch (error) {
      console.warn('Failed to get active users from cookie accounts:', error);
      return [];
    }
  }

  /**
   * Calculate KPIs from the data
   */
  private calculateKPIs(businesses: Business[], ratings: BusinessRating[], activeUserCount: number): AdminKPIs {
    // Calculate trending category
    const categoryCount: { [key: string]: number } = {};
    
    businesses.forEach(business => {
      if (business.googlePlacesData?.types) {
        business.googlePlacesData.types.forEach((type: string) => {
          categoryCount[type] = (categoryCount[type] || 0) + 1;
        });
      }
    });

    const trendingCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Format trending category for display
    const formattedCategory = trendingCategory
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    return {
      totalBusinesses: businesses.length,
      totalReviews: ratings.length,
      dailyActiveUsers: activeUserCount,
      trendingCategory: formattedCategory
    };
  }

  /**
   * Get top businesses by rating count
   */
  private getTopBusinesses(businesses: Business[], ratings: BusinessRating[]): TopBusiness[] {
    const businessRatingCounts: { [businessId: string]: number } = {};
    
    // Count ratings per business
    ratings.forEach(rating => {
      businessRatingCounts[rating.businessId] = (businessRatingCounts[rating.businessId] || 0) + 1;
    });

    // Create top businesses list
    return businesses
      .map(business => ({
        businessId: business.businessId,
        name: business.name,
        marks: businessRatingCounts[business.businessId] || 0,
        score: business.averageScore || 0,
        address: business.address
      }))
      .sort((a, b) => b.marks - a.marks)
      .slice(0, 10);
  }

  /**
   * Calculate score distribution
   */
  private calculateScoreDistribution(ratings: BusinessRating[]): ScoreDistribution[] {
    if (ratings.length === 0) {
      return [
        { range: '4.0-5.0', count: 0, percentage: 0 },
        { range: '3.0-3.9', count: 0, percentage: 0 },
        { range: '2.0-2.9', count: 0, percentage: 0 },
        { range: '1.0-1.9', count: 0, percentage: 0 },
        { range: '0.0-0.9', count: 0, percentage: 0 }
      ];
    }

    const ranges = [
      { min: 4.0, max: 5.0, range: '4.0-5.0' },
      { min: 3.0, max: 3.9, range: '3.0-3.9' },
      { min: 2.0, max: 2.9, range: '2.0-2.9' },
      { min: 1.0, max: 1.9, range: '1.0-1.9' },
      { min: 0.0, max: 0.9, range: '0.0-0.9' }
    ];

    const distribution = ranges.map(({ min, max, range }) => {
      const count = ratings.filter(rating => 
        rating.totalScore >= min && rating.totalScore <= max
      ).length;
      
      const percentage = Math.round((count / ratings.length) * 100);
      
      return { range, count, percentage };
    });

    return distribution;
  }

  /**
   * Get recently added businesses
   */
  private getRecentBusinesses(businesses: Business[], ratings: BusinessRating[]): RecentBusiness[] {
    const businessRatingCounts: { [businessId: string]: number } = {};
    
    // Count ratings per business
    ratings.forEach(rating => {
      businessRatingCounts[rating.businessId] = (businessRatingCounts[rating.businessId] || 0) + 1;
    });

    return businesses
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map(business => ({
        businessId: business.businessId,
        name: business.name,
        added: this.formatRelativeTime(business.createdAt),
        marks: businessRatingCounts[business.businessId] || 0,
        address: business.address
      }));
  }

  /**
   * Get pending reports from the reports service
   */
  private async getPendingReports(): Promise<PendingReport[]> {
    try {
      const { reportsService } = await import('./reports.service');
      const reports = await reportsService.getPendingReports(20);
      
      return reports.map(report => ({
        id: report.reportId,
        business: report.businessName,
        businessId: report.businessId,
        reason: reportsService.getReasonDisplayText(report.reason),
        severity: report.severity,
        date: this.formatRelativeTime(report.createdAt),
        reportedBy: report.reporterEmail || `User (${report.reporterAccountType})`
      }));
    } catch (error) {
      console.warn('Failed to load pending reports:', error);
      return [];
    }
  }



  /**
   * Format relative time
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Get detailed business analytics
   */
  async getBusinessAnalytics(businessId: string): Promise<{
    business: Business | null;
    ratings: BusinessRating[];
    averageScore: number;
    ratingTrend: { date: string; score: number }[];
  }> {
    try {
      const [business, ratings] = await Promise.all([
        this.getBusinessById(businessId),
        this.getBusinessRatings(businessId)
      ]);

      const averageScore = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.totalScore, 0) / ratings.length 
        : 0;

      // Calculate rating trend over time
      const ratingTrend = this.calculateRatingTrend(ratings);

      return {
        business,
        ratings,
        averageScore,
        ratingTrend
      };
    } catch (error) {
      throw createFirestoreError('getBusinessAnalytics', error, { businessId });
    }
  }

  /**
   * Get business by ID
   */
  private async getBusinessById(businessId: string): Promise<Business | null> {
    try {
      const businessesRef = collection(db, 'businesses');
      const q = query(businessesRef, where('businessId', '==', businessId), limit(1));
      
      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<Business>()));
      return querySnapshot.empty ? null : querySnapshot.docs[0].data();
    } catch (error) {
      console.warn('Failed to fetch business:', error);
      return null;
    }
  }

  /**
   * Get ratings for a specific business
   */
  private async getBusinessRatings(businessId: string): Promise<BusinessRating[]> {
    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(ratingsRef, where('businessId', '==', businessId), limit(100));
      
      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessRating>()));
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn('Failed to fetch business ratings:', error);
      return [];
    }
  }

  /**
   * Calculate rating trend over time
   */
  private calculateRatingTrend(ratings: BusinessRating[]): { date: string; score: number }[] {
    if (ratings.length === 0) return [];

    // Sort ratings by date
    const sortedRatings = ratings.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Group by week and calculate average
    const weeklyAverages: { [week: string]: { total: number; count: number } } = {};

    sortedRatings.forEach(rating => {
      const weekStart = new Date(rating.createdAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyAverages[weekKey]) {
        weeklyAverages[weekKey] = { total: 0, count: 0 };
      }

      weeklyAverages[weekKey].total += rating.totalScore;
      weeklyAverages[weekKey].count += 1;
    });

    return Object.entries(weeklyAverages)
      .map(([date, { total, count }]) => ({
        date,
        score: Math.round((total / count) * 100) / 100
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get top cities by rating count
   */
  private getTopCities(businesses: Business[], ratings: BusinessRating[]): CityStats[] {
    const cityStats: { [key: string]: { ratingsCount: number; businessIds: Set<string>; totalScore: number } } = {};

    // Group businesses by city
    businesses.forEach(business => {
      if (business.address) {
        // Extract city and state from address (simple parsing)
        const addressParts = business.address.split(',').map(part => part.trim());
        if (addressParts.length >= 2) {
          const city = addressParts[addressParts.length - 3] || addressParts[0];
          const state = addressParts[addressParts.length - 2] || 'Unknown';
          const cityKey = `${city}, ${state}`;

          if (!cityStats[cityKey]) {
            cityStats[cityKey] = { ratingsCount: 0, businessIds: new Set(), totalScore: 0 };
          }
          cityStats[cityKey].businessIds.add(business.businessId);
        }
      }
    });

    // Add rating counts and scores
    ratings.forEach(rating => {
      const business = businesses.find(b => b.businessId === rating.businessId);
      if (business && business.address) {
        const addressParts = business.address.split(',').map(part => part.trim());
        if (addressParts.length >= 2) {
          const city = addressParts[addressParts.length - 3] || addressParts[0];
          const state = addressParts[addressParts.length - 2] || 'Unknown';
          const cityKey = `${city}, ${state}`;

          if (cityStats[cityKey]) {
            cityStats[cityKey].ratingsCount++;
            cityStats[cityKey].totalScore += rating.totalScore;
          }
        }
      }
    });

    return Object.entries(cityStats)
      .map(([cityState, stats]) => {
        const [city, state] = cityState.split(', ');
        return {
          city,
          state,
          ratingsCount: stats.ratingsCount,
          businessesCount: stats.businessIds.size,
          averageScore: stats.ratingsCount > 0 ? Math.round((stats.totalScore / stats.ratingsCount) * 10) / 10 : 0
        };
      })
      .filter(city => city.ratingsCount > 0)
      .sort((a, b) => b.ratingsCount - a.ratingsCount)
      .slice(0, 10);
  }

  /**
   * Get peak activity hours
   */
  private getPeakActivityHours(ratings: BusinessRating[]): ActivityStats[] {
    const hourCounts: { [hour: number]: number } = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }

    // Count ratings by hour
    ratings.forEach(rating => {
      const hour = rating.createdAt.getHours();
      hourCounts[hour]++;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        ratingsCount: count,
        label: this.formatHourLabel(parseInt(hour))
      }))
      .sort((a, b) => b.ratingsCount - a.ratingsCount);
  }

  /**
   * Get user engagement statistics
   */
  private getUserEngagementStats(ratings: BusinessRating[], userProfiles: UserProfile[], cookieAccounts: CookieAccount[]): UserEngagementStats[] {
    const userRatingCounts: { [userId: string]: { count: number; type: string } } = {};

    // Count ratings per user and determine account type
    ratings.forEach(rating => {
      if (!userRatingCounts[rating.userId]) {
        // Determine account type
        const userProfile = userProfiles.find(p => p.userId === rating.userId);
        const cookieAccount = cookieAccounts.find(c => c.cookieId === rating.userId);
        
        let accountType = 'anonymous';
        if (userProfile) {
          accountType = userProfile.accountType;
        } else if (cookieAccount) {
          accountType = 'cookie';
        }

        userRatingCounts[rating.userId] = { count: 0, type: accountType };
      }
      userRatingCounts[rating.userId].count++;
    });

    // Group by account type
    const typeStats: { [type: string]: { userCount: number; totalRatings: number } } = {};
    
    Object.values(userRatingCounts).forEach(({ count, type }) => {
      if (!typeStats[type]) {
        typeStats[type] = { userCount: 0, totalRatings: 0 };
      }
      typeStats[type].userCount++;
      typeStats[type].totalRatings += count;
    });

    const totalUsers = Object.values(typeStats).reduce((sum, stats) => sum + stats.userCount, 0);

    return Object.entries(typeStats)
      .map(([accountType, stats]) => ({
        accountType: this.formatAccountType(accountType),
        userCount: stats.userCount,
        averageRatingsPerUser: Math.round((stats.totalRatings / stats.userCount) * 10) / 10,
        percentage: Math.round((stats.userCount / totalUsers) * 100)
      }))
      .sort((a, b) => b.userCount - a.userCount);
  }

  /**
   * Get top categories by business and rating count
   */
  private getTopCategories(businesses: Business[], ratings: BusinessRating[]): CategoryStats[] {
    const categoryStats: { [category: string]: { businessCount: number; ratingsCount: number; totalScore: number } } = {};

    // Count businesses by category
    businesses.forEach(business => {
      if (business.googlePlacesData?.types) {
        business.googlePlacesData.types.forEach((type: string) => {
          if (!categoryStats[type]) {
            categoryStats[type] = { businessCount: 0, ratingsCount: 0, totalScore: 0 };
          }
          categoryStats[type].businessCount++;
        });
      }
    });

    // Add rating counts and scores
    ratings.forEach(rating => {
      const business = businesses.find(b => b.businessId === rating.businessId);
      if (business && business.googlePlacesData?.types) {
        business.googlePlacesData.types.forEach((type: string) => {
          if (categoryStats[type]) {
            categoryStats[type].ratingsCount++;
            categoryStats[type].totalScore += rating.totalScore;
          }
        });
      }
    });

    return Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category: this.formatCategoryName(category),
        businessCount: stats.businessCount,
        ratingsCount: stats.ratingsCount,
        averageScore: stats.ratingsCount > 0 ? Math.round((stats.totalScore / stats.ratingsCount) * 10) / 10 : 0
      }))
      .filter(cat => cat.businessCount > 0)
      .sort((a, b) => b.ratingsCount - a.ratingsCount)
      .slice(0, 8);
  }

  /**
   * Format hour label for display
   */
  private formatHourLabel(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

  /**
   * Format account type for display
   */
  private formatAccountType(type: string): string {
    switch (type) {
      case 'full': return 'Full Account';
      case 'cookie': return 'Temporary Account';
      case 'anonymous': return 'Anonymous';
      default: return type;
    }
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/And/g, '&');
  }
}

export const adminDataService = AdminDataService.getInstance();