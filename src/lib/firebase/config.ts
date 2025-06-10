
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth as getFirebaseAuthSDK, type Auth } from "firebase/auth"; // Renamed import

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

function initializeFirebase() {
  if (appInstance) return; // Already initialized

  if (!firebaseConfigValues.apiKey) {
    throw new Error("Firebase API Key is not defined. Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is set.");
  }

  // Ensure all required config values are present (example for projectId)
  if (!firebaseConfigValues.projectId) {
    throw new Error("Firebase Project ID is not defined. Please check your .env.local file.");
  }
  
  appInstance = !getApps().length ? initializeApp(firebaseConfigValues) : getApp();
  dbInstance = getFirestore(appInstance);
  authInstance = getFirebaseAuthSDK(appInstance); // Use renamed import
}

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    initializeFirebase();
  }
  return appInstance!;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    initializeFirebase();
  }
  return dbInstance!;
}

export function getAuth(): Auth { // Export a function named getAuth
  if (!authInstance) {
    initializeFirebase();
  }
  return authInstance!;
}
