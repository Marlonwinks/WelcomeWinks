import { 
  Timestamp, 
  DocumentData, 
  QueryDocumentSnapshot,
  SnapshotOptions 
} from 'firebase/firestore';

/**
 * Converts Firestore Timestamp to JavaScript Date
 */
export function timestampToDate(timestamp: Timestamp | null | undefined): Date | null {
  if (!timestamp) return null;
  return timestamp.toDate();
}

/**
 * Converts JavaScript Date to Firestore Timestamp
 */
export function dateToTimestamp(date: Date | null | undefined): Timestamp | null {
  if (!date) return null;
  return Timestamp.fromDate(date);
}

/**
 * Generic converter for Firestore documents with automatic timestamp conversion
 */
export function createFirestoreConverter<T extends Record<string, any>>() {
  return {
    toFirestore(data: T): DocumentData {
      const converted: DocumentData = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (value instanceof Date) {
          converted[key] = Timestamp.fromDate(value);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Recursively convert nested objects
          converted[key] = convertDatesToTimestamps(value);
        } else {
          converted[key] = value;
        }
      }
      
      return converted;
    },
    
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): T {
      const data = snapshot.data(options);
      const converted: any = { id: snapshot.id };
      
      for (const [key, value] of Object.entries(data)) {
        if (value instanceof Timestamp) {
          converted[key] = value.toDate();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Recursively convert nested objects
          converted[key] = convertTimestampsToDates(value);
        } else {
          converted[key] = value;
        }
      }
      
      return converted as T;
    }
  };
}

/**
 * Recursively converts Date objects to Timestamps in nested objects
 */
function convertDatesToTimestamps(obj: any): any {
  if (obj instanceof Date) {
    return Timestamp.fromDate(obj);
  }
  
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDatesToTimestamps(value);
    }
    return converted;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToTimestamps);
  }
  
  return obj;
}

/**
 * Recursively converts Timestamp objects to Dates in nested objects
 */
function convertTimestampsToDates(obj: any): any {
  if (obj instanceof Timestamp) {
    return obj.toDate();
  }
  
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertTimestampsToDates(value);
    }
    return converted;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertTimestampsToDates);
  }
  
  return obj;
}

/**
 * Validates required fields in Firestore document data
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null
  );
  
  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
}

/**
 * Creates a standardized error object for Firestore operations
 */
export function createFirestoreError(
  operation: string,
  error: any,
  context?: Record<string, any>
): Error {
  const message = `Firestore ${operation} failed: ${error.message || error}`;
  const firestoreError = new Error(message);
  
  // Attach additional context
  (firestoreError as any).code = error.code;
  (firestoreError as any).operation = operation;
  (firestoreError as any).context = context;
  
  return firestoreError;
}

/**
 * Generates a unique ID for documents
 */
export function generateDocumentId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${randomStr}`;
}

/**
 * Sanitizes data for Firestore storage by removing undefined values
 */
export function sanitizeForFirestore<T extends Record<string, any>>(data: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        sanitized[key] = sanitizeForFirestore(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * Creates a batch operation helper
 */
export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id: string;
  data?: any;
}

/**
 * IP address validation utility
 */
export function isValidIPAddress(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Cookie ID validation utility
 */
export function isValidCookieId(cookieId: string): boolean {
  return typeof cookieId === 'string' && 
         cookieId.length >= 32 && 
         /^[a-zA-Z0-9_-]+$/.test(cookieId);
}