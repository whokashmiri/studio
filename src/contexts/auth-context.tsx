
"use client";
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  Auth, 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword // Only for client-side if not using API
} from 'firebase/auth';
import { doc, getDoc, Firestore } from 'firebase/firestore';
import { auth as firebaseClientAuth, db as firebaseClientDb } from '@/lib/firebase/config'; // Client SDK
import { useRouter } from 'next/navigation';


interface User {
  uid: string;
  email: string | null;
  name: string | null; // displayName from Firebase Auth
  avatarUrl?: string | null; // photoURL from Firebase Auth
  companyId?: string; 
  companyName?: string;
  isLoading: boolean; // To track initial auth state loading
}

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<FirebaseUser | null>;
  signup: (email: string, pass: string, companyName: string) => Promise<{uid: string; companyId: string} | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const router = useRouter();

  useEffect(() => {
    if (!firebaseClientAuth || !firebaseClientDb) {
      console.warn("Firebase client auth or db not available in AuthProvider.");
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseClientAuth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch additional profile data
        const userProfileRef = doc(firebaseClientDb, "users", firebaseUser.uid);
        try {
          const userProfileSnap = await getDoc(userProfileRef);
          if (userProfileSnap.exists()) {
            const userProfileData = userProfileSnap.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              avatarUrl: firebaseUser.photoURL,
              companyId: userProfileData.companyId,
              companyName: userProfileData.companyName,
              isLoading: false,
            });
          } else {
            // User exists in Auth, but no profile in Firestore (should not happen with proper signup)
            console.warn("User profile not found in Firestore for UID:", firebaseUser.uid);
            setUser({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email, 
              name: firebaseUser.displayName, 
              avatarUrl: firebaseUser.photoURL,
              isLoading: false,
            });
          }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setUser({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email, 
              name: firebaseUser.displayName, 
              avatarUrl: firebaseUser.photoURL,
              isLoading: false, // Still set loading to false
            });
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<FirebaseUser | null> => {
    if (!firebaseClientAuth) throw new Error("Firebase auth not initialized");
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseClientAuth, email, pass);
      // onAuthStateChanged will handle setting the user state with profile data
      return userCredential.user;
    } catch (error) {
      console.error("Login error:", error);
      throw error; // Re-throw to be caught by the form
    }
  };

  const signup = async (email: string, pass: string, companyName: string): Promise<{uid: string; companyId: string} | null> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, companyName }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      // After successful API signup, Firebase Auth state should change.
      // To ensure immediate login feel, attempt client-side login if API doesn't auto-sign-in.
      // However, onAuthStateChanged should pick up the new user if backend creates it properly.
      // For simplicity, we rely on onAuthStateChanged. The API returns uid and companyId.
      // Optionally, trigger a manual sign-in here if needed, or just let onAuthStateChanged handle it.
      await login(email, pass); // Attempt to login the user client-side after server-side creation
      return data; // uid, companyId
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = async () => {
    if (!firebaseClientAuth) throw new Error("Firebase auth not initialized");
    try {
      await firebaseSignOut(firebaseClientAuth);
      // onAuthStateChanged will set user to null
      router.push('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };
  
  // Provide a user object that includes the isLoading state for the initial check
  const contextUser = user ? { ...user, isLoading } : (isLoading ? { isLoading: true, uid: '', email: null, name: null } : null);


  return (
    <AuthContext.Provider value={{ user: contextUser as User | null, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
