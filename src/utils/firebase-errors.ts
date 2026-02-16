import { FirebaseError } from 'firebase/app';

/**
 * Firebase error codes and their user-friendly messages
 */
export const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
    // Authentication errors
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This operation is not allowed.',
    'auth/requires-recent-login': 'Please log in again to complete this action.',

    // Firestore errors
    'firestore/permission-denied': 'You do not have permission to perform this action.',
    'firestore/not-found': 'The requested document was not found.',
    'firestore/already-exists': 'A document with this ID already exists.',
    'firestore/resource-exhausted': 'Quota exceeded. Please try again later.',
    'firestore/failed-precondition': 'The operation failed due to a precondition.',
    'firestore/aborted': 'The operation was aborted. Please try again.',
    'firestore/out-of-range': 'The operation was attempted past the valid range.',
    'firestore/unimplemented': 'This operation is not implemented.',
    'firestore/internal': 'An internal error occurred.',
    'firestore/unavailable': 'The service is currently unavailable.',
    'firestore/data-loss': 'Unrecoverable data loss or corruption.',
    'firestore/unauthenticated': 'The request does not have valid authentication credentials.',
    'firestore/deadline-exceeded': 'The operation took too long to complete.',
    'firestore/cancelled': 'The operation was cancelled.',

    // Custom application errors
    'app/invalid-cookie-id': 'Invalid cookie account identifier.',
    'app/cookie-expired': 'Your session has expired. Please start over.',
    'app/duplicate-rating': 'You have already rated this business.',
    'app/invalid-survey-response': 'Invalid survey response values.',
    'app/business-not-found': 'Business not found.',
    'app/invalid-location': 'Invalid location data provided.',
    'app/network-error': 'Network connection error. Please check your internet connection.',
    'app/storage-error': 'Local storage error. Please check your browser settings.',
};

/**
 * Enhanced error class for Firebase operations
 */
export class FirebaseAppError extends Error {
    public readonly code: string;
    public readonly operation: string;
    public readonly context?: Record<string, any>;
    public readonly originalError?: Error;
    public readonly timestamp: Date;
    public readonly retryable: boolean;

    constructor(
        code: string,
        message: string,
        operation: string,
        context?: Record<string, any>,
        originalError?: Error
    ) {
        super(message);
        this.name = 'FirebaseAppError';
        this.code = code;
        this.operation = operation;
        this.context = context;
        this.originalError = originalError;
        this.timestamp = new Date();
        this.retryable = this.isRetryableError(code);
    }

    /**
     * Determine if an error is retryable
     */
    private isRetryableError(code: string): boolean {
        const retryableCodes = [
            'auth/network-request-failed',
            'firestore/unavailable',
            'firestore/deadline-exceeded',
            'firestore/aborted',
            'app/network-error'
        ];
        return retryableCodes.includes(code);
    }

    /**
     * Get user-friendly error message
     */
    getUserMessage(): string {
        return FIREBASE_ERROR_MESSAGES[this.code] || this.message || 'An unexpected error occurred.';
    }

    /**
     * Convert to JSON for logging
     */
    toJSON(): Record<string, any> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            operation: this.operation,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            retryable: this.retryable,
            stack: this.stack
        };
    }
}

/**
 * Convert Firebase errors to application errors
 */
export function handleFirebaseError(
    error: any,
    operation: string,
    context?: Record<string, any>
): FirebaseAppError {
    let code: string;
    let message: string;

    if (error instanceof FirebaseError) {
        code = error.code;
        message = error.message;
    } else if (error instanceof Error) {
        code = 'app/unknown-error';
        message = error.message;
    } else if (typeof error === 'string') {
        code = 'app/unknown-error';
        message = error;
    } else {
        code = 'app/unknown-error';
        message = 'An unknown error occurred';
    }

    const userMessage = FIREBASE_ERROR_MESSAGES[code] || message;

    return new FirebaseAppError(code, userMessage, operation, context, error);
}

/**
 * Enhanced retry mechanism for Firebase operations with circuit breaker
 */
export class RetryManager {
    private static circuitBreakers = new Map<string, CircuitBreaker>();

    static async retryOperation<T>(
        operation: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const {
            maxRetries = 3,
            baseDelay = 1000,
            maxDelay = 30000,
            operationName = 'firebase-operation',
            enableCircuitBreaker = true,
            circuitBreakerThreshold = 5,
            circuitBreakerTimeout = 60000
        } = options;

        // Check circuit breaker
        if (enableCircuitBreaker) {
            const circuitBreaker = this.getCircuitBreaker(operationName, circuitBreakerThreshold, circuitBreakerTimeout);
            if (circuitBreaker.isOpen()) {
                throw new FirebaseAppError(
                    'app/circuit-breaker-open',
                    `Circuit breaker is open for ${operationName}`,
                    operationName,
                    { circuitBreakerState: 'open' }
                );
            }
        }

        let lastError: FirebaseAppError;
        const startTime = Date.now();

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();

                // Reset circuit breaker on success
                if (enableCircuitBreaker) {
                    this.getCircuitBreaker(operationName, circuitBreakerThreshold, circuitBreakerTimeout).recordSuccess();
                }

                return result;
            } catch (error) {
                lastError = handleFirebaseError(error, operationName, {
                    attempt,
                    maxRetries,
                    elapsedTime: Date.now() - startTime
                });

                // Record failure in circuit breaker
                if (enableCircuitBreaker) {
                    this.getCircuitBreaker(operationName, circuitBreakerThreshold, circuitBreakerTimeout).recordFailure();
                }

                // Don't retry if error is not retryable or if this is the last attempt
                if (!lastError.retryable || attempt === maxRetries) {
                    logFirebaseError(lastError);
                    throw lastError;
                }

                // Calculate delay with exponential backoff and jitter
                const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
                const jitter = Math.random() * 0.3 * exponentialDelay; // Add 30% jitter
                const totalDelay = exponentialDelay + jitter;

                console.warn(`Retrying ${operationName} (attempt ${attempt}/${maxRetries}) after ${Math.round(totalDelay)}ms:`, {
                    error: lastError.getUserMessage(),
                    code: lastError.code,
                    retryable: lastError.retryable,
                    elapsedTime: Date.now() - startTime
                });

                await this.delay(totalDelay);
            }
        }

        throw lastError!;
    }

    private static getCircuitBreaker(name: string, threshold: number, timeout: number): CircuitBreaker {
        if (!this.circuitBreakers.has(name)) {
            this.circuitBreakers.set(name, new CircuitBreaker(threshold, timeout));
        }
        return this.circuitBreakers.get(name)!;
    }

    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private state: 'closed' | 'open' | 'half-open' = 'closed';

    constructor(
        private threshold: number,
        private timeout: number
    ) { }

    isOpen(): boolean {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'half-open';
                return false;
            }
            return true;
        }
        return false;
    }

    recordSuccess(): void {
        this.failures = 0;
        this.state = 'closed';
    }

    recordFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            this.state = 'open';
        }
    }
}

/**
 * Retry options interface
 */
export interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    operationName?: string;
    enableCircuitBreaker?: boolean;
    circuitBreakerThreshold?: number;
    circuitBreakerTimeout?: number;
}

/**
 * Legacy retry function for backward compatibility
 */
export async function retryFirebaseOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    operationName: string = 'firebase-operation'
): Promise<T> {
    return RetryManager.retryOperation(operation, {
        maxRetries,
        baseDelay,
        operationName
    });
}

/**
 * Validate Firebase configuration
 */
export function validateFirebaseConfig(): void {
    const requiredEnvVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
    ];

    const missingVars = requiredEnvVars.filter(
        (envVar) => !import.meta.env[envVar]
    );

    if (missingVars.length > 0) {
        throw new FirebaseAppError(
            'app/missing-config',
            `Missing required Firebase environment variables: ${missingVars.join(', ')}`,
            'validateFirebaseConfig',
            { missingVars }
        );
    }

    // Measurement ID is optional (only needed for Analytics)
    if (import.meta.env.PROD && !import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
        console.warn('VITE_FIREBASE_MEASUREMENT_ID not set - Firebase Analytics will be disabled');
    }
}

/**
 * Log Firebase errors for monitoring
 */
export function logFirebaseError(error: FirebaseAppError): void {
    // In production, this would send to a logging service
    console.error('Firebase Error:', error.toJSON());

    // You could integrate with services like Sentry, LogRocket, etc.
    // if (window.Sentry) {
    //   window.Sentry.captureException(error);
    // }
}

/**
 * Create a standardized error for common scenarios
 */
export const createStandardError = {
    networkError: (operation: string, context?: Record<string, any>) =>
        new FirebaseAppError('app/network-error', 'Network connection error', operation, context),

    permissionDenied: (operation: string, context?: Record<string, any>) =>
        new FirebaseAppError('firestore/permission-denied', 'Permission denied', operation, context),

    notFound: (operation: string, resource: string, context?: Record<string, any>) =>
        new FirebaseAppError('firestore/not-found', `${resource} not found`, operation, context),

    invalidInput: (operation: string, field: string, context?: Record<string, any>) =>
        new FirebaseAppError('app/invalid-input', `Invalid ${field}`, operation, context),

    cookieExpired: (operation: string, context?: Record<string, any>) =>
        new FirebaseAppError('app/cookie-expired', 'Session expired', operation, context),

    duplicateRating: (operation: string, context?: Record<string, any>) =>
        new FirebaseAppError('app/duplicate-rating', 'Already rated this business', operation, context)
};

/**
 * Error boundary helper for React components
 */
export function isFirebaseError(error: any): error is FirebaseAppError {
    return error instanceof FirebaseAppError;
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: FirebaseAppError): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCodes = ['firestore/data-loss', 'firestore/internal'];
    const highCodes = ['firestore/permission-denied', 'auth/user-disabled'];
    const mediumCodes = ['firestore/not-found', 'auth/user-not-found', 'app/duplicate-rating'];

    if (criticalCodes.includes(error.code)) return 'critical';
    if (highCodes.includes(error.code)) return 'high';
    if (mediumCodes.includes(error.code)) return 'medium';
    return 'low';
}

/**
 * Offline mode manager for handling network failures
 */
export class OfflineManager {
    private static instance: OfflineManager;
    private isOnline = navigator.onLine;
    private pendingOperations: PendingOperation[] = [];
    private syncInProgress = false;
    private listeners: Array<(isOnline: boolean) => void> = [];

    static getInstance(): OfflineManager {
        if (!OfflineManager.instance) {
            OfflineManager.instance = new OfflineManager();
        }
        return OfflineManager.instance;
    }

    constructor() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyListeners(true);
            this.syncPendingOperations();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyListeners(false);
        });

        // Load pending operations from storage
        this.loadPendingOperations();
    }

    /**
     * Check if the app is currently online
     */
    getOnlineStatus(): boolean {
        return this.isOnline;
    }

    /**
     * Add listener for online status changes
     */
    addOnlineStatusListener(listener: (isOnline: boolean) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Queue operation for later execution when online
     */
    queueOperation(operation: Omit<PendingOperation, 'timestamp' | 'retryCount'>): void {
        this.pendingOperations.push({
            ...operation,
            timestamp: Date.now(),
            retryCount: 0
        });
        this.savePendingOperations();
    }

    /**
     * Execute operation with offline fallback
     */
    async executeWithOfflineFallback<T>(
        operation: () => Promise<T>,
        fallbackData?: T,
        operationInfo?: Omit<PendingOperation, 'timestamp' | 'retryCount'>
    ): Promise<T> {
        if (!this.isOnline) {
            if (operationInfo) {
                this.queueOperation(operationInfo);
            }

            if (fallbackData !== undefined) {
                return fallbackData;
            }

            throw new FirebaseAppError(
                'app/offline',
                'Operation requires internet connection',
                operationInfo?.operationName || 'unknown',
                { isOnline: false }
            );
        }

        try {
            return await operation();
        } catch (error) {
            const firebaseError = handleFirebaseError(error, operationInfo?.operationName || 'unknown');

            // If it's a network error and we have fallback data, use it
            if (firebaseError.code === 'app/network-error' && fallbackData !== undefined) {
                if (operationInfo) {
                    this.queueOperation(operationInfo);
                }
                return fallbackData;
            }

            throw firebaseError;
        }
    }

    /**
     * Sync all pending operations
     */
    private async syncPendingOperations(): Promise<void> {
        if (this.syncInProgress || !this.isOnline || this.pendingOperations.length === 0) {
            return;
        }

        this.syncInProgress = true;
        const operationsToSync = [...this.pendingOperations];
        const successfulOperations: string[] = [];

        console.log(`Syncing ${operationsToSync.length} pending operations...`);

        for (const operation of operationsToSync) {
            try {
                await this.executePendingOperation(operation);
                successfulOperations.push(operation.id);
            } catch (error) {
                operation.retryCount++;
                operation.lastError = error instanceof Error ? error.message : String(error);

                // Remove operation if it has failed too many times
                if (operation.retryCount >= 5) {
                    console.error(`Removing failed operation after 5 attempts:`, operation);
                    successfulOperations.push(operation.id);
                }
            }
        }

        // Remove successful operations
        this.pendingOperations = this.pendingOperations.filter(
            op => !successfulOperations.includes(op.id)
        );

        this.savePendingOperations();
        this.syncInProgress = false;

        console.log(`Sync completed. ${successfulOperations.length} operations processed.`);
    }

    /**
     * Execute a pending operation
     */
    private async executePendingOperation(operation: PendingOperation): Promise<void> {
        // This would need to be implemented based on the specific operation type
        // For now, we'll just log it
        console.log('Executing pending operation:', operation);

        // In a real implementation, you would:
        // 1. Reconstruct the operation based on the type and data
        // 2. Execute it against Firebase
        // 3. Handle any errors appropriately
    }

    /**
     * Save pending operations to local storage
     */
    private savePendingOperations(): void {
        try {
            localStorage.setItem('welcomeWinks_pendingOperations', JSON.stringify(this.pendingOperations));
        } catch (error) {
            console.warn('Failed to save pending operations:', error);
        }
    }

    /**
     * Load pending operations from local storage
     */
    private loadPendingOperations(): void {
        try {
            const stored = localStorage.getItem('welcomeWinks_pendingOperations');
            if (stored) {
                this.pendingOperations = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load pending operations:', error);
            this.pendingOperations = [];
        }
    }

    /**
     * Notify all listeners of online status change
     */
    private notifyListeners(isOnline: boolean): void {
        this.listeners.forEach(listener => {
            try {
                listener(isOnline);
            } catch (error) {
                console.warn('Error in online status listener:', error);
            }
        });
    }

    /**
     * Clear all pending operations (for testing or reset)
     */
    clearPendingOperations(): void {
        this.pendingOperations = [];
        this.savePendingOperations();
    }

    /**
     * Get pending operations count
     */
    getPendingOperationsCount(): number {
        return this.pendingOperations.length;
    }
}

/**
 * Pending operation interface
 */
export interface PendingOperation {
    id: string;
    operationName: string;
    operationType: 'create' | 'update' | 'delete';
    collection: string;
    documentId?: string;
    data?: any;
    timestamp: number;
    retryCount: number;
    lastError?: string;
}

/**
 * Enhanced error recovery utilities
 */
export class ErrorRecovery {
    /**
     * Attempt to recover from authentication errors
     */
    static async recoverFromAuthError(error: FirebaseAppError): Promise<boolean> {
        switch (error.code) {
            case 'auth/requires-recent-login':
                // Could trigger re-authentication flow
                console.warn('Recent login required - should trigger re-auth flow');
                return false;

            case 'auth/network-request-failed':
                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, 2000));
                return true;

            case 'auth/too-many-requests':
                // Wait longer before retry
                await new Promise(resolve => setTimeout(resolve, 10000));
                return true;

            default:
                return false;
        }
    }

    /**
     * Attempt to recover from Firestore errors
     */
    static async recoverFromFirestoreError(error: FirebaseAppError): Promise<boolean> {
        switch (error.code) {
            case 'firestore/unavailable':
            case 'firestore/deadline-exceeded':
                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                return true;

            case 'firestore/resource-exhausted':
                // Wait longer for quota reset
                await new Promise(resolve => setTimeout(resolve, 60000));
                return true;

            case 'firestore/aborted':
                // Retry immediately
                return true;

            default:
                return false;
        }
    }
}

/**
 * Performance monitoring for Firebase operations
 */
export class PerformanceMonitor {
    private static metrics = new Map<string, OperationMetrics>();

    static startOperation(operationName: string): string {
        const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        if (!this.metrics.has(operationName)) {
            this.metrics.set(operationName, {
                operationName,
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                totalDuration: 0,
                averageDuration: 0,
                minDuration: Infinity,
                maxDuration: 0,
                lastError: null,
                lastSuccess: null
            });
        }

        const metrics = this.metrics.get(operationName)!;
        metrics.totalCalls++;

        // Store start time for this specific operation
        (globalThis as any)[`_perf_${operationId}`] = Date.now();

        return operationId;
    }

    static endOperation(operationId: string, success: boolean, error?: FirebaseAppError): void {
        const startTime = (globalThis as any)[`_perf_${operationId}`];
        if (!startTime) return;

        const duration = Date.now() - startTime;
        const operationName = operationId.split('_')[0];
        const metrics = this.metrics.get(operationName);

        if (!metrics) return;

        // Update metrics
        metrics.totalDuration += duration;
        metrics.averageDuration = metrics.totalDuration / metrics.totalCalls;
        metrics.minDuration = Math.min(metrics.minDuration, duration);
        metrics.maxDuration = Math.max(metrics.maxDuration, duration);

        if (success) {
            metrics.successfulCalls++;
            metrics.lastSuccess = new Date();
        } else {
            metrics.failedCalls++;
            metrics.lastError = error || null;
        }

        // Clean up
        delete (globalThis as any)[`_perf_${operationId}`];

        // Log slow operations
        if (duration > 5000) {
            console.warn(`Slow Firebase operation detected: ${operationName} took ${duration}ms`);
        }
    }

    static getMetrics(operationName?: string): OperationMetrics | Map<string, OperationMetrics> {
        if (operationName) {
            return this.metrics.get(operationName) || this.createEmptyMetrics(operationName);
        }
        return new Map(this.metrics);
    }

    private static createEmptyMetrics(operationName: string): OperationMetrics {
        return {
            operationName,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalDuration: 0,
            averageDuration: 0,
            minDuration: 0,
            maxDuration: 0,
            lastError: null,
            lastSuccess: null
        };
    }

    static reset(): void {
        this.metrics.clear();
    }
}

/**
 * Operation metrics interface
 */
export interface OperationMetrics {
    operationName: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    lastError: FirebaseAppError | null;
    lastSuccess: Date | null;
}