"use client";
import { useState } from 'react';
import { CompanySelector } from '@/components/company-selector';
import { ProjectDashboard } from '@/components/project-dashboard';
import type { Company } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function HomePage() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const { user, login } = useAuth(); // Assuming login is a simple function for demo

  // Mock login function if user is null
  const handleDemoLogin = () => {
    login({ id: 'inspector1', name: 'John Doe', avatarUrl: 'https://placehold.co/100x100.png' });
  };

  if (!user) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <h1 className="text-3xl font-bold mb-4 font-headline">Welcome to Asset Inspector Pro</h1>
        <p className="text-lg text-muted-foreground mb-8">Please log in to manage your inspections.</p>
        <Button size="lg" onClick={handleDemoLogin}>
          <LogIn className="mr-2 h-5 w-5" /> Demo Login
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {!selectedCompany ? (
        <CompanySelector onSelectCompany={setSelectedCompany} />
      ) : (
        <ProjectDashboard
          company={selectedCompany}
          onClearCompany={() => setSelectedCompany(null)}
        />
      )}
    </div>
  );
}
