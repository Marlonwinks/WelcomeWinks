import { 
    FirebaseAppError, 
    RetryManager, 
    RetryOptions, 
    OfflineManager, 
    ErrorRecovery, 
    PerformanceMonitor,
    logFirebaseError,
    getErrorSeverity
} from '../utils/firebase-errors';

/**
 * Comprehensive error handling service for Firebase operations
 */
export class ErrorHandlingService {
    private static instance: ErrorHandlingService;
    private offlineManager: OfflineManager;
    private errorQueue: ErrorQueueItem[] = [];
    private maxErrorQueueSize = 100;

    static getInstance(): ErrorHandlingService {
        if (!ErrorHandlingService.instance) {
            ErrorHandlingService.instance = new ErrorHandlingService();
        }
        return ErrorHandlingService.instance;
    }

    constructor() {
        this.offlineManager = OfflineManager.getInstance();
        this.setupErrorReporting();
    }

    /**
     * Execute Firebase operation with comprehensive error handling
     */
    async executeOperation<T>(
        operation: () => Promise<T>,
        options: ExecuteOperationOptions = {}
    ): Promise<T> {
        const {
            operationName = 'unknown-operation',
            retryOptions = {},
            fallbackData,
            enableOfflineSupport = true,
            enablePerformanceMonitoring = true,
            enableErrorRecovery = true
        } = options;

        // Start performance monitoring
        const operationId = enablePerformanceMonitoring 
            ? PerformanceMonitor.startOperation(operationName)
            : '';

        try {
            // Check if we should use offline fallback
            if (enableOfflineSupport && !this.offlineManager.getOnlineStatus()) {
                if (fallbackData !== undefined) {
                    console.warn(`Using offline fallback for ${operationName}`);
                    return fallbackData;
                }
                throw new FirebaseAppError(
                    'app/offline',
                    'Operation requires internet connection',
                    operationName,
                    { isOnline: false }
                );
            }

            // Execute with retry logic
            const result = await RetryManager.retryOperation(async () => {
                try {
                    return await operation();
                } catch (error) {
                    const firebaseError = error instanceof FirebaseAppError 
                        ? error 
                        : new FirebaseAppError(
                            'app/unknown-error',
                            error instanceof Error ? error.message : String(error),
                            operationName,
                            {},
                            error instanceof Error ? error : undefined
                        );

                    // Attempt error recovery if enabled
                    if (enableErrorRecovery) {
                        const recovered = await this.attemptErrorRecovery(firebaseError);
                        if (!recovered) {
                            throw firebaseError;
                        }
                        // If recovery was successful, retry the operation
                        return await operation();
                    }

                    throw firebaseError;
                }
            }, {
                operationName,
                ...retryOptions
            });

            // Record successful operation
            if (enablePerformanceMonitoring) {
                PerformanceMonitor.endOperation(operationId, true);
            }

            return result;

        } catch (error) {
            const firebaseError = error instanceof FirebaseAppError 
                ? error 
                : new FirebaseAppError(
                    'app/unknown-error',
                    error instanceof Error ? error.message : String(error),
                    operationName,
                    {},
                    error instanceof Error ? error : undefined
                );

            // Record failed operation
            if (enablePerformanceMonitoring) {
                PerformanceMonitor.endOperation(operationId, false, firebaseError);
            }

            // Handle offline scenarios
            if (enableOfflineSupport && this.isNetworkError(firebaseError)) {
                if (fallbackData !== undefined) {
                    console.warn(`Using fallback data due to network error in ${operationName}`);
                    return fallbackData;
                }
            }

            // Log and queue error
            this.handleError(firebaseError);

            throw firebaseError;
        }
    }

    /**
     * Execute batch operations with error handling
     */
    async executeBatchOperations<T>(
        operations: Array<{
            operation: () => Promise<T>;
            operationName: string;
            fallbackData?: T;
        }>,
        options: BatchExecutionOptions = {}
    ): Promise<Array<{ success: boolean; result?: T; error?: FirebaseAppError }>> {
        const {
            continueOnError = true,
            maxConcurrency = 5,
            enablePerformanceMonitoring = true
        } = options;

        const results: Array<{ success: boolean; result?: T; error?: FirebaseAppError }> = [];
        const semaphore = new Semaphore(maxConcurrency);

        const executeWithSemaphore = async (
            operationInfo: typeof operations[0],
            index: number
        ) => {
            await semaphore.acquire();
            
            try {
                const result = await this.executeOperation(operationInfo.operation, {
                    operationName: `${operationInfo.operationName}_batch_${index}`,
                    fallbackData: operationInfo.fallbackData,
                    enablePerformanceMonitoring
                });
                
                results[index] = { success: true, result };
            } catch (error) {
                const firebaseError = error instanceof FirebaseAppError ? error : new FirebaseAppError(
                    'app/batch-operation-failed',
                    error instanceof Error ? error.message : String(error),
                    operationInfo.operationName
                );
                
                results[index] = { success: false, error: firebaseError };
                
                if (!continueOnError) {
                    throw firebaseError;
                }
            } finally {
                semaphore.release();
            }
        };

        // Execute all operations
        const promises = operations.map((op, index) => executeWithSemaphore(op, index));
        
        if (continueOnError) {
            await Promise.allSettled(promises);
        } else {
            await Promise.all(promises);
        }

        return results;
    }

    /**
     * Handle authentication errors specifically
     */
    async handleAuthError(error: FirebaseAppError): Promise<AuthErrorHandlingResult> {
        const severity = getErrorSeverity(error);
        
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return {
                    shouldRetry: false,
                    shouldReauthenticate: false,
                    userMessage: error.getUserMessage(),
                    severity: 'medium'
                };

            case 'auth/too-many-requests':
                return {
                    shouldRetry: true,
                    retryAfter: 300000, // 5 minutes
                    shouldReauthenticate: false,
                    userMessage: 'Too many failed attempts. Please try again in 5 minutes.',
                    severity: 'high'
                };

            case 'auth/requires-recent-login':
                return {
                    shouldRetry: false,
                    shouldReauthenticate: true,
                    userMessage: 'Please log in again to continue.',
                    severity: 'medium'
                };

            case 'auth/network-request-failed':
                return {
                    shouldRetry: true,
                    retryAfter: 5000,
                    shouldReauthenticate: false,
                    userMessage: 'Network error. Please check your connection and try again.',
                    severity: 'low'
                };

            default:
                return {
                    shouldRetry: false,
                    shouldReauthenticate: false,
                    userMessage: error.getUserMessage(),
                    severity
                };
        }
    }

    /**
     * Handle Firestore errors specifically
     */
    async handleFirestoreError(error: FirebaseAppError): Promise<FirestoreErrorHandlingResult> {
        const severity = getErrorSeverity(error);

        switch (error.code) {
            case 'firestore/permission-denied':
                return {
                    shouldRetry: false,
                    shouldRefreshAuth: true,
                    userMessage: 'Permission denied. Please log in again.',
                    severity: 'high'
                };

            case 'firestore/not-found':
                return {
                    shouldRetry: false,
                    shouldRefreshAuth: false,
                    userMessage: 'The requested data was not found.',
                    severity: 'medium'
                };

            case 'firestore/unavailable':
                return {
                    shouldRetry: true,
                    retryAfter: 5000,
                    shouldRefreshAuth: false,
                    userMessage: 'Service temporarily unavailable. Retrying...',
                    severity: 'medium'
                };

            case 'firestore/resource-exhausted':
                return {
                    shouldRetry: true,
                    retryAfter: 60000, // 1 minute
                    shouldRefreshAuth: false,
                    userMessage: 'Service is busy. Please try again in a moment.',
                    severity: 'high'
                };

            case 'firestore/deadline-exceeded':
                return {
                    shouldRetry: true,
                    retryAfter: 2000,
                    shouldRefreshAuth: false,
                    userMessage: 'Request timed out. Retrying...',
                    severity: 'medium'
                };

            default:
                return {
                    shouldRetry: error.retryable,
                    shouldRefreshAuth: false,
                    userMessage: error.getUserMessage(),
                    severity
                };
        }
    }

    /**
     * Get error statistics for monitoring
     */
    getErrorStatistics(): ErrorStatistics {
        const now = Date.now();
        const last24Hours = now - (24 * 60 * 60 * 1000);
        const last1Hour = now - (60 * 60 * 1000);

        const recent24h = this.errorQueue.filter(e => e.timestamp > last24Hours);
        const recent1h = this.errorQueue.filter(e => e.timestamp > last1Hour);

        const errorsByCode = new Map<string, number>();
        const errorsBySeverity = new Map<string, number>();

        recent24h.forEach(error => {
            errorsByCode.set(error.code, (errorsByCode.get(error.code) || 0) + 1);
            errorsBySeverity.set(error.severity, (errorsBySeverity.get(error.severity) || 0) + 1);
        });

        return {
            totalErrors24h: recent24h.length,
            totalErrors1h: recent1h.length,
            errorsByCode: Object.fromEntries(errorsByCode),
            errorsBySeverity: Object.fromEntries(errorsBySeverity),
            mostCommonError: this.getMostCommonError(recent24h),
            errorRate24h: recent24h.length / 24, // errors per hour
            isHealthy: recent1h.length < 10 && !recent1h.some(e => e.severity === 'critical')
        };
    }

    /**
     * Clear error queue (for testing or maintenance)
     */
    clearErrorQueue(): void {
        this.errorQueue = [];
    }

    /**
     * Get recent errors for debugging
     */
    getRecentErrors(limit: number = 50): ErrorQueueItem[] {
        return this.errorQueue
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Attempt to recover from an error
     */
    private async attemptErrorRecovery(error: FirebaseAppError): Promise<boolean> {
        if (error.code.startsWith('auth/')) {
            return await ErrorRecovery.recoverFromAuthError(error);
        } else if (error.code.startsWith('firestore/')) {
            return await ErrorRecovery.recoverFromFirestoreError(error);
        }
        return false;
    }

    /**
     * Check if error is network-related
     */
    private isNetworkError(error: FirebaseAppError): boolean {
        const networkErrorCodes = [
            'auth/network-request-failed',
            'firestore/unavailable',
            'firestore/deadline-exceeded',
            'app/network-error'
        ];
        return networkErrorCodes.includes(error.code);
    }

    /**
     * Handle and log errors
     */
    private handleError(error: FirebaseAppError): void {
        // Add to error queue
        this.errorQueue.push({
            timestamp: Date.now(),
            code: error.code,
            message: error.message,
            operation: error.operation,
            severity: getErrorSeverity(error),
            context: error.context
        });

        // Maintain queue size
        if (this.errorQueue.length > this.maxErrorQueueSize) {
            this.errorQueue = this.errorQueue.slice(-this.maxErrorQueueSize);
        }

        // Log error
        logFirebaseError(error);

        // Send to external monitoring if configured
        this.reportToExternalMonitoring(error);
    }

    /**
     * Setup error reporting
     */
    private setupErrorReporting(): void {
        // Global error handler for unhandled Firebase errors
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason instanceof FirebaseAppError) {
                this.handleError(event.reason);
            }
        });
    }

    /**
     * Report to external monitoring service
     */
    private reportToExternalMonitoring(error: FirebaseAppError): void {
        // This would integrate with services like Sentry, LogRocket, etc.
        // For now, we'll just log to console in development
        if (import.meta.env.DEV) {
            console.group(`🔥 Firebase Error: ${error.code}`);
            console.error('Message:', error.getUserMessage());
            console.error('Operation:', error.operation);
            console.error('Context:', error.context);
            console.error('Severity:', getErrorSeverity(error));
            console.error('Stack:', error.stack);
            console.groupEnd();
        }
    }

    /**
     * Get most common error from error list
     */
    private getMostCommonError(errors: ErrorQueueItem[]): string | null {
        if (errors.length === 0) return null;

        const errorCounts = new Map<string, number>();
        errors.forEach(error => {
            errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + 1);
        });

        let mostCommon = '';
        let maxCount = 0;
        errorCounts.forEach((count, code) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = code;
            }
        });

        return mostCommon;
    }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
    private permits: number;
    private waitQueue: Array<() => void> = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--;
            return;
        }

        return new Promise<void>((resolve) => {
            this.waitQueue.push(resolve);
        });
    }

    release(): void {
        this.permits++;
        if (this.waitQueue.length > 0) {
            const resolve = this.waitQueue.shift()!;
            this.permits--;
            resolve();
        }
    }
}

/**
 * Interfaces
 */
export interface ExecuteOperationOptions {
    operationName?: string;
    retryOptions?: RetryOptions;
    fallbackData?: any;
    enableOfflineSupport?: boolean;
    enablePerformanceMonitoring?: boolean;
    enableErrorRecovery?: boolean;
}

export interface BatchExecutionOptions {
    continueOnError?: boolean;
    maxConcurrency?: number;
    enablePerformanceMonitoring?: boolean;
}

export interface AuthErrorHandlingResult {
    shouldRetry: boolean;
    retryAfter?: number;
    shouldReauthenticate: boolean;
    userMessage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface FirestoreErrorHandlingResult {
    shouldRetry: boolean;
    retryAfter?: number;
    shouldRefreshAuth: boolean;
    userMessage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorQueueItem {
    timestamp: number;
    code: string;
    message: string;
    operation: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
}

export interface ErrorStatistics {
    totalErrors24h: number;
    totalErrors1h: number;
    errorsByCode: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    mostCommonError: string | null;
    errorRate24h: number;
    isHealthy: boolean;
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance();