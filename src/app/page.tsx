
"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CompanySelector } from '@/components/company-selector';
import type { Company, Project } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import * as FirestoreService from '@/lib/firestore-service';
import * as OfflineService from '@/lib/offline-service';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectDashboard } from '@/components/project-dashboard';
import { useOnlineStatus } from '@/hooks/use-online-status';

const SELECTED_COMPANY_ID_KEY = 'selectedCompanyId';

export default function HomePage() {
  const { currentUser, isLoading: authIsLoading, logout: authLogout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const isOnline = useOnlineStatus();

  const [associatedCompanies, setAssociatedCompanies] = useState<Company[] | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserCompanies = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      let companies: Company[] = [];
      if (isOnline) {
        const companyIds = await FirestoreService.getAssociatedCompanyIdsForUser(currentUser.id, currentUser.companyId);
        if (companyIds.length > 0) {
          companies = await FirestoreService.getCompaniesByIds(companyIds);
        }
      } else {
        // Offline: Try to load companies from cache based on offline projects
        const offlineProjects = await OfflineService.getDownloadedProjectsFromCache();
        const offlineCompanyIds = new Set(offlineProjects.map(p => p.companyId));
        if (currentUser.companyId) {
            offlineCompanyIds.add(currentUser.companyId);
        }
        
        if (offlineCompanyIds.size > 0) {
            // This is a simplification. In a real offline-first app, companies might be cached too.
            // For now, we'll rely on the user's primary company info.
            const primaryCompany = { id: currentUser.companyId, name: currentUser.companyName };
            if (!companies.some(c => c.id === primaryCompany.id)) {
                companies.push(primaryCompany);
            }
        }
      }

      // Sort the companies to ensure the user's primary company is always first.
      companies = companies.sort((a, b) => {
        if (a.id === currentUser.companyId) return -1;
        if (b.id === currentUser.companyId) return 1;
        return a.name.localeCompare(b.name);
      });

      setAssociatedCompanies(companies);
      
      const storedCompanyId = sessionStorage.getItem(SELECTED_COMPANY_ID_KEY);
      if (storedCompanyId) {
        const companyFromStorage = companies.find(c => c.id === storedCompanyId);
        if (companyFromStorage) {
          setSelectedCompany(companyFromStorage);
        }
      }

    } catch (error) {
      console.error("Error fetching user's associated companies:", error);
      setAssociatedCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isOnline]);


  useEffect(() => {
    if (authIsLoading) {
      return; 
    }

    if (!currentUser) {
      router.push('/login');
      return;
    }
    
    fetchUserCompanies();

  }, [authIsLoading, currentUser, router, fetchUserCompanies]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    sessionStorage.setItem(SELECTED_COMPANY_ID_KEY, company.id);
  };

  const handleLogoutAndReset = () => {
    sessionStorage.removeItem(SELECTED_COMPANY_ID_KEY);
    authLogout();
    setSelectedCompany(null); 
    setAssociatedCompanies(null);
    setIsLoading(true);
  };

  const handleSwitchCompany = () => {
    sessionStorage.removeItem(SELECTED_COMPANY_ID_KEY);
    setSelectedCompany(null);
  };

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

  if (selectedCompany) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <ProjectDashboard
            company={selectedCompany}
            onLogout={handleLogoutAndReset}
            onSwitchCompany={handleSwitchCompany}
        />
      </div>
    );
  }

  if (associatedCompanies && associatedCompanies.length > 0) {
    return <CompanySelector companies={associatedCompanies} onSelectCompany={handleSelectCompany} />;
  }
  
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
