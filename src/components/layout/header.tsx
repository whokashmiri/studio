
"use client";
import Link from 'next/link';
import { Building, LogOut, UserCircle, Briefcase, LogIn, LayoutDashboard, Loader2 } from 'lucide-react'; 
import { LanguageToggle } from '@/components/language-toggle';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { useState, useEffect } from 'react'; 
import { usePathname } from 'next/navigation'; // Import usePathname

export function Header() {
  const { currentUser, isLoading, logout } = useAuth();
  const { t } = useLanguage();
  const [isNavigatingToAdmin, setIsNavigatingToAdmin] = useState(false);
  const pathname = usePathname(); // Get current pathname

  const getInitials = (email?: string) => {
    if (!email) return '';
    return email.substring(0, 2).toUpperCase();
  }

  // Reset navigation state when pathname changes
  useEffect(() => {
    if (isNavigatingToAdmin) {
      setIsNavigatingToAdmin(false);
    }
  }, [pathname, isNavigatingToAdmin]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <Building className="h-6 w-6" />
          <span className="font-headline">{t('appName', 'Asset Inspector Pro')}</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageToggle />
          {isLoading ? (
             <UserCircle className="h-5 w-5 animate-pulse text-muted-foreground" />
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    {/* Placeholder for user image if available */}
                    {/* <AvatarImage src="https://github.com/shadcn.png" alt={currentUser.email} /> */}
                    <AvatarFallback>
                        {getInitials(currentUser.email) || <UserCircle className="h-5 w-5"/>}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.email}</p>
                    <p className="text-xs leading-none text-muted-foreground pt-0.5">
                      {t('companyLabel', 'Company:')} {currentUser.companyName} ({t(currentUser.role.toLowerCase() + 'Role', currentUser.role)})
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currentUser.role === 'Admin' && (
                  <Link href="/admin/dashboard" passHref legacyBehavior>
                    <DropdownMenuItem
                      onClick={() => {
                        if (pathname !== '/admin/dashboard') {
                          setIsNavigatingToAdmin(true);
                        }
                      }}
                      disabled={isNavigatingToAdmin}
                    >
                      {isNavigatingToAdmin ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                      )}
                      {isNavigatingToAdmin ? t('loading', 'Loading...') : t('adminDashboardMenuLink', 'Admin Dashboard')}
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('logoutButton', 'Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Link href="/login" passHref legacyBehavior>
                <Button variant="outline">
                    <LogIn className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">{t('loginButton', 'Login')}</span>
                </Button>
             </Link>
          )}
        </div>
      </div>
    </header>
  );
}

    
