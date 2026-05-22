#!/bin/bash
cd /var/www/goroomz/backend
node -e '
const admin = require("./config/firebaseAdmin");
if (typeof admin.auth === "function") {
  console.log("✅ Firebase Admin SDK loaded successfully");
} else {
  console.log("❌ Firebase Admin NOT loaded - using mock");
  console.log("Checking file...");
  const fs = require("fs");
  const path = require("path");
  const fp = path.join(__dirname, "config", "firebase-service-account.json");
  console.log("File exists:", fs.existsSync(fp));
  console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID || "NOT SET");
  console.log("FIREBASE_PRIVATE_KEY set:", !!process.env.FIREBASE_PRIVATE_KEY);
  console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL || "NOT SET");
}
process.exit(0);
'
