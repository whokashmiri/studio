
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDashboard } from '@/components/project-dashboard';
import type { Company, AuthenticatedUser } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';

export default function HomePage() {
  const { currentUser, isLoading, logout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [isLoading, currentUser, router]);

  if (isLoading || !currentUser) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {isLoading ? t('loadingUserSession', 'Loading user session...') : t('redirectingToLogin', 'Redirecting to login...')}
        </p>
      </div>
    );
  }

  // currentUser is guaranteed to be non-null here
  const currentCompany: Company = {
    id: currentUser.companyId,
    name: currentUser.companyName,
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <ProjectDashboard
        company={currentCompany}
        onLogout={logout} 
      />
    </div>
  );
}
