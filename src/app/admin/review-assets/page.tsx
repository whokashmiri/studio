
"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import * as FirestoreService from '@/lib/firestore-service';
import type { AssetWithContext } from '@/lib/firestore-service';
import type { Project, Folder as FolderType, Asset } from '@/data/mock-data';
import { Loader2, ShieldAlert, Home, ArrowLeft, LayoutDashboard, FileText, BarChart3, SettingsIcon, FolderIcon as ProjectFolderIcon, Eye, Edit, Briefcase, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { FolderTreeDisplay } from '@/components/folder-tree';
import { ImagePreviewModal } from '@/components/modals/image-preview-modal';
import { AssetDetailDisplay } from '@/components/asset-detail-display';
import { useToast } from '@/hooks/use-toast';


type ReviewPageView = 'companyStats' | 'projectContent' | 'assetDetail';

export default function ReviewAllAssetsPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [allCompanyAssets, setAllCompanyAssets] = useState<AssetWithContext[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectFolders, setSelectedProjectFolders] = useState<FolderType[]>([]);
  const [selectedProjectRootAssets, setSelectedProjectRootAssets] = useState<Asset[]>([]);
  const [selectedProjectAllAssets, setSelectedProjectAllAssets] = useState<Asset[]>([]);
  const [selectedProjectCurrentFolder, setSelectedProjectCurrentFolder] = useState<FolderType | null>(null);
  const [currentAssetsInSelectedProjectFolder, setCurrentAssetsInSelectedProjectFolder] = useState<Asset[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [projectContentLoading, setProjectContentLoading] = useState(false);

  const [assetToPreview, setAssetToPreview] = useState<Asset | null>(null);
  const [isImagePreviewModalOpen, setIsImagePreviewModalOpen] = useState(false);
  const [refreshFolderTreeKey, setRefreshFolderTreeKey] = useState(0);

  const [currentView, setCurrentView] = useState<ReviewPageView>('companyStats');
  const [assetForDetailView, setAssetForDetailView] = useState<Asset | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);


  const loadInitialAdminData = useCallback(async () => {
    if (currentUser && currentUser.role === 'Admin' && currentUser.companyId) {
      setPageLoading(true);
      try {
        const [assets, projects] = await Promise.all([
          FirestoreService.getAllAssetsForCompany(currentUser.companyId),
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

  const handleProjectSelect = useCallback(async (project: Project | null) => {
    setSelectedProject(project);
    setSelectedProjectCurrentFolder(null); 
    setAssetForDetailView(null); 

    if (project) {
      setCurrentView('projectContent');
      setProjectContentLoading(true);
      try {
        const [folders, allAssets] = await Promise.all([
          FirestoreService.getFolders(project.id),
          FirestoreService.getAllAssetsForProject(project.id) 
        ]);
        const rootAssetsForProject = allAssets.filter(asset => asset.folderId === null);
        setSelectedProjectFolders(folders);
        setSelectedProjectRootAssets(rootAssetsForProject);
        setCurrentAssetsInSelectedProjectFolder(rootAssetsForProject); 
        setSelectedProjectAllAssets(allAssets);
      } catch (error) {
        console.error(`Error loading content for project ${project.name}:`, error);
        toast({ title: t('error', 'Error'), description: t('projectContentError', `Failed to load content for ${project.name}.`), variant: 'destructive'});
        setSelectedProjectFolders([]);
        setSelectedProjectRootAssets([]);
        setCurrentAssetsInSelectedProjectFolder([]);
        setSelectedProjectAllAssets([]);
      } finally {
        setProjectContentLoading(false);
        setRefreshFolderTreeKey(prev => prev + 1);
      }
    } else {
      setCurrentView('companyStats');
      setSelectedProjectFolders([]);
      setSelectedProjectRootAssets([]);
      setCurrentAssetsInSelectedProjectFolder([]);
      setSelectedProjectAllAssets([]);
    }
  }, [toast, t]);

  const handleSelectFolderInTree = useCallback(async (folder: FolderType | null) => {
    setSelectedProjectCurrentFolder(folder);
    setAssetForDetailView(null); 
    setCurrentView('projectContent'); 

    if (selectedProject) {
      setProjectContentLoading(true);
      try {
        const allAssets = await FirestoreService.getAllAssetsForProject(selectedProject.id);
        const assetsInFolder = allAssets.filter(asset => asset.folderId === (folder ? folder.id : null));
        setCurrentAssetsInSelectedProjectFolder(assetsInFolder);
        setSelectedProjectAllAssets(allAssets);
      } catch (error) {
        console.error(`Error loading assets for folder:`, error);
        toast({ title: t('error', 'Error'), description: t('folderAssetsError', 'Failed to load assets for folder.'), variant: 'destructive'});
        setCurrentAssetsInSelectedProjectFolder([]);
      } finally {
        setProjectContentLoading(false);
        setRefreshFolderTreeKey(prev => prev + 1);
      }
    }
  }, [selectedProject, toast, t]);


  const handleViewAssetDetail = useCallback((asset: Asset) => {
    setAssetForDetailView(asset);
    setCurrentView('assetDetail');
  }, []);

  const handleBackToProjectContentView = useCallback(() => {
    setAssetForDetailView(null);
    setCurrentView('projectContent');
  }, []);


  const handleDeleteAsset = useCallback(async (assetToDelete: Asset) => {
    if (window.confirm(t('deleteAssetConfirmationDesc', `Are you sure you want to delete asset "${assetToDelete.name}"?`, {assetName: assetToDelete.name}))) {
      setDeletingAssetId(assetToDelete.id);
      try {
        const success = await FirestoreService.deleteAsset(assetToDelete.id);
        if (success) {
          toast({ title: t('assetDeletedTitle', 'Asset Deleted'), description: t('assetDeletedDesc', `Asset "${assetToDelete.name}" has been deleted.`, {assetName: assetToDelete.name})});
          
          setAllCompanyAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
          
          if (currentView === 'assetDetail' && assetForDetailView?.id === assetToDelete.id) {
            handleBackToProjectContentView(); 
          }
          
          if (selectedProject) { 
              handleSelectFolderInTree(selectedProjectCurrentFolder);
          }
        } else {
          toast({ title: t('error', 'Error'), description: t('deleteError', 'Failed to delete asset.'), variant: "destructive" });
        }
      } catch (error) {
          console.error("Error deleting asset:", error);
          toast({ title: t('error', 'Error'), description: t('deleteError', 'Failed to delete asset.'), variant: "destructive" });
      } finally {
        setDeletingAssetId(null);
      }
    }
  }, [t, toast, selectedProject, selectedProjectCurrentFolder, handleSelectFolderInTree, currentView, assetForDetailView, handleBackToProjectContentView]);

  const handleOpenImagePreviewModal = useCallback((asset: Asset) => {
    setAssetToPreview(asset);
    setIsImagePreviewModalOpen(true);
  }, []);

  const handleCloseImagePreviewModal = useCallback(() => {
    setIsImagePreviewModalOpen(false);
    setAssetToPreview(null);
  }, []);


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
  
  const foldersForTree = selectedProjectFolders.filter(folder => {
    if (selectedProjectCurrentFolder) {
      return folder.parentId === selectedProjectCurrentFolder.id;
    }
    return folder.parentId === null;
  });

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
                  onClick={() => handleProjectSelect(null)} 
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
                        onClick={() => handleProjectSelect(project)} 
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-card/50">
                          <CardHeader className="pb-2">
                              <CardDescription>{t('totalAssetsStatLabel', 'Total Assets in Company')}</CardDescription>
                              <CardTitle className="text-4xl">{allCompanyAssets.length}</CardTitle>
                          </CardHeader>
                      </Card>
                      {/* You can add more stats cards here if needed */}
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
                                            <CardTitle className="text-base font-semibold truncate" title={project.name}>
                                                {project.name}
                                            </CardTitle>
                                             <CardDescription className="text-xs">
                                                {project.description || t('noDescriptionAvailable', 'No description available.')}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow flex items-end pt-2">
                                            <Button variant="outline" size="sm" className="w-full" onClick={() => handleProjectSelect(project)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                {t('viewContentButton', 'View Content')}
                                            </Button>
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
                <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl sm:text-3xl font-bold font-headline text-primary">
                        {selectedProject.name}
                    </CardTitle>
                    <Link href={`/project/${selectedProject.id}`} passHref legacyBehavior>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        {t('viewProjectButton', 'View Project Details')}
                      </Button>
                    </Link>
                </div>
                <CardDescription>
                  {t('reviewProjectContentDesc', 'Review folders and assets for {projectName}. Click an asset to view its details or edit.', { projectName: selectedProject.name })}
                </CardDescription>
              </CardHeader>
              
              {projectContentLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">{t('loadingProjectContent', 'Loading project content...')}</p>
                </div>
              ) : (
                <Card>
                    <CardContent className="pt-6">
                        <FolderTreeDisplay
                            key={refreshFolderTreeKey}
                            foldersToDisplay={foldersForTree}
                            assetsToDisplay={currentAssetsInSelectedProjectFolder}
                            allProjectAssets={selectedProjectAllAssets}
                            projectId={selectedProject.id}
                            onSelectFolder={handleSelectFolderInTree}
                            onAddSubfolder={() => toast({ title: t('actionNotAvailableTitle', 'Action Not Available'), description: t('addSubfolderNotAvailableDescReview', 'Adding subfolders is done on the main project page.'), variant: "default"})}
                            onEditFolder={() => toast({ title: t('actionNotAvailableTitle', 'Action Not Available'), description: t('editFolderNotAvailableDescReview', 'Editing folders is done on the main project page.'), variant: "default"})}
                            onDeleteFolder={() => toast({ title: t('actionNotAvailableTitle', 'Action Not Available'), description: t('deleteFolderNotAvailableDescReview', 'Deleting folders is done on the main project page.'), variant: "default"})}
                            onEditAsset={handleViewAssetDetail} 
                            onDeleteAsset={handleDeleteAsset}
                            onPreviewAsset={handleOpenImagePreviewModal}
                            currentSelectedFolderId={selectedProjectCurrentFolder?.id || null}
                            deletingAssetId={deletingAssetId}
                        />
                         {(foldersForTree.length === 0 && currentAssetsInSelectedProjectFolder.length === 0) && (
                            <p className="text-muted-foreground text-center py-6">
                                {selectedProjectCurrentFolder 
                                    ? t('folderIsEmpty', 'This folder is empty.') 
                                    : t('projectRootIsEmptyReview', 'This project has no root folders or assets.')
                                }
                            </p>
                         )}
                    </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentView === 'assetDetail' && assetForDetailView && (
             <AssetDetailDisplay asset={assetForDetailView} onBack={handleBackToProjectContentView} />
          )}
        </SidebarInset>
      </div>
       {assetToPreview && (
        <ImagePreviewModal
          isOpen={isImagePreviewModalOpen}
          onClose={handleCloseImagePreviewModal}
          asset={assetToPreview}
        />
      )}
    </SidebarProvider>
  );
}
