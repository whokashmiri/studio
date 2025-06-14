
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDashboard } from '@/components/project-dashboard';
import type { Company } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { currentUser, isLoading: authIsLoading, logout: authLogout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [pageIsLoading, setPageIsLoading] = useState(true);

  useEffect(() => {
    if (!authIsLoading) { 
      if (!currentUser) {
        router.push('/login');
      } else if (!currentUser.companyId || !currentUser.companyName) {
        console.error("User is logged in but has no company information. Cannot display dashboard.");
        setPageIsLoading(false); // Stop loading to show error message
      } else {
        setPageIsLoading(false); // User and their company info are available
      }
    } else {
        setPageIsLoading(true); // Auth is still loading
    }
  }, [authIsLoading, currentUser, router]);

  if (authIsLoading || (pageIsLoading && currentUser)) { // Show loader if auth is loading OR if page is still loading after auth (e.g. waiting for company check)
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {authIsLoading ? t('loadingUserSession', 'Loading user session...') : t('preparingDashboard', 'Preparing dashboard...')}
        </p>
      </div>
    );
  }

  // If auth is done, currentUser is available, but company info is missing
  if (currentUser && (!currentUser.companyId || !currentUser.companyName) && !pageIsLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">{t('companyInfoMissingTitle', 'Company Information Missing')}</h1>
        <p className="text-muted-foreground">{t('companyInfoMissingDesc', 'Your account is not associated with a company. Please contact support.')}</p>
        <Button onClick={authLogout} className="mt-4">{t('logoutButton', 'Logout')}</Button>
      </div>
    );
  }

  // If auth is done, currentUser and their company info are available
  if (currentUser && currentUser.companyId && currentUser.companyName && !pageIsLoading) {
    const userCompany: Company = {
      id: currentUser.companyId,
      name: currentUser.companyName,
    };
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <ProjectDashboard
          company={userCompany}
          onLogout={authLogout} 
        />
      </div>
    );
  }
  
  // Fallback loader if redirecting or other unhandled state
  // This should ideally not be reached if the logic above is comprehensive
  return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="text-lg text-muted-foreground mt-4">
          {t('loading', 'Loading...')}
        </p>
      </div>
    );
}
