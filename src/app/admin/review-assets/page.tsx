
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

type ReviewPageView = 'companyStats' | 'projectContent';
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
            <div className="h-full flex flex-col items-center justify-center bg-muted/50 rounded-lg p-4 text-center sticky top-8">
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
  const [currentView, setCurrentView] = useState<ReviewPageView>('companyStats');
  
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

  const handleEditAsset = (assetToEdit: Asset) => {
    const editUrl = `/project/${assetToEdit.projectId}/new-asset?assetId=${assetToEdit.id}${assetToEdit.folderId ? `&folderId=${assetToEdit.folderId}` : ''}`;
    router.push(editUrl);
  };
  
  const { activeAssets, completedAssets, rootFolders, rootAssets } = useMemo(() => {
    let active: Asset[] = [];
    let completed: Asset[] = [];
    
    const assetsInScope = projectAssets.filter(asset => asset.folderId === selectedFolderId);

    assetsInScope.forEach(asset => {
      if (asset.isDone) completed.push(asset);
      else active.push(asset);
    });

    return { 
        activeAssets: active, 
        completedAssets: completed,
        rootFolders: projectFolders.filter(f => f.parentId === null).sort((a,b) => a.name.localeCompare(b.name)),
        rootAssets: projectAssets.filter(a => a.folderId === null),
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            {/* Folder View or Asset Split View */}
                            {!selectedFolderId ? (
                                <>
                                    <Card>
                                        <CardHeader><CardTitle>{t('folders', 'Folders')} ({rootFolders.length})</CardTitle></CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-60"><div className="space-y-2 pr-2">
                                                {rootFolders.length > 0 ? rootFolders.map(folder => (
                                                    <FolderListItem key={folder.id} folder={folder} onSelect={handleSelectFolder} isActive={false} assetCount={0}/>
                                                )) : <p className="text-sm text-muted-foreground p-4 text-center">{t('noFoldersInProject', 'This project has no folders yet.')}</p>}
                                            </div></ScrollArea>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle>{t('assetsInProjectRoot', 'Assets in Project Root')} ({rootAssets.length})</CardTitle></CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-60"><div className="space-y-2 pr-2">
                                                {rootAssets.length > 0 ? rootAssets.map(asset => (
                                                    <AssetListItem key={asset.id} asset={asset} onSelect={setAssetToPreview} isActive={assetToPreview?.id === asset.id}/>
                                                )) : <p className="text-sm text-muted-foreground p-4 text-center">{t('noAssetsInFolder', 'No assets in this folder.')}</p>}
                                            </div></ScrollArea>
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader><CardTitle className="flex items-center gap-2"><List className="h-5 w-5 text-primary"/>{t('activeAssets', 'Active Assets')} ({activeAssets.length})</CardTitle></CardHeader>
                                        <CardContent><ScrollArea className="h-96"><div className="space-y-2 pr-2">
                                            {activeAssets.length > 0 ? activeAssets.map(asset => (
                                                <AssetListItem key={asset.id} asset={asset} onSelect={setAssetToPreview} isActive={assetToPreview?.id === asset.id}/>
                                            )) : <p className="text-sm text-muted-foreground p-4 text-center">{t('noActiveAssets', 'No active assets in this folder.')}</p>}
                                        </div></ScrollArea></CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600"/>{t('completedAssets', 'Completed Assets')} ({completedAssets.length})</CardTitle></CardHeader>
                                        <CardContent><ScrollArea className="h-96"><div className="space-y-2 pr-2">
                                            {completedAssets.length > 0 ? completedAssets.map(asset => (
                                                <AssetListItem key={asset.id} asset={asset} onSelect={setAssetToPreview} isActive={assetToPreview?.id === asset.id}/>
                                            )) : <p className="text-sm text-muted-foreground p-4 text-center">{t('noCompletedAssets', 'No completed assets in this folder.')}</p>}
                                        </div></ScrollArea></CardContent>
                                    </Card>
                                </div>
                            )}
                         </div>
                         <div className="md:col-span-1">
                            <AssetPreviewer asset={assetToPreview} onEdit={handleEditAsset} />
                         </div>
                    </div>
                )}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
    </ReviewContextProvider>
  );
}


    

    