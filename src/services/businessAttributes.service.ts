import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { BusinessAttributes } from '../types/businessAttributes';
import { inferBusinessAttributes } from '../utils/businessAttributesInference';
import {
  createFirestoreConverter,
  createFirestoreError,
  sanitizeForFirestore,
} from '../utils/firestore';
import { cacheService } from './cache.service';

/**
 * Business Attributes Service
 * Handles business attributes inference, caching, and persistence
 */
export class BusinessAttributesService {
  private static instance: BusinessAttributesService;

  public static getInstance(): BusinessAttributesService {
    if (!BusinessAttributesService.instance) {
      BusinessAttributesService.instance = new BusinessAttributesService();
    }
    return BusinessAttributesService.instance;
  }

  /**
   * Get business attributes with caching
   * First checks cache, then Firestore, then infers from Google Places data
   */
  async getBusinessAttributes(
    placeId: string,
    place: google.maps.places.PlaceResult,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<BusinessAttributes> {
    try {
      // Check cache first
      const cached = cacheService.getBusinessAttributes(placeId);
      if (cached) {
        return cached;
      }

      // Try to load from Firestore
      const stored = await this.loadBusinessAttributes(placeId);
      if (stored) {
        cacheService.setBusinessAttributes(placeId, stored);
        return stored;
      }

      // Infer from Google Places data
      const inferred = this.inferAttributesFromGooglePlaces(place, userLocation);
      
      // Save to Firestore for future use (fire and forget)
      this.saveBusinessAttributes(placeId, inferred).catch(error => {
        console.warn(`Failed to save business attributes for ${placeId}:`, error);
      });

      // Cache the inferred attributes
      cacheService.setBusinessAttributes(placeId, inferred);

      return inferred;
    } catch (error) {
      throw createFirestoreError('getBusinessAttributes', error, { placeId });
    }
  }

  /**
   * Infer business attributes from Google Places data
   */
  inferAttributesFromGooglePlaces(
    place: google.maps.places.PlaceResult,
    userLocation?: { latitude: number; longitude: number }
  ): BusinessAttributes {
    return inferBusinessAttributes(place, userLocation);
  }

  /**
   * Save business attributes to Firestore
   */
  async saveBusinessAttributes(
    placeId: string,
    attributes: BusinessAttributes
  ): Promise<void> {
    try {
      const attributesRef = doc(db, 'businessAttributes', placeId);
      
      const sanitizedAttributes = sanitizeForFirestore({
        ...attributes,
        lastUpdated: serverTimestamp(),
      });

      await setDoc(attributesRef, sanitizedAttributes);
    } catch (error) {
      throw createFirestoreError('saveBusinessAttributes', error, { placeId });
    }
  }

  /**
   * Load business attributes from Firestore
   */
  async loadBusinessAttributes(placeId: string): Promise<BusinessAttributes | null> {
    try {
      const attributesRef = doc(db, 'businessAttributes', placeId);
      const attributesDoc = await getDoc(
        attributesRef.withConverter(createFirestoreConverter<BusinessAttributes>())
      );

      if (!attributesDoc.exists()) {
        return null;
      }

      return attributesDoc.data();
    } catch (error) {
      throw createFirestoreError('loadBusinessAttributes', error, { placeId });
    }
  }

  /**
   * Batch load business attributes for multiple businesses
   */
  async batchLoadBusinessAttributes(
    placeIds: string[]
  ): Promise<Map<string, BusinessAttributes>> {
    try {
      // Check batch cache first
      const batchKey = cacheService.generateBatchKey(placeIds);
      const cachedBatch = cacheService.getBatchResults(batchKey);
      if (cachedBatch) {
        return cachedBatch;
      }

      const results = new Map<string, BusinessAttributes>();

      // Check individual cache entries
      const uncachedIds: string[] = [];
      placeIds.forEach(placeId => {
        const cached = cacheService.getBusinessAttributes(placeId);
        if (cached) {
          results.set(placeId, cached);
        } else {
          uncachedIds.push(placeId);
        }
      });

      if (uncachedIds.length === 0) {
        // Cache the batch result
        cacheService.setBatchResults(batchKey, results);
        return results;
      }

      // Firestore has a limit of 10 items for 'in' queries, so batch them
      const batchSize = 10;
      for (let i = 0; i < uncachedIds.length; i += batchSize) {
        const batch = uncachedIds.slice(i, i + batchSize);
        
        const attributesQuery = query(
          collection(db, 'businessAttributes'),
          where('__name__', 'in', batch)
        );

        const snapshot = await getDocs(
          attributesQuery.withConverter(createFirestoreConverter<BusinessAttributes>())
        );

        snapshot.docs.forEach(doc => {
          const attributes = doc.data();
          results.set(doc.id, attributes);
          cacheService.setBusinessAttributes(doc.id, attributes);
        });
      }

      // Cache the batch result
      cacheService.setBatchResults(batchKey, results);

      return results;
    } catch (error) {
      throw createFirestoreError('batchLoadBusinessAttributes', error, { placeIds });
    }
  }

  /**
   * Batch save business attributes for multiple businesses
   */
  async batchSaveBusinessAttributes(
    attributesMap: Map<string, BusinessAttributes>
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      let operationCount = 0;
      const maxBatchSize = 500; // Firestore batch limit

      for (const [placeId, attributes] of attributesMap.entries()) {
        if (operationCount >= maxBatchSize) {
          await batch.commit();
          operationCount = 0;
        }

        const attributesRef = doc(db, 'businessAttributes', placeId);
        const sanitizedAttributes = sanitizeForFirestore({
          ...attributes,
          lastUpdated: serverTimestamp(),
        });

        batch.set(attributesRef, sanitizedAttributes);
        operationCount++;

        // Also cache the attributes
        cacheService.setBusinessAttributes(placeId, attributes);
      }

      if (operationCount > 0) {
        await batch.commit();
      }
    } catch (error) {
      throw createFirestoreError('batchSaveBusinessAttributes', error);
    }
  }

  /**
   * Clear cache for a specific business or all businesses
   */
  clearCache(placeId?: string): void {
    if (placeId) {
      cacheService.deleteBusinessAttributes(placeId);
    } else {
      cacheService.clearCache('attributes');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getAllStats().attributes;
  }
}

// Export singleton instance
export const businessAttributesService = BusinessAttributesService.getInstance();
