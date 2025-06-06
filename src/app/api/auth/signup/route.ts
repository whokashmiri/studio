
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/firebase-admin';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  companyName: z.string().min(1, "Company name is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = signupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid input", details: validationResult.error.flatten() }, { status: 400 });
    }

    const { email, password, companyName } = validationResult.data;

    // Check if adminDb is initialized
    if (!adminDb) {
      console.error("Firestore Admin SDK not initialized.");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }
     if (!adminAuth) {
      console.error("Firebase Auth Admin SDK not initialized.");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }


    // Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: email, // Or derive from email, or add a name field to signup
    });

    // Create company in Firestore
    const companyRef = adminDb.collection('companies').doc();
    await companyRef.set({
      name: companyName,
      createdByUid: userRecord.uid,
      createdAt: new Date().toISOString(),
    });
    const companyId = companyRef.id;

    // Create user profile in Firestore to link user to company
    // This is useful for storing additional user-specific app data
    const userProfileRef = adminDb.collection('users').doc(userRecord.uid);
    await userProfileRef.set({
      email: userRecord.email,
      uid: userRecord.uid,
      companyId: companyId,
      companyName: companyName, // Denormalize for easier access if needed
      createdAt: new Date().toISOString(),
    });

    // Optionally, set custom claims if you need companyId directly on the ID token
    // await adminAuth.setCustomUserClaims(userRecord.uid, { companyId });

    return NextResponse.json({ 
      message: "User created successfully", 
      uid: userRecord.uid, 
      companyId 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Signup error:", error);
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "An unexpected error occurred", details: error.message }, { status: 500 });
  }
}
