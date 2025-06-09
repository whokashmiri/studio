
"use client";
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthenticatedUser, MockStoredUser, UserRole } from '@/data/mock-data';
import { mockCompanies } from '@/data/mock-data'; // For finding company name by ID if needed

const CURRENT_USER_KEY = 'currentUser';
const MOCK_USERS_KEY = 'mockUsers';


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
      const storedUserJson = localStorage.getItem(CURRENT_USER_KEY);
      if (storedUserJson) {
        const storedUser = JSON.parse(storedUserJson) as AuthenticatedUser;
        setAuthState({ currentUser: storedUser, isLoading: false });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Error reading user from localStorage:", error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const storedUsersJson = localStorage.getItem(MOCK_USERS_KEY);
      const storedUsers: MockStoredUser[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];
      const foundUser = storedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (foundUser && foundUser.password === password) { // Plain text compare for mock
        const { password: _, ...userToStore } = foundUser; // Exclude password from currentUser
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToStore));
        setAuthState({ currentUser: userToStore, isLoading: false });
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
      const storedUsersJson = localStorage.getItem(MOCK_USERS_KEY);
      const storedUsers: MockStoredUser[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];

      if (storedUsers.some(u => u.email.toLowerCase() === details.email.toLowerCase())) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, message: 'Email already in use.' };
      }
      
      let company = mockCompanies.find(c => c.name.toLowerCase() === details.companyName.toLowerCase());
      if (!company) {
        // For simplicity, if company doesn't exist in mockCompanies, we'll create a new one for this user
        // In a real app, you'd handle company creation/selection more robustly
        company = { id: `comp_${Date.now()}`, name: details.companyName };
        // Optionally, add this new company to mockCompanies if you want it listed elsewhere,
        // but for this mock, it's fine if it only exists tied to this user.
      }

      const newUser: MockStoredUser = {
        id: `user_${Date.now()}`,
        email: details.email,
        companyId: company.id,
        companyName: company.name, // Use the found or newly created company name
        role: details.role,
        password: details.password, // Store plain text for mock
      };
      storedUsers.push(newUser);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(storedUsers));
      
      const { password: _, ...userToStore } = newUser; // Exclude password from currentUser
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToStore));
      setAuthState({ currentUser: userToStore, isLoading: false });
      router.push('/');
      return { success: true, userId: newUser.id };

    } catch (error) {
      console.error("Signup error:", error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: 'An unexpected error occurred during signup.' };
    }
  }, [router]);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
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
