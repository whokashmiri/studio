"use client";
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER: User = {
  id: 'inspector1',
  name: 'John Doe',
  avatarUrl: 'https://placehold.co/100x100.png'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_USER); // Assume user is logged in

  const login = (userData: User) => setUser(userData);
  const logout = () => {
    setUser(null); 
    // In a real app, you'd redirect to login or clear tokens here.
    // For this demo, we'll just log them out. If they refresh they'll be MOCK_USER again.
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
