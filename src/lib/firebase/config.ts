
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth as getFirebaseAuthSDK, type Auth } from "firebase/auth";

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

// Define the expected structure of your Firebase config
interface FirebaseConfig {
  apiKey: string | undefined;
  authDomain: string | undefined;
  projectId: string | undefined;
  storageBucket: string | undefined;
  messagingSenderId: string | undefined;
  appId: string | undefined;
  measurementId?: string | undefined; // Optional
}

const firebaseConfigValues: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const validateFirebaseConfig = (config: FirebaseConfig): void => {
  const requiredKeys: (keyof FirebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];
  const missingKeys = requiredKeys.filter(key => !config[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Firebase configuration is missing or incomplete. Please check your .env.local file. Missing keys: ${missingKeys.join(', ')}. Ensure all NEXT_PUBLIC_FIREBASE_* variables are set.`
    );
  }
  // Specifically check for API Key and Project ID as they are absolutely critical for basic init
  if (!config.apiKey) {
     throw new Error("Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is not defined. Please check your .env.local file.");
  }
  if (!config.projectId) {
    throw new Error("Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not defined. Please check your .env.local file.");
  }
};

function initializeFirebase() {
  if (appInstance) return; // Already initialized

  validateFirebaseConfig(firebaseConfigValues);
  
  // Type assertion to satisfy initializeApp, after validation
  // This assumes all validated keys are now definitely strings
  const validatedConfig = firebaseConfigValues as {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };

  appInstance = !getApps().length ? initializeApp(validatedConfig) : getApp();
  dbInstance = getFirestore(appInstance);
  authInstance = getFirebaseAuthSDK(appInstance);
}

// Getter functions that ensure Firebase is initialized before returning the instance
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

export function getAuth(): Auth {
  if (!authInstance) {
    initializeFirebase();
  }
  return authInstance!;
}

