
"use client";
import Link from 'next/link';
import { Building, LogOut, UserCircle, Briefcase } from 'lucide-react';
import { LanguageToggle } from '@/components/language-toggle';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';

export function Header() {
  const { user, clearCompany } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <Building className="h-6 w-6" />
          <span className="font-headline">{t('appName', 'Asset Inspector Pro')}</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageToggle />
          {user.isLoading ? (
            <Briefcase className="h-5 w-5 animate-pulse" />
          ) : user.companyId && user.companyName ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>
                        <Briefcase className="h-5 w-5"/>
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{t('currentCompany', 'Current Company')}</p>
                    <p className="text-xs leading-none text-muted-foreground pt-1">
                      {user.companyName}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearCompany}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('switchCompany', 'Switch Company')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Button variant="outline" onClick={() => { /* Potentially trigger company selection if needed, or just rely on homepage */ }}>
                <UserCircle className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">{t('selectCompanyPrompt', 'Select Company')}</span>
             </Button> 
          )}
        </div>
      </div>
    </header>
  );
}
