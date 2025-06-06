
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDashboard } from '@/components/project-dashboard';
import type { Company } from '@/data/mock-data'; // Keep Company type for ProjectDashboard prop
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.isLoading === false && !user) {
      router.push('/login');
    }
  }, [user, router]);

  if (user?.isLoading || !user) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">Loading user data...</p>
      </div>
    );
  }

  // User is logged in and data is loaded (including companyId and companyName)
  if (!user.companyId || !user.companyName) {
     // This case should ideally not happen if signup and login flows correctly populate company info
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <p className="text-lg text-destructive">Company information not found for your account.</p>
        <p className="text-md text-muted-foreground">Please contact support or try signing up again.</p>
      </div>
    );
  }

  // Construct the company object for ProjectDashboard
  const currentCompany: Company = {
    id: user.companyId,
    name: user.companyName,
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <ProjectDashboard
        company={currentCompany}
        onClearCompany={() => {
          // This function might need to be re-evaluated.
          // For now, clearing company means logging out or choosing another,
          // but with one company per user, this might just be logout.
          // For simplicity, let's assume ProjectDashboard won't call this if not needed.
          // Or, it could trigger logout.
          console.warn("onClearCompany called. Implement redirection or logout if necessary.");
          // router.push('/some-other-place-or-logout');
        }}
      />
    </div>
  );
}
