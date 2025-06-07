
"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderTreeDisplay } from '@/components/folder-tree';
import type { Project, Folder as FolderType, ProjectStatus, Asset } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { Home, FolderPlus, FilePlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { EditFolderModal } from '@/components/modals/edit-folder-modal';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const currentUrlFolderId = searchParams.get('folderId');

  const [project, setProject] = useState<Project | null>(null);
  const [allProjectFolders, setAllProjectFolders] = useState<FolderType[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [currentAssets, setCurrentAssets] = useState<Asset[]>([]);

  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderParentContext, setNewFolderParentContext] = useState<FolderType | null>(null);

  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const foldersMap = useMemo(() => {
    const map = new Map<string, FolderType>();
    allProjectFolders.forEach(folder => map.set(folder.id, folder));
    return map;
  }, [allProjectFolders]);

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


  const loadProjectData = useCallback(() => {
    if (projectId) {
      const foundProject = LocalStorageService.getProjects().find(p => p.id === projectId);
      setProject(foundProject || null);

      if (foundProject) {
        const allFoldersFromStorage = LocalStorageService.getFolders();
        const projectFolders = allFoldersFromStorage.filter(f => f.projectId === projectId);
        setAllProjectFolders(projectFolders);

        const allAssetsFromStorage = LocalStorageService.getAssets();
        const assetsForThisProject = allAssetsFromStorage.filter(a => a.projectId === projectId);

        if (currentUrlFolderId) {
          const folderFromUrl = projectFolders.find(f => f.id === currentUrlFolderId); 
          setSelectedFolder(folderFromUrl || null);
          setCurrentAssets(assetsForThisProject.filter(a => a.folderId === currentUrlFolderId));
        } else {
          setSelectedFolder(null);
          setCurrentAssets(assetsForThisProject.filter(a => !a.folderId)); 
        }

      } else {
        toast({ title: t('projectNotFound', "Project not found"), variant: "destructive" });
        router.push('/');
      }
    }
  }, [projectId, router, toast, t, currentUrlFolderId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);


  const breadcrumbItems = useMemo(() => {
    if (!project) return [];
    return getFolderPath(selectedFolder?.id || null, project);
  }, [project, selectedFolder, getFolderPath]);
  
  const foldersToDisplayInGrid = useMemo(() => {
    return allProjectFolders.filter(folder => {
      if (selectedFolder) {
        return folder.parentId === selectedFolder.id;
      }
      return folder.parentId === null; 
    });
  }, [allProjectFolders, selectedFolder]);


  if (!project) {
    return <div className="container mx-auto p-4 text-center">{t('loadingProjectContext', 'Loading project context...')}</div>;
  }

  const handleSelectFolder = (folder: FolderType | null) => {
    const targetPath = `/project/${projectId}${folder ? `?folderId=${folder.id}` : ''}`;
    router.push(targetPath, { scroll: false }); 
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !project) return;

    const newFolder: FolderType = {
      id: `folder_${Date.now()}`,
      name: newFolderName,
      projectId: project.id,
      parentId: newFolderParentContext ? newFolderParentContext.id : null,
    };

    LocalStorageService.addFolder(newFolder);

    const updatedProjectData = {
      ...project,
      lastAccessed: new Date().toISOString(),
      status: 'recent' as ProjectStatus,
    };
    LocalStorageService.updateProject(updatedProjectData);

    setNewFolderName('');
    setIsNewFolderDialogOpen(false);
    setNewFolderParentContext(null);
    toast({ title: t('folderCreated', 'Folder Created'), description: t('folderCreatedNavigatedDesc', `Folder "{folderName}" created and selected.`, {folderName: newFolder.name})});
    
    loadProjectData(); 
    handleSelectFolder(newFolder); 
  };


  const openNewFolderDialog = (parentContextForNewDialog: FolderType | null) => {
    setNewFolderParentContext(parentContextForNewDialog);
    setIsNewFolderDialogOpen(true);
  };

  const handleOpenEditFolderModal = (folderToEdit: FolderType) => {
    setEditingFolder(folderToEdit);
    setIsEditFolderModalOpen(true);
  };

  const handleFolderDeleted = (deletedFolder: FolderType) => {
    loadProjectData(); 
    if (selectedFolder && selectedFolder.id === deletedFolder.id) {
        const parentFolder = deletedFolder.parentId ? foldersMap.get(deletedFolder.parentId) : null;
        handleSelectFolder(parentFolder); 
    }
  };

  const handleFolderUpdated = (updatedFolder: FolderType) => {
    loadProjectData(); 
    if (selectedFolder && selectedFolder.id === updatedFolder.id) {
      const reloadedFolder = LocalStorageService.getFolders().find(f => f.id === updatedFolder.id); 
      setSelectedFolder(reloadedFolder || null); 
    }
    if (project) {
      const updatedProjectData = {
        ...project,
        lastAccessed: new Date().toISOString(),
        status: 'recent' as ProjectStatus,
      };
      LocalStorageService.updateProject(updatedProjectData);
      setProject(updatedProjectData);
    }
  };

  const handleEditAsset = (asset: Asset) => {
    const editUrl = `/project/${projectId}/new-asset?assetId=${asset.id}${asset.folderId ? `&folderId=${asset.folderId}` : ''}`;
    router.push(editUrl); 
  };

  const handleDeleteAsset = (assetToDelete: Asset) => {
    if (window.confirm(t('deleteAssetConfirmationDesc', `Are you sure you want to delete asset "${assetToDelete.name}"?`, {assetName: assetToDelete.name}))) {
      LocalStorageService.deleteAsset(assetToDelete.id);
      toast({ title: t('assetDeletedTitle', 'Asset Deleted'), description: t('assetDeletedDesc', `Asset "${assetToDelete.name}" has been deleted.`, {assetName: assetToDelete.name})});
      loadProjectData(); 
    }
  };

  const newAssetHref = `/project/${project.id}/new-asset${selectedFolder ? `?folderId=${selectedFolder.id}` : ''}`;

  const isCurrentLocationEmpty = foldersToDisplayInGrid.length === 0 && currentAssets.length === 0;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary hover:underline flex items-center">
            <Home className="mr-1 h-4 w-4" /> {t('allProjects', 'All Projects')}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline mt-1">{project.name}</h1>
          {/* Project description display removed 
          {project.description && (
            <p className="text-muted-foreground text-sm sm:text-base line-clamp-2 sm:line-clamp-none">{project.description}</p>
          )}
          */}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
            {!isMobile && (
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
            )}
            {!isMobile && (
              <Link href={newAssetHref} passHref legacyBehavior>
                  <Button
                    className="w-full sm:w-auto"
                    size="default"
                    title={t('newAsset', 'New Asset')}
                  >
                    <FilePlus className="mr-2 h-5 w-5" />
                    {t('newAsset', 'New Asset')}
                  </Button>
                </Link>
            )}
        </div>
      </div>

      <Card>
        <CardHeader>
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
        <CardContent>
        <FolderTreeDisplay
            foldersToDisplay={foldersToDisplayInGrid}
            assetsToDisplay={currentAssets}
            projectId={project.id}
            onSelectFolder={handleSelectFolder}
            onAddSubfolder={openNewFolderDialog}
            onEditFolder={handleOpenEditFolderModal}
            onDeleteFolder={handleFolderDeleted}
            onEditAsset={handleEditAsset}
            onDeleteAsset={handleDeleteAsset}
            currentSelectedFolderId={selectedFolder ? selectedFolder.id : null}
        />
        {isCurrentLocationEmpty && (
            <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {selectedFolder ? t('folderIsEmpty', 'This folder is empty. Add a subfolder or asset.') : t('projectRootIsEmpty', 'This project is empty. Add a folder or asset to get started.')}
                </p>
                {isMobile && (
                     <p className="text-sm text-muted-foreground">{t('useFabToCreateContentMobile', 'Use the buttons below to add a folder or asset.')}</p>
                )}
                {!isMobile && (
                    <Button variant="outline" onClick={() => openNewFolderDialog(selectedFolder)}>
                        <FolderPlus className="mr-2 h-4 w-4" />
                        {selectedFolder ? t('addSubfolderToCurrent', 'Add subfolder here') : t('createNewFolderInRootButton', 'Create First Folder in Project Root')}
                    </Button>
                )}
            </div>
        )}
        </CardContent>
      </Card>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 p-2 bg-background/90 backdrop-blur-sm border-t z-40 flex justify-around items-center space-x-2">
          <Button
            onClick={() => openNewFolderDialog(selectedFolder)}
            className="flex-1"
            size="default"
          >
            <FolderPlus className="mr-2 h-5 w-5" />
            {selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
          </Button>
          <Link href={newAssetHref} passHref legacyBehavior>
            <Button
              className="flex-1"
              size="default"
              title={t('newAsset', 'New Asset')}
            >
              <FilePlus className="mr-2 h-5 w-5" />
              {t('newAsset', 'New Asset')}
            </Button>
          </Link>
        </div>
      )}

      <Dialog open={isNewFolderDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setNewFolderName('');
          setNewFolderParentContext(null);
        }
        setIsNewFolderDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
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
            />
          </div>
          <DialogFooter className="flex flex-row justify-end space-x-2">
            <Button variant="outline" onClick={() => { setIsNewFolderDialogOpen(false); setNewFolderName(''); setNewFolderParentContext(null); }}>{t('cancel', 'Cancel')}</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>{t('confirm', 'Confirm')}</Button>
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
    </div>
  );
}
