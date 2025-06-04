
"use client";
import type { Company } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useEffect, useState } from 'react';

interface CompanySelectorProps {
  onSelectCompany: (company: Company) => void;
}

export function CompanySelector({ onSelectCompany }: CompanySelectorProps) {
  const { t } = useLanguage();
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    setCompanies(LocalStorageService.getCompanies());
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl font-headline">{t('selectCompany', 'Select a Company')}</CardTitle>
          <CardDescription>Choose the company you are inspecting for today.</CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length > 0 ? (
            <ScrollArea className="max-h-[400px] pr-3">
              <div className="grid grid-cols-1 gap-4">
                {companies.map((company) => (
                  <Button
                    key={company.id}
                    variant="outline"
                    size="lg"
                    className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onSelectCompany(company)}
                  >
                    <Building className="mr-3 h-6 w-6 text-primary" />
                    <span className="text-base font-medium">{company.name}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground">{t('noCompaniesAvailable', 'No companies available. Please check the data source.')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
