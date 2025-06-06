
"use client";
import { ProjectDashboard } from '@/components/project-dashboard';
import { CompanySelector } from '@/components/company-selector';
import type { Company } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, selectCompany, clearCompany } = useAuth();

  if (user.isLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">Loading...</p>
      </div>
    );
  }

  if (!user.companyId || !user.companyName) {
    return <CompanySelector onSelectCompany={selectCompany} />;
  }

  const currentCompany: Company = {
    id: user.companyId,
    name: user.companyName,
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <ProjectDashboard
        company={currentCompany}
        onClearCompany={clearCompany}
      />
    </div>
  );
}
