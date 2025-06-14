
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDashboard } from '@/components/project-dashboard';
import type { Company } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { CompanySelector } from '@/components/company-selector'; // New import

export default function HomePage() {
  const { currentUser, isLoading, logout: authLogout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) { // Auth loading is complete
      if (!currentUser) {
        router.push('/login');
      } else {
        // User is logged in. If no company is selected yet, pageLoading remains true
        // until CompanySelector is shown or a company is selected.
        // If a company IS selected, pageLoading will be set to false.
        setPageLoading(!selectedCompany); 
      }
    }
  }, [isLoading, currentUser, selectedCompany, router]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setPageLoading(false); // Page is ready to show dashboard
  };

  const handleLogout = () => {
    authLogout();
    setSelectedCompany(null); // Reset selected company on logout
    // AuthProvider's logout will handle redirecting to /login
  };

  if (isLoading || (!currentUser && !isLoading)) { // Show loader if auth is loading or if redirecting (currentUser is null but auth isn't loading anymore)
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {isLoading ? t('loadingUserSession', 'Loading user session...') : t('redirectingToLogin', 'Redirecting to login...')}
        </p>
      </div>
    );
  }

  if (currentUser && !selectedCompany) {
    // User is logged in, but no company selected yet
    return <CompanySelector onSelectCompany={handleSelectCompany} />;
  }

  if (currentUser && selectedCompany && !pageLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <ProjectDashboard
          company={selectedCompany}
          onLogout={handleLogout} 
        />
      </div>
    );
  }
  
  // Fallback loader if other conditions aren't met (e.g., initial render before effects)
  return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="text-lg text-muted-foreground mt-4">
          {t('loading', 'Loading...')}
        </p>
      </div>
    );
}

