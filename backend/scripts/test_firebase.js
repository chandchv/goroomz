// Test Firebase Admin initialization - no dotenv needed
process.env.FIREBASE_PROJECT_ID = 'goroomz-4ac3c';
const admin = require('/var/www/goroomz/backend/config/firebaseAdmin');
console.log('Firebase admin type:', typeof admin);
console.log('Has auth function:', typeof admin.auth === 'function');
process.exit(0);
