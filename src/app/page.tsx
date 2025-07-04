
"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDashboard } from '@/components/project-dashboard';
import { CompanySelector } from '@/components/company-selector';
import type { Company, Project, ProjectWithAssetCount } from '@/data/mock-data'; // Added ProjectWithAssetCount
import { useAuth } from '@/contexts/auth-context';
import * as FirestoreService from '@/lib/firestore-service'; // Import FirestoreService
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


export default function HomePage() {
  const { currentUser, isLoading: authIsLoading, logout: authLogout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [userAssociatedCompanies, setUserAssociatedCompanies] = useState<Company[]>([]);
  const [isLoadingUserCompanies, setIsLoadingUserCompanies] = useState(true);
  const [pageIsLoading, setPageIsLoading] = useState(true); // General page loading state

  useEffect(() => {
    if (!authIsLoading) {
      if (!currentUser) {
        router.push('/login');
      } else {
        const fetchUserCompanies = async () => {
          setIsLoadingUserCompanies(true);
          setPageIsLoading(true);
          
          try {
            // Get all unique company IDs the user is associated with
            const associatedCompanyIds = await FirestoreService.getAssociatedCompanyIdsForUser(currentUser.id, currentUser.companyId);

            if (associatedCompanyIds.length > 0) {
              // Fetch only the company documents we need
              const companies = await FirestoreService.getCompaniesByIds(associatedCompanyIds);
              setUserAssociatedCompanies(companies);
              
              if (companies.length === 1) {
                  setSelectedCompany(companies[0]);
              }
            } else {
              // This case should be rare: user exists but has no company and no projects.
              setUserAssociatedCompanies([]);
            }
          } catch (error) {
            console.error("Error fetching user associated companies:", error);
            setUserAssociatedCompanies([]);
          } finally {
            setIsLoadingUserCompanies(false);
            setPageIsLoading(false);
          }
        };
        fetchUserCompanies();
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
    setSelectedCompany(null); 
    setUserAssociatedCompanies([]); // Reset associated companies
    setIsLoadingUserCompanies(true); // Reset loading state for next login
  };

  if (authIsLoading || pageIsLoading) { // pageIsLoading will cover isLoadingUserCompanies indirectly
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {authIsLoading ? t('loadingUserSession', 'Loading user session...') : t('loading', 'Determining your companies...')}
        </p>
      </div>
    );
  }

  if (!currentUser) {
      return (
         <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground mt-4">{t('redirectingToLogin', 'Redirecting to login...')}</p>
        </div>
      );
  }

  // If a company is selected (either by user click or auto-selected in useEffect), show the dashboard
  if (selectedCompany) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <ProjectDashboard
          company={selectedCompany}
          onLogout={handleLogoutAndReset}
        />
      </div>
    );
  }
  
  // If loading is finished but no company is selected yet, figure out what to show.
  if (isLoadingUserCompanies) {
      return (
        <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground mt-4">{t('loading', 'Determining your companies...')}</p>
        </div>
      );
  }
  
  // If more than one company and none is selected yet, show selector.
  // The case of a single company was handled by auto-selection in useEffect.
  if (userAssociatedCompanies.length > 1) {
    return <CompanySelector companies={userAssociatedCompanies} onSelectCompany={handleSelectCompany} />;
  }

  // This is the final fallback: user has no associated companies at all.
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-2xl font-headline text-center">{t('noCompaniesAssociatedTitle', 'No Companies Found')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center">
                    {t('noCompaniesAssociatedDesc', 'There are no companies currently associated with your account. Please contact an administrator if you believe this is an error.')}
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
