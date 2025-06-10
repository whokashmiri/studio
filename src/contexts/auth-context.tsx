
"use client";
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthenticatedUser, MockStoredUser, UserRole } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service'; 
import { getAuth as getFirebaseAuthSDK, type Auth } from '@/lib/firebase/config';

const CURRENT_USER_SESSION_KEY = 'currentUserSession';

interface AuthState {
  currentUser: AuthenticatedUser | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  signup: (details: Omit<MockStoredUser, 'id' | 'companyId'> & { companyName: string; password?: string }) => Promise<{ success: boolean; message?: string; userId?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    currentUser: null,
    isLoading: true,
  });
  const router = useRouter();

  useEffect(() => {
    // Initialize Firebase Auth SDK listener if needed, or handle session persistence
    const authSDK = getFirebaseAuthSDK(); // Ensures Firebase is initialized
    // Example: onAuthStateChanged(authSDK, user => { ... });
    // For now, we'll stick to localStorage for simplicity as per previous setup.
    try {
      const storedUserJson = localStorage.getItem(CURRENT_USER_SESSION_KEY);
      if (storedUserJson) {
        const storedUser = JSON.parse(storedUserJson) as AuthenticatedUser;
        setAuthState({ currentUser: storedUser, isLoading: false });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Error reading user session from localStorage:", error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, passwordInput?: string): Promise<{ success: boolean; message?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const foundUser = await FirestoreService.getUserByEmail(email);

      if (foundUser && foundUser.password === passwordInput) { 
        // In a real app with Firebase Auth, you'd verify the password with Firebase Auth SDK
        // For this mock, we compare plaintext.
        const { password, ...userToAuthenticate } = foundUser; // Exclude password from authenticatedUser object
        localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(userToAuthenticate));
        setAuthState({ currentUser: userToAuthenticate, isLoading: false });
        router.push('/');
        return { success: true };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, message: 'Invalid email or password.' };
      }
    } catch (error) {
      console.error("Login error:", error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: 'An unexpected error occurred.' };
    }
  }, [router]);

  const signup = useCallback(async (details: Omit<MockStoredUser, 'id' | 'companyId'> & { companyName: string; password?: string }): Promise<{ success: boolean; message?: string, userId?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const existingUser = await FirestoreService.getUserByEmail(details.email);
      if (existingUser) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, message: 'Email already in use.' };
      }
      
      const allCompanies = await FirestoreService.getCompanies(); 
      const inputCompanyNameUpper = details.companyName.toUpperCase();
      let company = allCompanies.find(c => c.name.toUpperCase() === inputCompanyNameUpper);
      
      if (!company) {
        const newCompanyData = { name: inputCompanyNameUpper }; // Store new company name in uppercase
        const addedCompany = await FirestoreService.addCompany(newCompanyData);
        if (!addedCompany) {
            setAuthState(prev => ({ ...prev, isLoading: false }));
            return { success: false, message: 'Failed to create company.' };
        }
        company = addedCompany; // company.name will be uppercase
      }

      const newUser: MockStoredUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
        email: details.email,
        companyId: company.id,
        companyName: company.name, // This will be the uppercase name
        role: details.role,
        password: details.password, 
      };
      
      const addedUser = await FirestoreService.addUser(newUser);

      if (addedUser) {
        localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(addedUser));
        setAuthState({ currentUser: addedUser, isLoading: false });
        router.push('/');
        return { success: true, userId: newUser.id };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, message: 'Failed to create user account.' };
      }

    } catch (error) {
      console.error("Signup error:", error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: 'An unexpected error occurred during signup.' };
    }
  }, [router]);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(CURRENT_USER_SESSION_KEY);
      setAuthState({ currentUser: null, isLoading: false });
      // Optionally sign out from Firebase Auth SDK if integrated
      // const authSDK = getFirebaseAuthSDK();
      // authSDK.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [router]);
  
  return (
    <AuthContext.Provider value={{ ...authState, login, signup, logout }}>
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
