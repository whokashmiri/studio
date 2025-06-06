
import * as admin from 'firebase-admin';

let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;
let sdkInitializationError: string | null = null;

if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!privateKey) {
      throw new Error('FIREBASE_PRIVATE_KEY is not set in environment variables. This is required for Firebase Admin SDK.');
    }
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID is not set in environment variables. This is required for Firebase Admin SDK.');
    }
    if (!clientEmail) {
      throw new Error('FIREBASE_CLIENT_EMAIL is not set in environment variables. This is required for Firebase Admin SDK.');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // Replace escaped newlines if present, common in some env var setups
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin SDK initialized successfully.');
    // Attempt to get services immediately after successful initialization
    adminAuth = admin.auth();
    adminDb = admin.firestore();
    if (!adminAuth || !adminDb) {
        const missingServicesError = 'Firebase Admin SDK initialized, but failed to get Auth or Firestore services.';
        console.error(missingServicesError);
        // This state is unusual but capture it if it occurs
        sdkInitializationError = sdkInitializationError ? `${sdkInitializationError}; ${missingServicesError}` : missingServicesError;
    }

  } catch (error: any) {
    sdkInitializationError = `Firebase Admin SDK initialization failed: ${error.message}`;
    console.error(sdkInitializationError);
    // adminAuth and adminDb will remain undefined
  }
} else {
  // App is already initialized, assume it was successful elsewhere or by a previous import
  console.log('Firebase Admin SDK: An app instance already exists. Attempting to retrieve services.');
  try {
    adminAuth = admin.auth();
    adminDb = admin.firestore();
     if (!adminAuth || !adminDb) {
        const retrievalError = 'Firebase Admin SDK: App instance exists, but failed to retrieve Auth or Firestore services.';
        console.warn(retrievalError);
        sdkInitializationError = sdkInitializationError ? `${sdkInitializationError}; ${retrievalError}` : retrievalError;

     } else {
        console.log('Firebase Admin SDK: Services retrieved successfully from pre-existing app instance.');
     }
  } catch (error: any) {
    const serviceRetrievalError = `Firebase Admin SDK: Error getting services from pre-existing app instance: ${error.message}`;
    console.error(serviceRetrievalError);
    sdkInitializationError = sdkInitializationError ? `${sdkInitializationError}; ${serviceRetrievalError}` : serviceRetrievalError;
  }
}

// This export can be used by health checks or other parts of the app
// to understand if the admin SDK is properly configured.
export const adminSDKError = sdkInitializationError;

export { adminAuth, adminDb };
