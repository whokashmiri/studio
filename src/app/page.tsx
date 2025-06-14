
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDashboard } from '@/components/project-dashboard';
import { CompanySelector } from '@/components/company-selector'; // Import CompanySelector
import type { Company } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';

export default function HomePage() {
  const { currentUser, isLoading: authIsLoading, logout: authLogout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [pageIsLoading, setPageIsLoading] = useState(true); // General page loading state

  useEffect(() => {
    if (!authIsLoading) {
      if (!currentUser) {
        router.push('/login');
        // No need to setPageIsLoading(false) here as redirect will occur
      } else {
        // User is logged in, determine whether to show company selector or dashboard
        setPageIsLoading(false); // Ready to show content (selector or dashboard)
      }
    } else {
      setPageIsLoading(true); // Auth is still loading
    }
  }, [authIsLoading, currentUser, router]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
  };

  const handleLogoutAndReset = () => {
    authLogout();
    setSelectedCompany(null); // Reset company selection on logout
  };

  if (authIsLoading || pageIsLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {authIsLoading ? t('loadingUserSession', 'Loading user session...') : t('loading', 'Loading...')}
        </p>
      </div>
    );
  }

  // This state should not be reached if !currentUser pushes to /login
  // But as a fallback, or if there's a brief moment before redirect completes:
  if (!currentUser) {
      return (
         <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground mt-4">{t('redirectingToLogin', 'Redirecting to login...')}</p>
        </div>
      );
  }

  // If currentUser is loaded, but no company has been selected yet
  if (!selectedCompany) {
    return <CompanySelector onSelectCompany={handleSelectCompany} />;
  }

  // If currentUser is loaded AND a company has been selected
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <ProjectDashboard
        company={selectedCompany}
        onLogout={handleLogoutAndReset}
      />
    </div>
  );
}
