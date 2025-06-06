
"use client";
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/data/mock-data'; // Ensure Company type is available
import { mockCompanies } from '@/data/mock-data'; // For finding company name by ID

const SELECTED_COMPANY_ID_KEY = 'selectedCompanyId';
const SELECTED_COMPANY_NAME_KEY = 'selectedCompanyName';

interface UserState {
  isLoading: boolean;
  companyId: string | null;
  companyName: string | null;
}

interface AuthContextType {
  user: UserState;
  selectCompany: (company: Company) => void;
  clearCompany: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserState>({
    isLoading: true,
    companyId: null,
    companyName: null,
  });
  const router = useRouter();

  useEffect(() => {
    try {
      const storedCompanyId = localStorage.getItem(SELECTED_COMPANY_ID_KEY);
      const storedCompanyName = localStorage.getItem(SELECTED_COMPANY_NAME_KEY);
      if (storedCompanyId && storedCompanyName) {
        setUser({
          isLoading: false,
          companyId: storedCompanyId,
          companyName: storedCompanyName,
        });
      } else {
        setUser(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Error reading company from localStorage:", error);
      setUser(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const selectCompany = (company: Company) => {
    try {
      localStorage.setItem(SELECTED_COMPANY_ID_KEY, company.id);
      localStorage.setItem(SELECTED_COMPANY_NAME_KEY, company.name);
      setUser({
        isLoading: false,
        companyId: company.id,
        companyName: company.name,
      });
    } catch (error) {
      console.error("Error saving company to localStorage:", error);
    }
  };

  const clearCompany = () => {
    try {
      localStorage.removeItem(SELECTED_COMPANY_ID_KEY);
      localStorage.removeItem(SELECTED_COMPANY_NAME_KEY);
      setUser({
        isLoading: false,
        companyId: null,
        companyName: null,
      });
      router.push('/'); // Navigate to home which should show CompanySelector
    } catch (error) {
      console.error("Error clearing company from localStorage:", error);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, selectCompany, clearCompany }}>
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
