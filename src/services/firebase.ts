import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { validateFirebaseConfig } from '../utils/firebase-errors';

// Validate configuration before initializing
validateFirebaseConfig();

const firebaseConfig = {
  apiKey: "AIzaSyAPnk2vv6Ttf8fr1GQCg18_YmTXmU7YHpM",
  authDomain: "welcome-winks.firebaseapp.com",
  projectId: "welcome-winks",
  storageBucket: "welcome-winks.firebasestorage.app",
  messagingSenderId: "969280247510",
  appId: "1:969280247510:web:3df9c199c5e9f2be859b77",
  measurementId: "G-VMTMMP4LLR"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (only in production and if supported)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (import.meta.env.PROD) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized');
    }
  }).catch((error) => {
    console.warn('Failed to initialize Firebase Analytics:', error);
  });
}

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.warn('Failed to connect to Firebase emulators:', error);
  }
}

export default app;