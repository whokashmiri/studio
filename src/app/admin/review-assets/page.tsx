
"use client";
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import * as FirestoreService from '@/lib/firestore-service';
import type { AssetWithContext } from '@/lib/firestore-service';
import type { Project, Folder as FolderType, Asset } from '@/data/mock-data';
import { Loader2, ShieldAlert, Home, ArrowLeft, LayoutDashboard, FileText, BarChart3, SettingsIcon, FolderIcon as ProjectFolderIcon, Eye, Edit, Briefcase, ArrowRight, CheckCircle, List, ImageOff, FolderOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ImagePreviewModal } from '@/components/modals/image-preview-modal';
import { AssetDetailDisplay } from '@/components/asset-detail-display';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

type ReviewPageView = 'companyStats' | 'projectContent';
type AssetFilter = 'all' | 'active' | 'completed';
type MediaItem = { type: 'image' | 'video'; url: string; };


function AssetPreviewer({ asset, onEdit }: { asset: Asset | null, onEdit: (asset: Asset) => void }) {
    const { t } = useLanguage();
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    const mediaItems: MediaItem[] = useMemo(() => {
        if (!asset) return [];
        return [
            ...(asset.photos || []).map(url => ({ type: 'image' as const, url })),
            ...(asset.videos || []).map(url => ({ type: 'video' as const, url }))
        ];
    }, [asset]);

    useEffect(() => {
        setCurrentMediaIndex(0);
    }, [asset]);

    if (!asset) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-muted/50 rounded-lg p-4 text-center">
                <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">{t('selectAssetToPreview', 'Select an Asset')}</h3>
                <p className="text-sm text-muted-foreground">{t('selectAssetFromList', 'Select an asset from the list to see its details here.')}</p>
            </div>
        );
    }
    
    const currentMedia = mediaItems[currentMediaIndex];

    return (
        <Card className="flex flex-col h-full sticky top-8">
            <CardHeader className="pb-3">
                <CardTitle className="text-xl font-headline text-primary truncate" title={asset.name}>{asset.name}</CardTitle>
                <CardDescription>{t('assetDetailsForReview', 'Asset Details (Review Mode)')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4 overflow-y-auto">
                <div className="relative w-full aspect-video bg-muted rounded-lg group border shadow-inner">
                    {currentMedia ? (
                        currentMedia.type === 'image' ? (
                            <Image src={currentMedia.url} alt={asset.name} layout="fill" objectFit="contain" className="rounded-lg" />
                        ) : (
                            <video src={currentMedia.url} controls autoPlay muted className="w-full h-full object-contain rounded-lg" />
                        )
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground flex-col">
                            <ImageOff className="h-12 w-12" />
                            <p className="mt-2 text-sm">{t('noMediaAvailable', 'No Media Available')}</p>
                        </div>
                    )}

                    {mediaItems.length > 1 && (
                        <>
                            <Button variant="ghost" size="icon" onClick={() => setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)} className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"> <ArrowLeft className="h-4 w-4" /> </Button>
                            <Button variant="ghost" size="icon" onClick={() => setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length)} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"> <ArrowRight className="h-4 w-4" /> </Button>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs rounded-full px-2 py-0.5">{currentMediaIndex + 1} / {mediaItems.length}</div>
                        </>
                    )}
                </div>

                <ScrollArea className="flex-grow h-48">
                   <div className="space-y-4 pr-3">
                        {asset.textDescription && <p className="text-sm whitespace-pre-wrap"><strong>{t('textDescriptionLabel', 'Written Description')}:</strong><br/>{asset.textDescription}</p>}
                        {asset.voiceDescription && <p className="text-sm whitespace-pre-wrap"><strong>{t('voiceDescriptionLabel', 'Voice Description')}:</strong><br/>{asset.voiceDescription}</p>}
                   </div>
                </ScrollArea>
            </CardContent>
            <CardFooter>
                 <Button onClick={() => onEdit(asset)} className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    {t('goToEditPageButton', 'Edit Full Asset')}
                </Button>
            </CardFooter>
        </Card>
    );
}

function AssetListItem({ asset, onSelect, isActive }: { asset: Asset, onSelect: (asset: Asset) => void, isActive: boolean }) {
    return (
        <button
            onClick={() => onSelect(asset)}
            className={cn(
                "w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2 border",
                isActive ? "bg-primary/10 border-primary" : "bg-card"
            )}
        >
            {asset.photos && asset.photos.length > 0 ? (
                <Image src={asset.photos[0]} alt={asset.name} width={40} height={40} className="h-10 w-10 rounded object-cover" />
            ) : (
                 <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <ImageOff className="h-5 w-5 text-muted-foreground" />
                </div>
            )}
            <span className="text-sm font-medium truncate flex-grow">{asset.name}</span>
        </button>
    );
}


export default function ReviewAllAssetsPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [allCompanyAssets, setAllCompanyAssets] = useState<AssetWithContext[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [assetsInFolder, setAssetsInFolder] = useState<Asset[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [projectContentLoading, setProjectContentLoading] = useState(false);

  const [assetToPreview, setAssetToPreview] = useState<Asset | null>(null);
  const [currentView, setCurrentView] = useState<ReviewPageView>('companyStats');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  
  const loadInitialAdminData = useCallback(async () => {
    if (currentUser && currentUser.role === 'Admin' && currentUser.companyId) {
      setPageLoading(true);
      try {
        const [assets, projects] = await Promise.all([
          FirestoreService.getAllAssetsForCompany(currentUser.companyId, assetFilter),
          FirestoreService.getProjects(currentUser.companyId) 
        ]);
        setAllCompanyAssets(assets);
        setCompanyProjects(projects.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error loading initial admin data:", error);
        toast({ title: t('error', 'Error'), description: t('loadingErrorDesc', 'Failed to load initial review data.'), variant: 'destructive' });
      } finally {
        setPageLoading(false);
      }
    } else if (!authLoading) {
      setPageLoading(false); 
    }
  }, [currentUser, authLoading, toast, t, assetFilter]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || currentUser.role !== 'Admin') {
        router.push('/'); 
      } else {
        loadInitialAdminData();
      }
    }
  }, [authLoading, currentUser, router, loadInitialAdminData]);
  
  const handleSelectProject = useCallback(async (project: Project | null) => {
    setSelectedProject(project);
    setSelectedFolder(null); // Always reset folder when project changes
    setAssetToPreview(null);
    if (project) {
        setCurrentView('projectContent');
        setProjectContentLoading(true);
        try {
            // Fetch all assets for the project initially, then filter for root assets
            const allAssets = await FirestoreService.getAllAssetsForProject(project.id, 'all');
            const rootAssets = allAssets.filter(asset => !asset.folderId);
            setAssetsInFolder(rootAssets); // Show root assets by default
        } catch (e) {
            toast({ title: t('error', 'Error'), description: t('projectContentError', `Failed to load content for ${project.name}.`), variant: 'destructive'});
            setAssetsInFolder([]);
        } finally {
            setProjectContentLoading(false);
        }
    } else {
        setCurrentView('companyStats');
        setAssetsInFolder([]);
    }
  }, [toast, t]);


  const handleSelectFolder = useCallback(async (project: Project, folder: FolderType | null) => {
    setSelectedFolder(folder);
    setAssetToPreview(null);
    setProjectContentLoading(true);
    try {
        const allAssets = await FirestoreService.getAllAssetsForProject(project.id, 'all');
        const assets = allAssets.filter(asset => asset.folderId === (folder ? folder.id : null));
        setAssetsInFolder(assets);
    } catch(e) {
        toast({ title: t('error', 'Error'), description: t('folderAssetsError', 'Failed to load assets for folder.'), variant: 'destructive'});
        setAssetsInFolder([]);
    } finally {
        setProjectContentLoading(false);
    }
  }, [toast, t]);

  const handleEditAsset = (assetToEdit: Asset) => {
    const editUrl = `/project/${assetToEdit.projectId}/new-asset?assetId=${assetToEdit.id}${assetToEdit.folderId ? `&folderId=${assetToEdit.folderId}` : ''}`;
    router.push(editUrl);
  };
  
  const { activeAssets, completedAssets } = useMemo(() => {
    const active: Asset[] = [];
    const completed: Asset[] = [];
    assetsInFolder.forEach(asset => {
      if (asset.isDone) {
        completed.push(asset);
      } else {
        active.push(asset);
      }
    });
    return { activeAssets: active, completedAssets: completed };
  }, [assetsInFolder]);


  if (authLoading || pageLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {authLoading ? t('loadingUserSession', 'Loading user session...') : t('loadingAdminData', 'Loading review data...')}
        </p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">{t('accessDeniedTitle', 'Access Denied')}</h1>
        <p className="text-muted-foreground">{t('accessDeniedAdminDesc', 'You do not have permission to view this page.')}</p>
        <Button onClick={() => router.push('/')} className="mt-4">
          <Home className="mr-2 h-4 w-4" /> {t('backToDashboard', 'Back to Dashboard')}
        </Button>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar className={language === 'ar' ? "border-l" : "border-r"} collapsible="icon" side={language === 'ar' ? 'right' : 'left'}>
          <SidebarHeader className="p-3 border-b">
             <div className="flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6 text-primary" />
                <span className="font-semibold font-headline text-lg group-data-[collapsible=icon]:hidden">
                  {t('companyReviewSidebarTitle', 'Company Review')}
                </span>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-0">
            <SidebarMenu className="p-2 space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleSelectProject(null)} 
                  isActive={currentView === 'companyStats'}
                  tooltip={t('companyStatsTooltip', 'View Company Stats')}
                >
                  <BarChart3 />
                  <span className="group-data-[collapsible=icon]:hidden">{t('companyStatsSidebarItem', 'Company Stats')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <ScrollArea className="h-[calc(100%-180px)] group-data-[collapsible=icon]:h-[calc(100%-120px)]">
              <SidebarMenu className="p-2 pt-0 space-y-1">
                 <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
                    <span className="text-xs font-medium text-muted-foreground uppercase">{t('projectsSidebarItem', 'Projects')}</span>
                </div>
                {companyProjects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton 
                        onClick={() => handleSelectProject(project)} 
                        isActive={selectedProject?.id === project.id && currentView !== 'companyStats'}
                        tooltip={project.name}
                    >
                      <ProjectFolderIcon />
                      <span className="group-data-[collapsible=icon]:hidden truncate" title={project.name}>{project.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {companyProjects.length === 0 && !pageLoading && (
                    <div className="px-3 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                        {t('noProjectsInCompany', 'No projects in company.')}
                    </div>
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarContent>
           <SidebarHeader className="p-3 border-t mt-auto">
            <SidebarMenu className="space-y-1 p-0">
                 <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push('/admin/dashboard')} tooltip={t('backToAdminDashboard', 'Back to Admin Dashboard')}>
                        {language === 'ar' ? <ArrowRight /> : <ArrowLeft />}
                        <span className="group-data-[collapsible=icon]:hidden">{t('backToAdminDashboard', 'Admin Dashboard')}</span>
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
          {currentView === 'companyStats' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold font-headline text-primary">
                      {t('companyWideAssetStats', 'Company-Wide Asset Statistics')}
                  </CardTitle>
                  <CardDescription>
                      {t('overviewOfAllCompanyAssets', 'An overview of all assets across your company.')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-card/50">
                            <CardHeader className="pb-2">
                                <CardDescription>{t('totalAssetsStatLabel', 'Total Assets in Company')}</CardDescription>
                                <CardTitle className="text-4xl">{allCompanyAssets.length}</CardTitle>
                            </CardHeader>
                        </Card>
                      </div>
                      <div className="flex gap-2 border rounded-md p-1 bg-muted">
                        <Button variant={assetFilter === 'active' ? 'default' : 'ghost'} onClick={() => setAssetFilter('active')} size="sm"> <List className="mr-2 h-4 w-4"/> {t('activeAssetsFilter', 'Active')} </Button>
                        <Button variant={assetFilter === 'completed' ? 'default' : 'ghost'} onClick={() => setAssetFilter('completed')} size="sm"> <CheckCircle className="mr-2 h-4 w-4"/> {t('completedAssetsFilter', 'Completed')} </Button>
                        <Button variant={assetFilter === 'all' ? 'default' : 'ghost'} onClick={() => setAssetFilter('all')} size="sm">All</Button>
                      </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold flex items-center">
                        <Briefcase className="mr-2 h-5 w-5 text-primary" />
                        {t('companyProjectsListTitle', 'Company Projects')}
                    </CardTitle>
                    <CardDescription>
                        {t('selectProjectToViewDetailsPrompt', 'Select a project from the sidebar or click "View Content" below to view its specific folders and assets.')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {companyProjects.length > 0 ? (
                        <ScrollArea className="h-[calc(100vh-30rem)] md:h-[350px] pr-3">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {companyProjects.map(project => (
                                    <Card key={project.id} className="flex flex-col">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base font-semibold truncate" title={project.name}> {project.name} </CardTitle>
                                             <CardDescription className="text-xs"> {project.description || t('noDescriptionAvailable', 'No description available.')} </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow flex items-end pt-2">
                                            <Button variant="outline" size="sm" className="w-full" onClick={() => handleSelectProject(project)}> <Eye className="mr-2 h-4 w-4" /> {t('viewContentButton', 'View Content')} </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="text-muted-foreground text-center py-6">{t('noProjectsInCompany', 'No projects in company.')}</p>
                    )}
                </CardContent>
              </Card>
            </div>
          )}

          {currentView === 'projectContent' && selectedProject && (
            <div className="space-y-6">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-2xl sm:text-3xl font-bold font-headline text-primary"> {selectedProject.name} </CardTitle>
                    <CardDescription> {selectedFolder ? `${t('reviewingFolder', 'Reviewing folder:')} ${selectedFolder.name}` : t('reviewingProjectRoot', 'Reviewing project root assets')} </CardDescription>
                </CardHeader>
                {projectContentLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="ml-3 text-muted-foreground">{t('loadingProjectContent', 'Loading folder content...')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><List className="h-5 w-5 text-primary"/>{t('activeAssets', 'Active Assets')} ({activeAssets.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-96">
                                        <div className="space-y-2 pr-2">
                                            {activeAssets.length > 0 ? activeAssets.map(asset => (
                                                <AssetListItem key={asset.id} asset={asset} onSelect={setAssetToPreview} isActive={assetToPreview?.id === asset.id && !assetToPreview.isDone}/>
                                            )) : <p className="text-sm text-muted-foreground p-4 text-center">{t('noActiveAssets', 'No active assets in this folder.')}</p>}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                            <Card>
                                 <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600"/>{t('completedAssets', 'Completed Assets')} ({completedAssets.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-96">
                                        <div className="space-y-2 pr-2">
                                            {completedAssets.length > 0 ? completedAssets.map(asset => (
                                                <AssetListItem key={asset.id} asset={asset} onSelect={setAssetToPreview} isActive={assetToPreview?.id === asset.id && assetToPreview.isDone}/>
                                            )) : <p className="text-sm text-muted-foreground p-4 text-center">{t('noCompletedAssets', 'No completed assets in this folder.')}</p>}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                         </div>
                         <div className="md:col-span-1">
                            <AssetPreviewer asset={assetToPreview} onEdit={handleEditAsset} />
                         </div>
                    </div>
                )}
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
