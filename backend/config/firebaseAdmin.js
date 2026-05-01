const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables or service account file
let firebaseConfig;
let isFirebaseConfigured = false;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  // Use environment variables (recommended for production)
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };
  isFirebaseConfigured = true;
} else {
  // Fallback to service account file (for development)
  try {
    const serviceAccount = require('./firebase-service-account.json');
    firebaseConfig = serviceAccount;
    isFirebaseConfigured = true;
  } catch (error) {
    console.warn('⚠️  Firebase service account file not found. Firebase authentication will be disabled.');
    console.warn('   To enable Firebase auth, either:');
    console.warn('   1. Add firebase-service-account.json to projects/backend/config/');
    console.warn('   2. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables');
    isFirebaseConfigured = false;
  }
}

if (isFirebaseConfigured && firebaseConfig) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
    console.log('✅ Firebase Admin initialized successfully');
    module.exports = admin;
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    // Export a mock admin object to prevent crashes
    module.exports = {
      auth: () => ({
        verifyIdToken: () => Promise.reject(new Error('Firebase initialization failed'))
      })
    };
  }
} else {
  // Export a mock admin object when Firebase is not configured
  module.exports = {
    auth: () => ({
      verifyIdToken: () => Promise.reject(new Error('Firebase not configured'))
    })
  };
}
