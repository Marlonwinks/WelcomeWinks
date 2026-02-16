/**
 * Review Cookies Service
 * Manages browser cookies to prevent duplicate reviews from the same device/browser
 */

export interface ReviewCookie {
  businessId: string;
  timestamp: number;
  userId?: string;
}

class ReviewCookiesService {
  private static instance: ReviewCookiesService;
  private static readonly COOKIE_NAME = 'ww_reviewed_businesses';
  private static readonly COOKIE_EXPIRY_DAYS = 365; // 1 year

  public static getInstance(): ReviewCookiesService {
    if (!ReviewCookiesService.instance) {
      ReviewCookiesService.instance = new ReviewCookiesService();
    }
    return ReviewCookiesService.instance;
  }

  /**
   * Check if user has already reviewed a business on this device
   */
  hasReviewedBusiness(businessId: string): boolean {
    try {
      const reviewedBusinesses = this.getReviewedBusinesses();
      return reviewedBusinesses.some(review => review.businessId === businessId);
    } catch (error) {
      console.warn('Failed to check review cookie:', error);
      return false; // Allow review if cookie check fails
    }
  }

  /**
   * Mark a business as reviewed on this device
   */
  markBusinessAsReviewed(businessId: string, userId?: string): void {
    try {
      const reviewedBusinesses = this.getReviewedBusinesses();
      
      // Check if already marked (shouldn't happen, but just in case)
      if (reviewedBusinesses.some(review => review.businessId === businessId)) {
        console.log(`Business ${businessId} already marked as reviewed`);
        return;
      }

      // Add new review record
      const newReview: ReviewCookie = {
        businessId,
        timestamp: Date.now(),
        userId
      };

      reviewedBusinesses.push(newReview);

      // Keep only the last 1000 reviews to prevent cookie from getting too large
      if (reviewedBusinesses.length > 1000) {
        reviewedBusinesses.sort((a, b) => b.timestamp - a.timestamp);
        reviewedBusinesses.splice(1000);
      }

      this.saveReviewedBusinesses(reviewedBusinesses);
      console.log(`✅ Marked business ${businessId} as reviewed on this device`);
    } catch (error) {
      console.error('Failed to mark business as reviewed:', error);
      // Don't throw error - review submission should still succeed
    }
  }

  /**
   * Get all businesses reviewed on this device
   */
  getReviewedBusinesses(): ReviewCookie[] {
    try {
      const cookieValue = this.getCookie(ReviewCookiesService.COOKIE_NAME);
      if (!cookieValue) {
        return [];
      }

      const decoded = decodeURIComponent(cookieValue);
      const parsed = JSON.parse(decoded);
      
      // Validate the data structure
      if (!Array.isArray(parsed)) {
        console.warn('Invalid review cookie format, resetting');
        this.clearReviewedBusinesses();
        return [];
      }

      // Filter out old reviews (older than 1 year)
      const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
      const validReviews = parsed.filter(review => 
        review && 
        typeof review.businessId === 'string' && 
        typeof review.timestamp === 'number' &&
        review.timestamp > oneYearAgo
      );

      // If we filtered out old reviews, save the cleaned list
      if (validReviews.length !== parsed.length) {
        this.saveReviewedBusinesses(validReviews);
      }

      return validReviews;
    } catch (error) {
      console.warn('Failed to parse review cookie, resetting:', error);
      this.clearReviewedBusinesses();
      return [];
    }
  }

  /**
   * Save reviewed businesses to cookie
   */
  private saveReviewedBusinesses(reviews: ReviewCookie[]): void {
    try {
      const jsonString = JSON.stringify(reviews);
      const encoded = encodeURIComponent(jsonString);
      
      // Check if cookie size is reasonable (browsers typically limit to 4KB per cookie)
      if (encoded.length > 3500) {
        console.warn('Review cookie getting large, trimming oldest reviews');
        // Keep only the most recent 500 reviews
        reviews.sort((a, b) => b.timestamp - a.timestamp);
        const trimmed = reviews.slice(0, 500);
        this.saveReviewedBusinesses(trimmed);
        return;
      }

      this.setCookie(ReviewCookiesService.COOKIE_NAME, encoded, ReviewCookiesService.COOKIE_EXPIRY_DAYS);
    } catch (error) {
      console.error('Failed to save review cookie:', error);
    }
  }

  /**
   * Clear all reviewed businesses (for testing or reset)
   */
  clearReviewedBusinesses(): void {
    try {
      this.deleteCookie(ReviewCookiesService.COOKIE_NAME);
      console.log('🧹 Cleared all reviewed businesses cookie');
    } catch (error) {
      console.error('Failed to clear review cookie:', error);
    }
  }

  /**
   * Get count of businesses reviewed on this device
   */
  getReviewedBusinessesCount(): number {
    return this.getReviewedBusinesses().length;
  }

  /**
   * Get list of business IDs reviewed on this device
   */
  getReviewedBusinessIds(): string[] {
    return this.getReviewedBusinesses().map(review => review.businessId);
  }

  /**
   * Check if user has reviewed many businesses recently (potential spam detection)
   */
  hasReviewedManyRecently(timeWindowHours: number = 24, maxReviews: number = 10): boolean {
    try {
      const reviewedBusinesses = this.getReviewedBusinesses();
      const timeWindow = Date.now() - (timeWindowHours * 60 * 60 * 1000);
      
      const recentReviews = reviewedBusinesses.filter(review => 
        review.timestamp > timeWindow
      );

      return recentReviews.length >= maxReviews;
    } catch (error) {
      console.warn('Failed to check recent review count:', error);
      return false;
    }
  }

  /**
   * Remove a specific business from reviewed list (admin function)
   */
  removeBusinessFromReviewed(businessId: string): boolean {
    try {
      const reviewedBusinesses = this.getReviewedBusinesses();
      const initialLength = reviewedBusinesses.length;
      
      const filtered = reviewedBusinesses.filter(review => review.businessId !== businessId);
      
      if (filtered.length < initialLength) {
        this.saveReviewedBusinesses(filtered);
        console.log(`🗑️ Removed business ${businessId} from reviewed list`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to remove business from reviewed list:', error);
      return false;
    }
  }

  // Cookie utility methods
  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure=${location.protocol === 'https:'}`;
  }

  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    
    return null;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  /**
   * Get debug information about review cookies
   */
  getDebugInfo(): {
    totalReviews: number;
    oldestReview: Date | null;
    newestReview: Date | null;
    cookieSize: number;
    recentReviews24h: number;
  } {
    const reviews = this.getReviewedBusinesses();
    const cookieValue = this.getCookie(ReviewCookiesService.COOKIE_NAME) || '';
    
    const timestamps = reviews.map(r => r.timestamp).filter(t => t);
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    return {
      totalReviews: reviews.length,
      oldestReview: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
      newestReview: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
      cookieSize: cookieValue.length,
      recentReviews24h: reviews.filter(r => r.timestamp > oneDayAgo).length
    };
  }
}

export const reviewCookiesService = ReviewCookiesService.getInstance();