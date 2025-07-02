
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
              
              // Auto-select company if there's only one association
              if (filteredCompanies.length === 1) {
                  setSelectedCompany(filteredCompanies[0]);
              }

            } else {
              // Fallback: If no companies found through projects, but user has a primary company, use that.
              if (currentUser.companyId && currentUser.companyName) {
                  const ownCompany = { id: currentUser.companyId, name: currentUser.companyName };
                  setUserAssociatedCompanies([ownCompany]);
                  setSelectedCompany(ownCompany);
              } else {
                  setUserAssociatedCompanies([]);
              }
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
