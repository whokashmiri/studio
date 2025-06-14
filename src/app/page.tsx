
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
        // User is logged in, fetch their associated companies
        const fetchUserCompanies = async () => {
          setIsLoadingUserCompanies(true);
          setPageIsLoading(true); // Ensure page loading is true while fetching companies
          
          const relevantCompanyIds = new Set<string>();
          if (currentUser.companyId) {
            relevantCompanyIds.add(currentUser.companyId);
          }

          try {
            // Fetch all projects to check assignments. Consider optimizing if too many projects.
            // Note: getProjects() without args fetches all projects and their asset counts.
            const allProjects: ProjectWithAssetCount[] = await FirestoreService.getProjects(); 
            
            allProjects.forEach(project => {
              if (project.assignedInspectorIds?.includes(currentUser.id) || project.assignedValuatorIds?.includes(currentUser.id)) {
                relevantCompanyIds.add(project.companyId);
              }
            });

            if (relevantCompanyIds.size > 0) {
              const allDbCompanies = await FirestoreService.getCompanies();
              const filteredCompanies = allDbCompanies.filter(c => relevantCompanyIds.has(c.id));
              setUserAssociatedCompanies(filteredCompanies);
            } else {
              setUserAssociatedCompanies([]);
            }
          } catch (error) {
            console.error("Error fetching user associated companies/projects:", error);
            setUserAssociatedCompanies([]); // Default to empty on error
            // Optionally, show a toast message here
          } finally {
            setIsLoadingUserCompanies(false);
            setPageIsLoading(false); // Page is ready after this determination step
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
          {authIsLoading ? t('loadingUserSession', 'Loading user session...') : t('loading', 'Loading...')}
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

  // If currentUser is loaded, but no company has been selected yet, show selector or no companies message
  if (!selectedCompany) {
    if (isLoadingUserCompanies) { // Still determining companies
        return (
          <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground mt-4">{t('loading', 'Determining your companies...')}</p>
          </div>
        );
    }
    if (userAssociatedCompanies.length === 0) {
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
    // If only one company, consider auto-selecting or still show selector based on UX preference.
    // For now, always show selector if companies are available.
    return <CompanySelector companies={userAssociatedCompanies} onSelectCompany={handleSelectCompany} />;
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
