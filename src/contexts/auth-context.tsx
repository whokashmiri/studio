
"use client";
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthenticatedUser, MockStoredUser, UserRole } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service'; 
// Removed: import { getAuth as getFirebaseAuth } from '@/lib/firebase/config'; // Assuming this was for Firebase Auth SDK directly

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
        const { password, ...userToAuthenticate } = foundUser;
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
      
      // Fetch companies once. FirestoreService.getCompanies() handles seeding if empty.
      const allCompanies = await FirestoreService.getCompanies(); 

      let company = allCompanies.find(c => c.name.toLowerCase() === details.companyName.toLowerCase());
      
      if (!company) {
        const newCompanyData = { name: details.companyName };
        const addedCompany = await FirestoreService.addCompany(newCompanyData);
        if (!addedCompany) {
            setAuthState(prev => ({ ...prev, isLoading: false }));
            return { success: false, message: 'Failed to create company.' };
        }
        company = addedCompany;
      }

      const newUser: MockStoredUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
        email: details.email,
        companyId: company.id,
        companyName: company.name,
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
