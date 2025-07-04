
"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderTreeDisplay } from '@/components/folder-tree';
import type { Project, Folder as FolderType, ProjectStatus, Asset } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { Home, FolderPlus, FilePlus, Loader2 } from 'lucide-react';
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

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const currentUrlFolderId = searchParams.get('folderId');

  const [project, setProject] = useState<Project | null>(null);
  const [allProjectFolders, setAllProjectFolders] = useState<FolderType[]>([]);
  const [allProjectAssets, setAllProjectAssets] = useState<Asset[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [isNavigatingToHome, setIsNavigatingToHome] = useState(false);

  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderParentContext, setNewFolderParentContext] = useState<FolderType | null>(null);

  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);

  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false); 

  const [imageToPreview, setImageToPreview] = useState<string | null>(null);
  const [isImagePreviewModalOpen, setIsImagePreviewModalOpen] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';

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

      } catch (error) {
        console.error("Error loading project data:", error);
        toast({ title: "Error", description: "Failed to load project data.", variant: "destructive" });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }
  }, [projectId, router, toast, t]);
  
  useEffect(() => {
    loadAllProjectData();
  }, [loadAllProjectData]);

  // DERIVED STATE: Use memoization to derive state from props/URL, avoiding useEffect/useState for this.
  const foldersMap = useMemo(() => {
    const map = new Map<string, FolderType>();
    allProjectFolders.forEach(folder => map.set(folder.id, folder));
    return map;
  }, [allProjectFolders]);
  
  const selectedFolder = useMemo(() => {
    return currentUrlFolderId ? foldersMap.get(currentUrlFolderId) ?? null : null;
  }, [currentUrlFolderId, foldersMap]);
  
  // Validate folder from URL exists, redirect if not
  useEffect(() => {
    if (!isLoading && currentUrlFolderId && allProjectFolders.length > 0) {
      if (!foldersMap.has(currentUrlFolderId)) {
        toast({ title: "Error", description: t('folderNotFoundOrInvalid', "Folder not found or invalid for this project."), variant: "destructive" });
        router.push(`/project/${projectId}`);
      }
    }
  }, [currentUrlFolderId, foldersMap, isLoading, projectId, router, toast, t, allProjectFolders.length]);

  const getFolderPath = useCallback((folderId: string | null, currentProject: Project | null): Array<{ id: string | null; name: string, type: 'project' | 'folder'}> => {
    const path: Array<{ id: string | null; name: string, type: 'project' | 'folder' }> = [];
    if (!currentProject) return path;

    let current: FolderType | undefined | null = folderId ? foldersMap.get(folderId) : null;
    if (current && current.projectId !== currentProject.id) current = null; 

    while (current) {
      path.unshift({ id: current.id, name: current.name, type: 'folder' });
      const parentCand = current.parentId ? foldersMap.get(current.parentId) : null;
      current = (parentCand && parentCand.projectId === currentProject.id) ? parentCand : null;
    }
    path.unshift({ id: null, name: currentProject.name, type: 'project' });
    return path;
  }, [foldersMap]);

  const breadcrumbItems = useMemo(() => {
    if (!project) return []; 
    return getFolderPath(selectedFolder?.id || null, project);
  }, [project, selectedFolder, getFolderPath]);
  
  const foldersToDisplayInGrid = useMemo(() => {
    return allProjectFolders.filter(folder => folder.parentId === (currentUrlFolderId || null));
  }, [allProjectFolders, currentUrlFolderId]);

  const assetsToDisplay = useMemo(() => {
    return allProjectAssets.filter(asset => asset.folderId === (currentUrlFolderId || null));
  }, [allProjectAssets, currentUrlFolderId]);

  // Simplified navigation handler. The component will re-render from URL change.
  const handleSelectFolder = useCallback((folder: FolderType | null) => {
    const targetPath = `/project/${projectId}${folder ? `?folderId=${folder.id}` : ''}`;
    router.push(targetPath, { scroll: false }); 
  }, [projectId, router]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || !project) return;

    setIsCreatingFolder(true);
    try {
      const newFolderData: Omit<FolderType, 'id'> = {
        name: newFolderName,
        projectId: project.id,
        parentId: newFolderParentContext ? newFolderParentContext.id : null,
      };

      const createdFolder = await FirestoreService.addFolder(newFolderData);

      if (createdFolder) {
        await FirestoreService.updateProject(project.id, { status: 'recent' as ProjectStatus });
        
        toast({ title: t('folderCreated', 'Folder Created'), description: t('folderCreatedNavigatedDesc', `Folder "{folderName}" created.`, {folderName: createdFolder.name})});
        
        setNewFolderName('');
        setIsNewFolderDialogOpen(false);
        setNewFolderParentContext(null);
        
        await loadAllProjectData(); // Refresh data after creation
      } else {
        toast({ title: "Error", description: "Failed to create folder.", variant: "destructive" });
      }
    } finally {
      setIsCreatingFolder(false);
    }
  }, [newFolderName, project, newFolderParentContext, toast, t, loadAllProjectData]);

  const openNewFolderDialog = useCallback((parentContextForNewDialog: FolderType | null) => {
    setNewFolderParentContext(parentContextForNewDialog);
    setIsNewFolderDialogOpen(true);
  }, []); 

  const handleOpenEditFolderModal = useCallback((folderToEdit: FolderType) => {
    setEditingFolder(folderToEdit);
    setIsEditFolderModalOpen(true);
  }, []);

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
    const editUrl = `/project/${projectId}/new-asset?assetId=${asset.id}${asset.folderId ? `&folderId=${asset.folderId}` : ''}`;
    router.push(editUrl); 
  }, [projectId, router]);

  const handleDeleteAsset = useCallback(async (assetToDelete: Asset) => {
    if (window.confirm(t('deleteAssetConfirmationDesc', `Are you sure you want to delete asset "${assetToDelete.name}"?`, {assetName: assetToDelete.name}))) {
      const success = await FirestoreService.deleteAsset(assetToDelete.id);
      if (success) {
        toast({ title: t('assetDeletedTitle', 'Asset Deleted'), description: t('assetDeletedDesc', `Asset "${assetToDelete.name}" has been deleted.`, {assetName: assetToDelete.name})});
        await loadAllProjectData();
      } else {
        toast({ title: "Error", description: "Failed to delete asset.", variant: "destructive" });
      }
    }
  }, [t, toast, loadAllProjectData]);

  const handleAssetCreatedInModal = useCallback(async () => {
    await loadAllProjectData();
  }, [loadAllProjectData]);

  const handleOpenImagePreviewModal = useCallback((imageUrl: string) => {
    setImageToPreview(imageUrl);
    setIsImagePreviewModalOpen(true);
  }, []);

  const handleCloseImagePreviewModal = useCallback(() => {
    setIsImagePreviewModalOpen(false);
    setImageToPreview(null);
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

  const isCurrentLocationEmpty = foldersToDisplayInGrid.length === 0 && assetsToDisplay.length === 0;

  return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-2 sm:space-y-4 pb-24 md:pb-8">
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
              {t('allProjects', 'All Projects')}
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline mt-1">{project.name}</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
            <Button 
              variant="default" 
              size="default" 
              onClick={() => openNewFolderDialog(selectedFolder)} 
              title={selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
              className="w-full sm:w-auto"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              {selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
            </Button>
            <Button
              onClick={() => setIsNewAssetModalOpen(true)} 
              className="w-full sm:w-auto"
              size="default"
              title={t('newAsset', 'New Asset')}
            >
              <FilePlus className="mr-2 h-5 w-5" />
              {t('newAsset', 'New Asset')}
            </Button>
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
          <CardContent className={cn("transition-colors rounded-b-lg")}>
          <FolderTreeDisplay
              foldersToDisplay={foldersToDisplayInGrid}
              assetsToDisplay={assetsToDisplay}
              projectId={project.id}
              onSelectFolder={handleSelectFolder}
              onAddSubfolder={openNewFolderDialog}
              onEditFolder={handleOpenEditFolderModal}
              onDeleteFolder={handleFolderDeleted}
              onEditAsset={handleEditAsset} 
              onDeleteAsset={handleDeleteAsset}
              onPreviewImageAsset={handleOpenImagePreviewModal}
              currentSelectedFolderId={selectedFolder ? selectedFolder.id : null}
              displayMode="grid"
          />
          {isCurrentLocationEmpty && (
              <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {selectedFolder ? t('folderIsEmpty', 'This folder is empty. Add a subfolder or asset.') : t('noFoldersInProjectStart', 'This project has no folders yet. Use the button below to add a new folder to get started.')}
                  </p>
                  {isMobile && !selectedFolder && (
                      <p className="text-sm text-muted-foreground">{t('useFabToAddFolderMobile', 'Use the "Add New Folder" button below to get started.')}</p>
                  )}
                  {isMobile && selectedFolder && (
                      <p className="text-sm text-muted-foreground">{t('useFabToCreateContentMobile', 'Use the buttons below to add a folder or asset.')}</p>
                  )}
                  {!isMobile && !selectedFolder && (
                      <Button variant="outline" onClick={() => openNewFolderDialog(selectedFolder)}>
                          <FolderPlus className="mr-2 h-4 w-4" />
                          {t('createNewFolderInRootButton', 'Create First Folder in Project Root')}
                      </Button>
                  )}
              </div>
          )}
          </CardContent>
        </Card>

        {isMobile && (
          <div className="fixed bottom-4 left-0 right-0 p-2 bg-background/90 backdrop-blur-sm border-t z-40 flex justify-around items-center space-x-2">
            <Button
              onClick={() => openNewFolderDialog(selectedFolder)}
              className="flex-1"
              size="default"
            >
              <FolderPlus className="mr-2 h-5 w-5" />
              {selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
            </Button>
            <Button
              onClick={() => setIsNewAssetModalOpen(true)} 
              className="flex-1"
              size="default"
              title={t('newAsset', 'New Asset')}
            >
              <FilePlus className="mr-2 h-5 w-5" />
              {t('newAsset', 'New Asset')}
            </Button>
          </div>
        )}

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

        {imageToPreview && (
          <ImagePreviewModal
            isOpen={isImagePreviewModalOpen}
            onClose={handleCloseImagePreviewModal}
            imageUrl={imageToPreview}
          />
        )}
      </div>
  );
}
