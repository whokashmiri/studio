
"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import * as FirestoreService from '@/lib/firestore-service';
import type { Project, Folder as FolderType, Asset } from '@/data/mock-data';
import { Loader2, ShieldAlert, Briefcase, FolderIcon as DataFolderIcon, FileText, SettingsIcon, BarChart3, ArrowLeft, Eye } from 'lucide-react'; 
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';


interface AccessibleData {
  projects: Project[];
  folders: FolderType[];
  assets: Asset[];
}

type MyDataView = 'stats' | 'projectsList';

export default function MyDataPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [accessibleData, setAccessibleData] = useState<AccessibleData>({ projects: [], folders: [], assets: [] });
  const [pageLoading, setPageLoading] = useState(true);
  const [activeMyDataView, setActiveMyDataView] = useState<MyDataView>('stats');

  const loadAccessibleData = useCallback(async () => {
    if (currentUser?.id && currentUser?.companyId) {
      setPageLoading(true);
      try {
        const data = await FirestoreService.getUserAccessibleData(currentUser.id, currentUser.companyId);
        // Sort projects by name for the projectsList view initially
        data.projects.sort((a, b) => a.name.localeCompare(b.name));
        setAccessibleData(data);
      } catch (error) {
        console.error("Error loading accessible data:", error);
        // Optionally set an error state or show a toast
      } finally {
        setPageLoading(false);
      }
    } else if (!authLoading) {
        setPageLoading(false); 
    }
  }, [currentUser, authLoading]);

  useEffect(() => {
    if (!authLoading) {
        if (currentUser) {
            loadAccessibleData();
        } else {
            setPageLoading(false);
            router.push('/login'); 
        }
    }
  }, [authLoading, currentUser, loadAccessibleData, router]);

  if (authLoading || pageLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {authLoading ? t('loadingUserSession', 'Loading user session...') : t('loading', 'Loading your data...')}
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">{t('accessDeniedTitle', 'Access Denied')}</h1>
        <p className="text-muted-foreground">{t('pleaseLoginToView', 'Please log in to view this page.')}</p>
      </div>
    );
  }
  
  const { projects, folders, assets } = accessibleData;

  return (
    <SidebarProvider>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar className="border-r" collapsible="icon">
           <SidebarHeader className="p-3 border-b">
             <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <span className="font-semibold font-headline text-lg group-data-[collapsible=icon]:hidden">
                  {t('myDataSidebarTitle', 'My Data')}
                </span>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-0">
            <SidebarMenu className="p-2 space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveMyDataView('stats')} 
                  isActive={activeMyDataView === 'stats'}
                  tooltip={t('dataOverviewTooltip', 'View Data Overview')}
                >
                  <BarChart3 />
                  <span className="group-data-[collapsible=icon]:hidden">{t('dataOverviewSidebarItem', 'Data Overview')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveMyDataView('projectsList')} 
                  isActive={activeMyDataView === 'projectsList'}
                  tooltip={t('viewMyProjectsTooltip', 'View My Projects')}
                >
                  <Briefcase />
                  <span className="group-data-[collapsible=icon]:hidden">{t('myProjectsSidebarItem', 'My Projects')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
           <SidebarHeader className="p-3 border-t mt-auto">
            <SidebarMenu className="space-y-1 p-0">
                 <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/')} tooltip={t('backToDashboard', 'Back to Dashboard')}>
                        <ArrowLeft />
                        <span className="group-data-[collapsible=icon]:hidden">{t('backToDashboard', 'Dashboard')}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { /* Placeholder for settings */ }} tooltip={t('settingsTooltip', 'Settings (Placeholder)')}>
                        <SettingsIcon />
                        <span className="group-data-[collapsible=icon]:hidden">{t('settingsSidebarItem', 'Settings')}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
        </Sidebar>

        <SidebarInset className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {activeMyDataView === 'stats' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-headline text-primary">
                            {t('myDataStatsTitle', 'My Data Statistics')}
                        </CardTitle>
                        <CardDescription>
                            {t('myDataStatsDesc', 'An overview of all projects, folders, and assets accessible to you.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {projects.length === 0 && folders.length === 0 && assets.length === 0 && !pageLoading ? (
                            <p className="text-muted-foreground text-center py-6">{t('noDataAccessible', 'You do not have access to any projects, folders, or assets at the moment.')}</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="bg-card/50">
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                        <CardTitle className="text-sm font-medium">{t('totalProjectsStatLabel', 'Accessible Projects')}</CardTitle>
                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{projects.length}</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/50">
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                        <CardTitle className="text-sm font-medium">{t('totalFoldersStatLabel', 'Accessible Folders')}</CardTitle>
                                        <DataFolderIcon className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{folders.length}</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/50">
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                        <CardTitle className="text-sm font-medium">{t('totalAssetsStatLabel', 'Accessible Assets')}</CardTitle>
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{assets.length}</div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                        {projects.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-6">{t('viewProjectsOnDashboardPrompt', 'To view and manage individual projects, please return to your main dashboard.')}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeMyDataView === 'projectsList' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-headline text-primary">
                            {t('myAccessibleProjectsTitle', 'My Accessible Projects')}
                        </CardTitle>
                        <CardDescription>
                            {t('myAccessibleProjectsDesc', 'A list of all projects you have access to.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {projects.length > 0 ? (
                            <ScrollArea className="h-[calc(100vh-18rem)] pr-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {projects.map(project => (
                                        <Card key={project.id} className="flex flex-col">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base font-semibold truncate" title={project.name}>
                                                    {project.name}
                                                </CardTitle>
                                                 <CardDescription className="text-xs">
                                                    {t('lastAccessedMyData', 'Last Accessed: {date}', { date: project.lastAccessed ? new Date(project.lastAccessed).toLocaleDateString() : 'N/A' })}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-grow flex items-end">
                                                <Link href={`/project/${project.id}`} passHref legacyBehavior>
                                                    <Button variant="outline" size="sm" className="w-full">
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        {t('viewProjectButton', 'View Project Details')}
                                                    </Button>
                                                </Link>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="text-muted-foreground text-center py-6">{t('noProjectsAccessibleMyData', 'You do not have access to any projects.')}</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

