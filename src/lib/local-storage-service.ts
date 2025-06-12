"use client";
import { useState, useEffect } from 'react';
import type { Company } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service'; // Import FirestoreService
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';

interface CompanySelectorProps {
  onSelectCompany: (company: Company) => void;
}

export function CompanySelector({ onSelectCompany }: CompanySelectorProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const fetchedCompanies = await FirestoreService.getCompanies();
        setCompanies(fetchedCompanies);
      } catch (error) {
        console.error("Failed to fetch companies:", error);
        toast({
          title: t('error', 'Error'),
          description: t('genericError', 'Could not load company data.'),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, [t, toast]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-center">{t('selectCompany', 'Select a Company')}</CardTitle>
          <CardDescription className="text-center">
            {t('selectCompanyDesc', 'Choose a company profile to manage its inspection projects.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : companies.length > 0 ? (
            companies.map((company) => (
              <Button
                key={company.id}
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4 text-left"
                onClick={() => onSelectCompany(company)}
              >
                <Building className="mr-3 h-5 w-5 text-primary" />
                <span className="font-medium">{company.name}</span>
              </Button>
            ))
          ) : (
            <p className="text-muted-foreground text-center">{t('noCompaniesAvailable', 'No companies available.')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}