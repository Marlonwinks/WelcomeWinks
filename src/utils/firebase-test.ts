import { auth, db } from '../services/firebase';
import { authService, ratingsService, cookieAccountService } from '../services';
import { handleFirebaseError, logFirebaseError } from './firebase-errors';

/**
 * Test Firebase connection and services
 */
export async function testFirebaseConnection(): Promise<{
  success: boolean;
  results: Record<string, boolean>;
  errors: string[];
}> {
  const results: Record<string, boolean> = {};
  const errors: string[] = [];

  // Test Firebase initialization
  try {
    results.firebaseInit = !!(auth && db);
  } catch (error) {
    results.firebaseInit = false;
    errors.push(`Firebase initialization failed: ${error}`);
  }

  // Test Auth service
  try {
    const cookieId = await cookieAccountService.generateCookieId();
    results.authService = !!cookieId && cookieId.startsWith('cookie_');
  } catch (error) {
    results.authService = false;
    errors.push(`Auth service test failed: ${error}`);
  }

  // Test Ratings service
  try {
    const welcomingLevel = ratingsService.calculateWelcomingLevel(5);
    results.ratingsService = welcomingLevel === 'very-welcoming';
  } catch (error) {
    results.ratingsService = false;
    errors.push(`Ratings service test failed: ${error}`);
  }

  // Test Cookie Account service
  try {
    const isSupported = cookieAccountService.isBrowserSupported();
    results.cookieAccountService = isSupported;
  } catch (error) {
    results.cookieAccountService = false;
    errors.push(`Cookie Account service test failed: ${error}`);
  }

  // Test error handling
  try {
    const testError = handleFirebaseError(
      new Error('Test error'),
      'testOperation'
    );
    results.errorHandling = testError.code === 'app/unknown-error';
  } catch (error) {
    results.errorHandling = false;
    errors.push(`Error handling test failed: ${error}`);
  }

  const success = Object.values(results).every(result => result === true);

  return {
    success,
    results,
    errors
  };
}

/**
 * Test Firebase configuration without making network calls
 */
export function testFirebaseConfig(): {
  success: boolean;
  config: Record<string, boolean>;
  errors: string[];
} {
  const config: Record<string, boolean> = {};
  const errors: string[] = [];

  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  const optionalEnvVars = [
    'VITE_FIREBASE_MEASUREMENT_ID',
  ];

  requiredEnvVars.forEach(envVar => {
    const value = import.meta.env[envVar];
    config[envVar] = !!value && value !== 'your-firebase-api-key' && value !== 'your-project-id';
    
    if (!config[envVar]) {
      errors.push(`Missing or placeholder value for ${envVar}`);
    }
  });

  // Check optional environment variables
  optionalEnvVars.forEach(envVar => {
    const value = import.meta.env[envVar];
    config[envVar] = !!value && value !== 'your-measurement-id';
    
    if (!config[envVar]) {
      console.warn(`Optional Firebase config ${envVar} not set - some features may be disabled`);
    }
  });

  const success = Object.values(config).every(result => result === true);

  return {
    success,
    config,
    errors
  };
}

/**
 * Development helper to log Firebase setup status
 */
export function logFirebaseSetupStatus(): void {
  if (import.meta.env.DEV) {
    console.group('🔥 Firebase Setup Status');
    
    const configTest = testFirebaseConfig();
    console.log('Configuration:', configTest.success ? '✅' : '❌');
    
    if (!configTest.success) {
      console.warn('Configuration errors:', configTest.errors);
      console.warn('Please update your .env file with actual Firebase configuration values');
    }
    
    testFirebaseConnection().then(connectionTest => {
      console.log('Connection:', connectionTest.success ? '✅' : '❌');
      
      if (!connectionTest.success) {
        console.warn('Connection errors:', connectionTest.errors);
      }
      
      console.log('Service Status:', connectionTest.results);
      console.groupEnd();
    }).catch(error => {
      console.error('Failed to test Firebase connection:', error);
      console.groupEnd();
    });
  }
}

/**
 * Production readiness check
 */
export function checkProductionReadiness(): {
  ready: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check environment variables
  const configTest = testFirebaseConfig();
  if (!configTest.success) {
    issues.push('Firebase configuration incomplete');
    issues.push(...configTest.errors);
  }

  // Check for development settings in production
  if (import.meta.env.PROD) {
    if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
      issues.push('Firebase emulator enabled in production');
    }
    
    if (import.meta.env.VITE_FIREBASE_PROJECT_ID?.includes('demo-')) {
      warnings.push('Using demo Firebase project ID');
    }
  }

  // Check browser compatibility
  if (typeof localStorage === 'undefined') {
    issues.push('localStorage not available');
  }

  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    warnings.push('Crypto API not available - using fallback random generation');
  }

  const ready = issues.length === 0;

  return {
    ready,
    issues,
    warnings
  };
}