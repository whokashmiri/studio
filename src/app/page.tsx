
"use client";
import { useState, useEffect } from 'react';
import { CompanySelector } from '@/components/company-selector';
import { ProjectDashboard } from '@/components/project-dashboard';
import type { Company } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import * as LocalStorageService from '@/lib/local-storage-service';

const SELECTED_COMPANY_ID_KEY = 'assetInspectorPro_selectedCompanyId_session'; // Use sessionStorage

export default function HomePage() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const { user, login } = useAuth(); 

  // Effect to load selected company from sessionStorage on initial load
  useEffect(() => {
    if (user && typeof window !== 'undefined') { // Ensure user is logged in and window is available
      const storedCompanyId = sessionStorage.getItem(SELECTED_COMPANY_ID_KEY);
      if (storedCompanyId) {
        const companies = LocalStorageService.getCompanies(); // Assumes this is safe to call client-side
        const company = companies.find(c => c.id === storedCompanyId);
        if (company) {
          setSelectedCompany(company);
        } else {
          // Stored company ID is invalid, clear it
          sessionStorage.removeItem(SELECTED_COMPANY_ID_KEY);
        }
      }
    }
  }, [user]); // Rerun if user logs in/out

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SELECTED_COMPANY_ID_KEY, company.id);
    }
  };

  const handleClearCompany = () => {
    setSelectedCompany(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SELECTED_COMPANY_ID_KEY);
    }
  };

  // Mock login function if user is null
  const handleDemoLogin = () => {
    login({ id: 'inspector1', name: 'John Doe', avatarUrl: 'https://placehold.co/100x100.png' });
  };

  if (!user) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 font-headline">Welcome to Asset Inspector Pro</h1>
        <p className="text-md sm:text-lg text-muted-foreground mb-8">Please log in to manage your inspections.</p>
        <Button size="lg" onClick={handleDemoLogin}>
          <LogIn className="mr-2 h-5 w-5" /> Demo Login
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {!selectedCompany ? (
        <CompanySelector onSelectCompany={handleSelectCompany} />
      ) : (
        <ProjectDashboard
          company={selectedCompany}
          onClearCompany={handleClearCompany} // Use the new handler
        />
      )}
    </div>
  );
}

