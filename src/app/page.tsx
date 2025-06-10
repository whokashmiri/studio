
"use client";
import { useEffect, useState } from 'react';
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
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    } else if (currentUser) {
      // Fetch company details if needed, or assume currentUser.companyName is sufficient
      // For simplicity, we'll use company details from currentUser
      setCurrentCompany({
        id: currentUser.companyId,
        name: currentUser.companyName,
      });
      setPageLoading(false);
    }
  }, [isLoading, currentUser, router]);

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
