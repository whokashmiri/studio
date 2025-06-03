"use client";
import { mockCompanies, type Company } from '@/data/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';

interface CompanySelectorProps {
  onSelectCompany: (company: Company) => void;
}

export function CompanySelector({ onSelectCompany }: CompanySelectorProps) {
  const { t } = useLanguage();
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">{t('selectCompany', 'Select a Company')}</CardTitle>
          <CardDescription>Choose the company you are inspecting for today.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {mockCompanies.map((company) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
