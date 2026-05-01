import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const isDevMode = import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const isPlaceholderConfig = firebaseConfig.apiKey?.includes('placeholder') || 
                            !firebaseConfig.apiKey ||
                            firebaseConfig.projectId?.includes('placeholder');

const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseKeys.length && typeof window !== 'undefined') {
  console.warn(
    '[Firebase] Missing configuration values:',
    missingFirebaseKeys.join(', ')
  );
}

let app = null;
let auth = null;

if (isPlaceholderConfig && isDevMode) {
  console.warn('⚠️  Firebase is using placeholder config - authentication will be disabled in development mode');
  // Create a mock auth object for development
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback) => {
      callback(null);
      return () => {}; // unsubscribe function
    },
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
    signOut: () => Promise.resolve(),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
  };
} else {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
    if (isDevMode) {
      console.warn('⚠️  Using mock auth due to Firebase error');
      auth = {
        currentUser: null,
        onAuthStateChanged: (callback) => {
          callback(null);
          return () => {};
        },
        signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
        signOut: () => Promise.resolve(),
        createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
      };
    } else {
      throw error;
    }
  }
}

export { auth };
