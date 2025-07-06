
"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderTreeDisplay } from '@/components/folder-tree';
import type { Project, Folder as FolderType, ProjectStatus, Asset } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { Home, FolderPlus, FilePlus, Loader2, CloudOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { EditFolderModal } from '@/components/modals/edit-folder-modal';
import { NewAssetModal } from '@/components/modals/new-asset-modal'; 
import { ImagePreviewModal } from '@/components/modals/image-preview-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOnlineStatus } from '@/hooks/use-online-status';
import * as OfflineService from '@/lib/offline-service';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const currentUrlFolderId = searchParams.get('folderId');
  const isOnline = useOnlineStatus();

  const [project, setProject] = useState<Project | null>(null);
  const [allProjectFolders, setAllProjectFolders] = useState<FolderType[]>([]);
  const [allProjectAssets, setAllProjectAssets] = useState<Asset[]>([]);
  
  const [offlineFolders, setOfflineFolders] = useState<FolderType[]>([]);
  const [offlineAssets, setOfflineAssets] = useState<Asset[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  
  const [isNavigatingToHome, setIsNavigatingToHome] = useState(false);

  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderParentContext, setNewFolderParentContext] = useState<FolderType | null>(null);

  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);

  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false); 

  const [assetToPreview, setAssetToPreview] = useState<Asset | null>(null);
  const [isImagePreviewModalOpen, setIsImagePreviewModalOpen] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';
  const isMobile = useIsMobile();

  const loadAllProjectData = useCallback(async () => {
    if (projectId) {
      setIsLoading(true);
      try {
        const [foundProject, projectFolders, projectAssets] = await Promise.all([
          FirestoreService.getProjectById(projectId),
          FirestoreService.getFolders(projectId),
          FirestoreService.getAllAssetsForProject(projectId)
        ]);

        if (!foundProject) {
          toast({ title: t('projectNotFound', "Project not found"), variant: "destructive" });
          router.push('/');
          return;
        }
        
        setProject(foundProject);
        setAllProjectFolders(projectFolders);
        setAllProjectAssets(projectAssets);
        
        const queuedActions = OfflineService.getOfflineQueue();
        const localFolders = queuedActions
          .filter(a => a.type === 'add-folder' && a.projectId === projectId)
          .map(a => ({ ...a.payload, id: a.localId, isOffline: true } as FolderType));
        const localAssets = queuedActions
          .filter(a => a.type === 'add-asset' && a.projectId === projectId)
          .map(a => ({ ...a.payload, id: a.localId, createdAt: Date.now(), isOffline: true } as Asset));

        setOfflineFolders(localFolders);
        setOfflineAssets(localAssets);

      } catch (error) {
        console.error("Error loading project data:", error);
        toast({ title: "Error", description: "Failed to load project data.", variant: "destructive" });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }
  }, [projectId, router, t, toast]);
  
  useEffect(() => {
    loadAllProjectData();
  }, [loadAllProjectData]);

  useEffect(() => {
    if (isOnline) {
      OfflineService.syncOfflineActions().then(({ syncedCount }) => {
        if (syncedCount > 0) {
          toast({
            title: "Data Synced",
            description: `${syncedCount} offline item(s) have been successfully synced.`,
            variant: "success-yellow"
          });
          loadAllProjectData(); 
        }
      });
    }
  }, [isOnline, loadAllProjectData, toast]);

  const combinedFolders = useMemo(() => [...allProjectFolders, ...offlineFolders], [allProjectFolders, offlineFolders]);
  const combinedAssets = useMemo(() => [...allProjectAssets, ...offlineAssets], [allProjectAssets, offlineAssets]);

  const foldersMap = useMemo(() => new Map(combinedFolders.map(f => [f.id, f])), [combinedFolders]);
  const selectedFolder = useMemo(() => currentUrlFolderId ? foldersMap.get(currentUrlFolderId) ?? null : null, [currentUrlFolderId, foldersMap]);
  
  useEffect(() => {
    if (!isLoading && currentUrlFolderId && combinedFolders.length > 0 && !foldersMap.has(currentUrlFolderId)) {
        toast({ title: "Error", description: t('folderNotFoundOrInvalid', "Folder not found or invalid for this project."), variant: "destructive" });
        router.push(`/project/${projectId}`);
    }
  }, [currentUrlFolderId, foldersMap, isLoading, projectId, router, t, toast, combinedFolders.length]);

  const getFolderPath = useCallback((folderId: string | null): Array<{ id: string | null; name: string, type: 'project' | 'folder'}> => {
    const path: Array<{ id: string | null; name: string, type: 'project' | 'folder' }> = [];
    if (!project) return path;

    let current: FolderType | undefined | null = folderId ? foldersMap.get(folderId) : null;
    if (current && current.projectId !== project.id) current = null; 

    while (current) {
      path.unshift({ id: current.id, name: current.name, type: 'folder' });
      const parentCand = current.parentId ? foldersMap.get(current.parentId) : null;
      current = (parentCand && parentCand.projectId === project.id) ? parentCand : null;
    }
    path.unshift({ id: null, name: project.name, type: 'project' });
    return path;
  }, [foldersMap, project]);

  const breadcrumbItems = useMemo(() => {
    if (!project) return []; 
    return getFolderPath(currentUrlFolderId);
  }, [project, currentUrlFolderId, getFolderPath]);
  
  const foldersToDisplay = useMemo(() => {
    return combinedFolders.filter(folder => folder.parentId === (currentUrlFolderId || null));
  }, [combinedFolders, currentUrlFolderId]);

  const assetsToDisplay = useMemo(() => {
    return combinedAssets.filter(asset => asset.folderId === (currentUrlFolderId || null));
  }, [combinedAssets, currentUrlFolderId]);

  const handleSelectFolder = useCallback((folder: FolderType | null) => {
    const targetPath = `/project/${projectId}${folder ? `?folderId=${folder.id}` : ''}`;
    router.push(targetPath, { scroll: false }); 
  }, [projectId, router]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || !project) return;

    setIsCreatingFolder(true);
    const newFolderData: Omit<FolderType, 'id'> = {
      name: newFolderName,
      projectId: project.id,
      parentId: newFolderParentContext ? newFolderParentContext.id : null,
    };

    if (isOnline) {
      try {
        const createdFolder = await FirestoreService.addFolder(newFolderData);
        if (createdFolder) {
          await FirestoreService.updateProject(project.id, { status: 'recent' as ProjectStatus });
          toast({ title: t('folderCreated', 'Folder Created'), description: t('folderCreatedNavigatedDesc', `Folder "{folderName}" created.`, {folderName: createdFolder.name})});
          await loadAllProjectData();
        } else {
          toast({ title: "Error", description: "Failed to create folder.", variant: "destructive" });
        }
      } finally {
        setIsCreatingFolder(false);
        setNewFolderName('');
        setIsNewFolderDialogOpen(false);
        setNewFolderParentContext(null);
      }
    } else {
      const { localId } = OfflineService.queueOfflineAction('add-folder', newFolderData, project.id);
      const optimisticFolder: FolderType = { ...newFolderData, id: localId, isOffline: true };
      setOfflineFolders(prev => [...prev, optimisticFolder]);
      toast({ title: "Working Offline", description: `Folder "${newFolderName}" saved locally. It will sync when you're back online.` });
      
      setIsCreatingFolder(false);
      setNewFolderName('');
      setIsNewFolderDialogOpen(false);
      setNewFolderParentContext(null);
    }
  }, [newFolderName, project, newFolderParentContext, loadAllProjectData, t, toast, isOnline]);

  const openNewFolderDialog = useCallback((parentContextForNewDialog: FolderType | null) => {
    setNewFolderParentContext(parentContextForNewDialog);
    setIsNewFolderDialogOpen(true);
  }, []); 

  const handleOpenEditFolderModal = useCallback((folderToEdit: FolderType) => {
    if (folderToEdit.isOffline) {
      toast({ title: "Action Not Available", description: "Cannot edit an item that is pending sync.", variant: "default" });
      return;
    }
    setEditingFolder(folderToEdit);
    setIsEditFolderModalOpen(true);
  }, [toast]);

  const handleFolderDeleted = useCallback(async () => {
    await loadAllProjectData(); 
  }, [loadAllProjectData]);

  const handleFolderUpdated = useCallback(async () => {
    await loadAllProjectData(); 
    if (project) {
      await FirestoreService.updateProject(project.id, { status: 'recent' as ProjectStatus });
      const updatedProj = await FirestoreService.getProjectById(project.id);
      setProject(updatedProj);
    }
  }, [loadAllProjectData, project]);

  const handleEditAsset = useCallback((asset: Asset) => {
    if (asset.isOffline) {
      toast({ title: "Action Not Available", description: "Cannot edit an item that is pending sync.", variant: "default" });
      return;
    }
    const editUrl = `/project/${projectId}/new-asset?assetId=${asset.id}${asset.folderId ? `&folderId=${asset.folderId}` : ''}`;
    router.push(editUrl); 
  }, [projectId, router, toast]);

  const handleDeleteAsset = useCallback(async (assetToDelete: Asset) => {
    if (assetToDelete.isOffline) {
      toast({ title: "Action Not Available", description: "Cannot delete an item that is pending sync.", variant: "default" });
      return;
    }
    if (window.confirm(t('deleteAssetConfirmationDesc', `Are you sure you want to delete asset "${assetToDelete.name}"?`, {assetName: assetToDelete.name}))) {
      const success = await FirestoreService.deleteAsset(assetToDelete.id);
      if (success) {
        toast({ title: t('assetDeletedTitle', 'Asset Deleted'), description: t('assetDeletedDesc', `Asset "${assetToDelete.name}" has been deleted.`, {assetName: assetToDelete.name})});
        await loadAllProjectData();
      } else {
        toast({ title: "Error", description: "Failed to delete asset.", variant: "destructive" });
      }
    }
  }, [loadAllProjectData, t, toast]);

  const handleAssetCreatedInModal = useCallback(async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isOnline) {
      const { localId } = OfflineService.queueOfflineAction('add-asset', assetData, projectId);
      const optimisticAsset: Asset = {
          ...assetData,
          id: localId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isOffline: true,
          isUploading: false,
      };
      setOfflineAssets(prev => [...prev, optimisticAsset]);
      toast({ title: "Working Offline", description: `Asset "${assetData.name}" saved locally. It will sync when you're back online.` });
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const optimisticAsset: Asset = {
      ...assetData,
      id: tempId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isUploading: true,
      photos: assetData.photos || [],
      folderId: assetData.folderId || null,
    };

    setAllProjectAssets(prev => [...prev, optimisticAsset]);

    toast({
      title: t('saving', 'Saving...'),
      description: `Asset "${assetData.name}" is being uploaded.`,
    });

    try {
      const newAssetFromDb = await FirestoreService.addAsset(assetData);
      if (newAssetFromDb) {
        setAllProjectAssets(prev => prev.map(asset => 
          asset.id === tempId ? { ...newAssetFromDb, isUploading: false } : asset
        ));
        toast({
          title: t('assetSavedTitle', "Asset Saved"),
          description: t('assetSavedDesc', `Asset "${newAssetFromDb.name}" has been saved.`, { assetName: newAssetFromDb.name }),
          variant: "success-yellow"
        });
      } else {
        toast({ title: "Error", description: `Failed to save asset "${assetData.name}".`, variant: "destructive" });
        setAllProjectAssets(prev => prev.filter(asset => asset.id !== tempId));
      }
    } catch (error) {
      console.error("Error saving asset in background:", error);
      toast({ title: "Error", description: `An error occurred while saving "${assetData.name}".`, variant: "destructive" });
      setAllProjectAssets(prev => prev.filter(asset => asset.id !== tempId));
    }
  }, [isOnline, projectId, toast, t]);


  const handleOpenImagePreviewModal = useCallback((asset: Asset) => {
    if(asset.isUploading) return;
    setAssetToPreview(asset);
    setIsImagePreviewModalOpen(true);
  }, []);

  const handleCloseImagePreviewModal = useCallback(() => {
    setIsImagePreviewModalOpen(false);
    setAssetToPreview(null);
  }, []);

  if (isLoading || !project) {
    return (
        <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground mt-4">
            {t('loadingProjectContext', 'Loading project context...')}
            </p>
        </div>
    );
  }

  const isCurrentLocationEmpty = foldersToDisplay.length === 0 && assetsToDisplay.length === 0;

  return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-2 sm:space-y-4 pb-24">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:underline p-0 h-auto text-sm flex items-center"
              onClick={() => {
                setIsNavigatingToHome(true);
                router.push('/');
              }}
              disabled={isNavigatingToHome}
            >
              {isNavigatingToHome ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Home className="mr-1 h-4 w-4" />
              )}
              {t('backToDashboard', 'Back to Dashboard')}
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline mt-1 flex items-center gap-2">
              {project.name}
              {!isOnline && <CloudOff className="h-6 w-6 text-muted-foreground" title="You are currently offline." />}
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader className="pt-3 px-4 pb-0 md:pt-4 md:px-6 md:pb-0">
              <CardTitle className="text-base sm:text-lg flex flex-wrap items-center mb-3">
              {breadcrumbItems.map((item, index) => (
                  <React.Fragment key={item.id || `project_root_${project.id}`}>
                  <span
                      className={`cursor-pointer hover:underline ${index === breadcrumbItems.length - 1 ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => {
                      if (item.type === 'project') {
                          handleSelectFolder(null);
                      } else if (item.id) {
                          const folderToSelect = foldersMap.get(item.id); 
                          if (folderToSelect) handleSelectFolder(folderToSelect);
                      }
                      }}
                      title={t('clickToNavigateTo', 'Click to navigate to {name}', { name: item.name })}
                  >
                      {item.name}
                  </span>
                  {index < breadcrumbItems.length - 1 && <span className="mx-1.5 text-muted-foreground">{t('breadcrumbSeparator', '>')}</span>}
                  </React.Fragment>
              ))}
              </CardTitle>
          </CardHeader>
          <CardContent className={cn("transition-colors rounded-b-lg p-2 md:p-4")}>
            <ScrollArea className="h-[calc(100vh-21rem)] pr-3">
              <FolderTreeDisplay
                  foldersToDisplay={foldersToDisplay}
                  assetsToDisplay={assetsToDisplay}
                  projectId={project.id}
                  onSelectFolder={handleSelectFolder}
                  onAddSubfolder={openNewFolderDialog}
                  onEditFolder={handleOpenEditFolderModal}
                  onDeleteFolder={handleFolderDeleted}
                  onEditAsset={handleEditAsset} 
                  onDeleteAsset={handleDeleteAsset}
                  onPreviewAsset={handleOpenImagePreviewModal}
                  currentSelectedFolderId={selectedFolder?.id || null}
                  displayMode="grid"
              />
              {isCurrentLocationEmpty && (
                  <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        {selectedFolder ? t('folderIsEmpty', 'This folder is empty. Add a subfolder or asset.') : t('projectRootIsEmpty', 'This project has no folders or root assets. Add a folder to get started.')}
                      </p>
                  </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 inset-x-0 p-4 bg-background/80 backdrop-blur-sm border-t z-40">
          <div className="container mx-auto flex justify-center items-center gap-4">
              <Button 
                  variant="default" 
                  size="lg" 
                  onClick={() => openNewFolderDialog(selectedFolder)} 
                  title={selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
                  className="shadow-lg"
              >
                  <FolderPlus className="mr-2 h-5 w-5" />
                  {selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
              </Button>
              {selectedFolder && (
                <Button
                    onClick={() => setIsNewAssetModalOpen(true)} 
                    className="shadow-lg"
                    size="lg"
                    title={t('newAsset', 'New Asset')}
                >
                    <FilePlus className="mr-2 h-5 w-5" />
                    {t('newAsset', 'New Asset')}
                </Button>
              )}
          </div>
        </div>

        <Dialog open={isNewFolderDialogOpen} onOpenChange={(isOpen) => {
          if (isCreatingFolder) return;
          if (!isOpen) {
            setNewFolderName('');
            setNewFolderParentContext(null);
          }
          setIsNewFolderDialogOpen(isOpen);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                  {newFolderParentContext ? t('addNewSubfolderTo', 'Add New Subfolder to "{parentName}"', { parentName: newFolderParentContext.name }) : t('addRootFolderTitle', 'Add Folder to Project Root')}
              </DialogTitle>
            </DialogHeader>
            <div className="pt-4 pb-0 space-y-2 flex-grow overflow-y-auto">
              <Label htmlFor="new-folder-name">{t('folderName', 'Folder Name')}</Label>
              <Input
                id="new-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t('folderNamePlaceholder', "e.g., Inspection Area 1")}
                disabled={isCreatingFolder}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsNewFolderDialogOpen(false); setNewFolderName(''); setNewFolderParentContext(null); }} disabled={isCreatingFolder}>{t('cancel', 'Cancel')}</Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isCreatingFolder}>
                {isCreatingFolder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreatingFolder ? t('saving', 'Saving...') : t('confirm', 'Confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {editingFolder && (
          <EditFolderModal
            isOpen={isEditFolderModalOpen}
            onClose={() => {
              setIsEditFolderModalOpen(false);
              setEditingFolder(null);
            }}
            folder={editingFolder}
            onFolderUpdated={handleFolderUpdated}
          />
        )}
        
        {project && (
          <NewAssetModal
              isOpen={isNewAssetModalOpen}
              onClose={() => setIsNewAssetModalOpen(false)}
              project={project}
              parentFolder={selectedFolder}
              onAssetCreated={handleAssetCreatedInModal}
          />
        )}

        {assetToPreview && (
          <ImagePreviewModal
            isOpen={isImagePreviewModalOpen}
            onClose={handleCloseImagePreviewModal}
            asset={assetToPreview}
          />
        )}
      </div>
  );
}
