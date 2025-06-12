
"use client";
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDashboard } from '@/components/project-dashboard';
import type { Company } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import * as FirestoreService from '@/lib/firestore-service';

export default function HomePage() {
  const { currentUser, isLoading, logout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [pageLoading, setPageLoading] = useState(true);

  const currentCompany = useMemo(() => {
    if (currentUser) {
      return {
        id: currentUser.companyId,
        name: currentUser.companyName,
      };
    }
    return null;
  }, [currentUser]);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    } else if (currentUser && currentCompany) {
      setPageLoading(false);
    }
    // If currentUser is null, currentCompany will be null,
    // pageLoading will remain true, and the loader below will show until redirection.
  }, [isLoading, currentUser, currentCompany, router]);

  if (isLoading || pageLoading || !currentUser || !currentCompany) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {isLoading || pageLoading ? t('loadingUserSession', 'Loading user session...') : t('redirectingToLogin', 'Redirecting to login...')}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <ProjectDashboard
        company={currentCompany}
        onLogout={logout}
      />
    </div>
  );
}
