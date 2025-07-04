
"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDashboard } from '@/components/project-dashboard';
import { CompanySelector } from '@/components/company-selector';
import type { Company } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import * as FirestoreService from '@/lib/firestore-service';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const { currentUser, isLoading: authIsLoading, logout: authLogout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [associatedCompanies, setAssociatedCompanies] = useState<Company[] | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authIsLoading) {
      return; // Wait for auth to finish loading
    }

    if (!currentUser) {
      router.push('/login');
      return;
    }

    const fetchUserCompanies = async () => {
      setIsLoading(true);
      try {
        const companyIds = await FirestoreService.getAssociatedCompanyIdsForUser(currentUser.id, currentUser.companyId);
        
        if (companyIds.length > 0) {
          let companies = await FirestoreService.getCompaniesByIds(companyIds);

          // Sort the companies to ensure the user's primary company is always first.
          companies = companies.sort((a, b) => {
            if (a.id === currentUser.companyId) return -1; // a (own company) comes first
            if (b.id === currentUser.companyId) return 1;  // b (own company) comes first
            return a.name.localeCompare(b.name); // otherwise, sort alphabetically
          });

          setAssociatedCompanies(companies);
        } else {
          // This handles the case where a user truly has no company associations.
          setAssociatedCompanies([]);
        }
      } catch (error) {
        console.error("Error fetching user's associated companies:", error);
        setAssociatedCompanies([]); // Set to empty on error to show the "No Companies" message.
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserCompanies();

  }, [authIsLoading, currentUser, router]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
  };

  const handleLogoutAndReset = () => {
    authLogout();
    setSelectedCompany(null); 
    setAssociatedCompanies(null);
    setIsLoading(true);
  };

  // Main loading state for the page
  if (isLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {authIsLoading ? t('loadingUserSession', 'Loading user session...') : t('loading', 'Determining your companies...')}
        </p>
      </div>
    );
  }

  // If a company has been selected by the user, show the dashboard
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

  // If there are any associated companies, always show the selector
  if (associatedCompanies && associatedCompanies.length > 0) {
    return <CompanySelector companies={associatedCompanies} onSelectCompany={handleSelectCompany} />;
  }
  
  // This is the final fallback case:
  // The fetch completed and the user has no associated companies (associatedCompanies is an empty array).
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
