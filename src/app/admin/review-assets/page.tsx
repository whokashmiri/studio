 
"use client";
import React, { useEffect, useState, useCallback, useMemo, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import * as FirestoreService from '@/lib/firestore-service';
import type { AssetWithContext } from '@/lib/firestore-service';
import type { Project, Folder as FolderType, Asset } from '@/data/mock-data';
import { Loader2, ShieldAlert, Home, ArrowLeft, LayoutDashboard, FileText, BarChart3, SettingsIcon, FolderIcon as ProjectFolderIcon, Eye, Edit, Briefcase, ArrowRight, CheckCircle, List, ImageOff, FolderOpen, Folder, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ImagePreviewModal } from '@/components/modals/image-preview-modal';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';


function AssetListItem({ asset, onSelect, isActive, isCompletedView, onMarkActive }: { asset: Asset, onSelect: (asset: Asset) => void, isActive: boolean, isCompletedView: boolean, onMarkActive: (asset: Asset) => void }) {
    const { t } = useLanguage();
    const hasMedia = (asset.photos && asset.photos.length > 0) || (asset.videos && asset.videos.length > 0);
    
    return (
        <div className="flex items-center gap-2">
            {isCompletedView && (
                 <Checkbox
                    id={`mark-active-${asset.id}`}
                    checked={false} // Checkbox is just a trigger, not stateful
                    onCheckedChange={(checked) => {
                        if (checked) onMarkActive(asset);
                    }}
                    title={t('markAssetAsActive', 'Mark as Active')}
                    className="h-5 w-5 rounded-full"
                />
            )}
            <button
                onClick={() => hasMedia && onSelect(asset)}
                disabled={!hasMedia}
                className={cn(
                    "w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2 border",
                    isActive && hasMedia ? "bg-primary/10 border-primary" : "bg-card",
                    !hasMedia && "opacity-60 cursor-allowed"
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
        </div>
    );
}

function FolderListItem({ folder, onSelect, isActive, assetCount }: { folder: FolderType, onSelect: (folder: FolderType) => void, isActive: boolean, assetCount: number }) {
    const { t } = useLanguage();
    return (
        <button
            onClick={() => onSelect(folder)}
            className={cn(
                "w-full text-left p-3 rounded-md hover:bg-muted transition-colors flex items-center gap-3 border",
                isActive ? "bg-primary/10 border-primary" : "bg-card"
            )}
        >
            <Folder className="h-6 w-6 text-primary shrink-0" />
            <div className="flex-grow truncate">
                <p className="text-sm font-medium truncate">{folder.name}</p>
                <p className="text-xs text-muted-foreground">{t('totalAssets', '{count} Assets', {count: assetCount})}</p>
            </div>
        </button>
    );
}

function FolderTreeSidebarItem({ folder, subFolders, onSelectFolder, selectedFolderId }: { folder: FolderType, subFolders: FolderType[], onSelectFolder: (folder: FolderType) => void, selectedFolderId: string | null }) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <>
            <SidebarMenuItem className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1"
                >
                    {subFolders.length > 0 && (isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />)}
                </button>
                <SidebarMenuButton 
                    onClick={() => onSelectFolder(folder)} 
                    isActive={selectedFolderId === folder.id}
                    tooltip={folder.name}
                    className="pl-5"
                >
                  <ProjectFolderIcon />
                  <span className="group-data-[collapsible=icon]:hidden truncate" title={folder.name}>{folder.name}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            {isOpen && subFolders.length > 0 && (
                <div className="pl-4 border-l ml-4">
                     {subFolders.map(subFolder => (
                        <FolderTreeSidebar key={subFolder.id} parentId={subFolder.id} onSelectFolder={onSelectFolder} selectedFolderId={selectedFolderId} />
                     ))}
                </div>
            )}
        </>
    );
}

function FolderTreeSidebar({ parentId, onSelectFolder, selectedFolderId }: { parentId: string | null, onSelectFolder: (folder: FolderType) => void, selectedFolderId: string | null }) {
    const { projectFolders } = useReviewContext();

    const childFolders = useMemo(() => {
        return projectFolders.filter(f => f.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
    }, [projectFolders, parentId]);

    return (
        <SidebarMenu className="space-y-1">
            {childFolders.map(folder => {
                const subFolders = projectFolders.filter(f => f.parentId === folder.id);
                return <FolderTreeSidebarItem key={folder.id} folder={folder} subFolders={subFolders} onSelectFolder={onSelectFolder} selectedFolderId={selectedFolderId} />;
            })}
        </SidebarMenu>
    );
}


const ReviewContext = React.createContext<{
    projectFolders: FolderType[];
    projectAssets: Asset[];
    assetCounts: Map<string, number>;
}>({ projectFolders: [], projectAssets: [], assetCounts: new Map() });

const useReviewContext = () => useContext(ReviewContext);

const ReviewContextProvider = ({ children, projectFolders, projectAssets }: { children: React.ReactNode, projectFolders: FolderType[], projectAssets: Asset[] }) => {
    const assetCounts = useMemo(() => {
        const counts = new Map<string, number>();
        projectAssets.forEach(asset => {
            const id = asset.folderId || 'root';
            counts.set(id, (counts.get(id) || 0) + 1);
        });
        projectFolders.forEach(folder => {
            if (!counts.has(folder.id)) counts.set(folder.id, 0);
        });
        return counts;
    }, [projectAssets, projectFolders]);
    
    return (
        <ReviewContext.Provider value={{ projectFolders, projectAssets, assetCounts }}>
            {children}
        </ReviewContext.Provider>
    );
};


export default function ReviewAllAssetsPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  const [projectFolders, setProjectFolders] = useState<FolderType[]>([]);
  const [projectAssets, setProjectAssets] = useState<Asset[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [projectContentLoading, setProjectContentLoading] = useState(false);

  const [assetToPreview, setAssetToPreview] = useState<Asset | null>(null);
  const [isImagePreviewModalOpen, setIsImagePreviewModalOpen] = useState(false);

  const [currentView, setCurrentView] = useState<ReviewPageView>('companyStats');
  
  const [assetToMarkActive, setAssetToMarkActive] = useState<Asset | null>(null);
  const [isMarkActiveConfirmOpen, setIsMarkActiveConfirmOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  type ReviewPageView = 'companyStats' | 'projectContent';
  
  const loadInitialAdminData = useCallback(async () => {
    if (currentUser && currentUser.role === 'Admin' && currentUser.companyId) {
      setPageLoading(true);
      try {
        const projects = await FirestoreService.getProjects(currentUser.companyId);
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
  }, [currentUser, authLoading, toast, t]);

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
    setSelectedFolderId(null);
    setAssetToPreview(null);
    setProjectAssets([]);
    setProjectFolders([]);

    if (project) {
        setCurrentView('projectContent');
        setProjectContentLoading(true);
        try {
            const [folders, assets] = await Promise.all([
                FirestoreService.getFolders(project.id),
                FirestoreService.getAllAssetsForProject(project.id, 'all')
            ]);
            setProjectFolders(folders);
            setProjectAssets(assets);
        } catch (e) {
            toast({ title: t('error', 'Error'), description: t('projectContentError', `Failed to load content for ${project.name}.`), variant: 'destructive'});
        } finally {
            setProjectContentLoading(false);
        }
    } else {
        setCurrentView('companyStats');
    }
  }, [toast, t]);


  const handleSelectFolder = useCallback((folder: FolderType | null) => {
    setSelectedFolderId(folder?.id ?? null);
    setAssetToPreview(null);
  }, []);

  const handleOpenImagePreview = (asset: Asset) => {
    setAssetToPreview(asset);
    setIsImagePreviewModalOpen(true);
  };
  
  const promptMarkAssetAsActive = useCallback((asset: Asset) => {
    setAssetToMarkActive(asset);
    setIsMarkActiveConfirmOpen(true);
  }, []);

  const confirmMarkAssetAsActive = useCallback(async () => {
    if (assetToMarkActive) {
      setIsUpdatingStatus(true);
      try {
        const success = await FirestoreService.updateAsset(assetToMarkActive.id, { isDone: false });
        if (success) {
          toast({
            title: t('assetStatusUpdated', 'Asset Status Updated'),
            description: t('assetMarkedAsActive', 'Asset "{assetName}" has been marked as active.', { assetName: assetToMarkActive.name }),
            variant: "success-yellow"
          });
          // Optimistic UI update
          setProjectAssets(prevAssets =>
            prevAssets.map(asset =>
              asset.id === assetToMarkActive.id ? { ...asset, isDone: false } : asset
            )
          );
        } else {
          toast({ title: "Error", description: "Failed to update asset status.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error updating asset status:", error);
        toast({ title: "Error", description: "An unexpected error occurred while updating the asset.", variant: "destructive" });
      } finally {
        setIsUpdatingStatus(false);
        setAssetToMarkActive(null);
        setIsMarkActiveConfirmOpen(false);
      }
    }
  }, [assetToMarkActive, t, toast]);
  
  const { activeAssets, completedAssets, subFolders, currentAssets } = useMemo(() => {
    const assetsInScope = projectAssets.filter(asset => (asset.folderId || null) === selectedFolderId);
    
    const active: Asset[] = [];
    const completed: Asset[] = [];
    
    assetsInScope.forEach(asset => {
      if (asset.isDone) completed.push(asset);
      else active.push(asset);
    });

    return { 
        activeAssets: active, 
        completedAssets: completed,
        subFolders: projectFolders.filter(f => f.parentId === selectedFolderId).sort((a,b) => a.name.localeCompare(b.name)),
        currentAssets: assetsInScope, // All assets in current folder/root
    };
  }, [projectAssets, projectFolders, selectedFolderId]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return projectFolders.find(f => f.id === selectedFolderId) || null;
  }, [selectedFolderId, projectFolders]);


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
    <ReviewContextProvider projectFolders={projectFolders} projectAssets={projectAssets}>
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
            <ScrollArea className="h-[calc(100%-120px)] group-data-[collapsible=icon]:h-[calc(100%-60px)]">
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
                 <div className="px-3 py-1 group-data-[collapsible=icon]:hidden">
                    <span className="text-xs font-medium text-muted-foreground uppercase">{t('projectsSidebarItem', 'Projects')}</span>
                </div>
                <SidebarMenu className="p-2 pt-0 space-y-1">
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
                        {selectedProject?.id === project.id && (
                            <div className="pl-5 pt-1">
                                <FolderTreeSidebar parentId={null} onSelectFolder={handleSelectFolder} selectedFolderId={selectedFolderId} />
                            </div>
                        )}
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentView === 'companyStats' && (
             <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-headline text-primary">{t('companyWideAssetStats', 'Company-Wide Asset Statistics')}</CardTitle>
                        <CardDescription>{t('selectProjectToViewDetailsPrompt', 'Select a project from the sidebar to view its specific folders and assets.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <p className="text-muted-foreground">{t('selectProjectToViewDetailsPrompt', 'Select a project from the sidebar to view its specific folders and assets.')}</p>
                    </CardContent>
                 </Card>
             </div>
          )}

          {currentView === 'projectContent' && selectedProject && (
            <div className="space-y-6">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-2xl sm:text-3xl font-bold font-headline text-primary"> {selectedFolder ? selectedFolder.name : selectedProject.name} </CardTitle>
                    <CardDescription> 
                        {selectedFolder ? `${t('reviewingFolder', 'Reviewing folder:')}` : t('reviewingProjectRoot', 'Reviewing project root assets')}
                    </CardDescription>
                </CardHeader>
                {projectContentLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="ml-3 text-muted-foreground">{t('loadingProjectContent', 'Loading project content...')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                         {subFolders.length > 0 && (
                            <Card>
                                <CardHeader><CardTitle>{t('folders', 'Folders')} ({subFolders.length})</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-60"><div className="space-y-2 pr-2">
                                        {subFolders.map(folder => (
                                            <FolderListItem key={folder.id} folder={folder} onSelect={handleSelectFolder} isActive={false} assetCount={0}/>
                                        ))}
                                    </div></ScrollArea>
                                </CardContent>
                            </Card>
                        )}
                         
                        {(activeAssets.length > 0 || completedAssets.length > 0) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader><CardTitle className="flex items-center gap-2"><List className="h-5 w-5 text-primary"/>{t('activeAssets', 'Active Assets')} ({activeAssets.length})</CardTitle></CardHeader>
                                    <CardContent><ScrollArea className="h-96"><div className="space-y-2 pr-2">
                                        {activeAssets.length > 0 ? activeAssets.map(asset => (
                                            <AssetListItem key={asset.id} asset={asset} onSelect={handleOpenImagePreview} isActive={assetToPreview?.id === asset.id} isCompletedView={false} onMarkActive={promptMarkAssetAsActive}/>
                                        )) : <p className="text-sm text-muted-foreground p-4 text-center">{t('noActiveAssets', 'No active assets in this folder.')}</p>}
                                    </div></ScrollArea></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600"/>{t('completedAssets', 'Completed Assets')} ({completedAssets.length})</CardTitle></CardHeader>
                                    <CardContent><ScrollArea className="h-96"><div className="space-y-2 pr-2">
                                        {completedAssets.length > 0 ? completedAssets.map(asset => (
                                            <AssetListItem key={asset.id} asset={asset} onSelect={handleOpenImagePreview} isActive={assetToPreview?.id === asset.id} isCompletedView={true} onMarkActive={promptMarkAssetAsActive}/>
                                        )) : <p className="text-sm text-muted-foreground p-4 text-center">{t('noCompletedAssets', 'No completed assets in this folder.')}</p>}
                                    </div></ScrollArea></CardContent>
                                </Card>
                            </div>
                        ) : (
                             subFolders.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">{t('noAssetsInFolder', 'No assets in this folder.')}</p>
                        )}
                    </div>
                )}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
    
    {assetToPreview && (
        <ImagePreviewModal
            isOpen={isImagePreviewModalOpen}
            onClose={() => {
                setIsImagePreviewModalOpen(false);
                setAssetToPreview(null);
            }}
            asset={assetToPreview}
        />
    )}
     {assetToMarkActive && (
        <AlertDialog open={isMarkActiveConfirmOpen} onOpenChange={setIsMarkActiveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmStatusChangeTitle', 'Confirm Status Change')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmMarkActiveDesc', `Are you sure you want to mark asset "{assetName}" as active? It will be moved to the "Active Assets" list.`, { assetName: assetToMarkActive.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setAssetToMarkActive(null); setIsMarkActiveConfirmOpen(false); }}>{t('cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmMarkAssetAsActive} className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isUpdatingStatus}>
                {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('confirm', 'Confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ReviewContextProvider>
  );
}
