
"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderGrid } from '@/components/folder-tree'; // Updated import
import type { Project, Folder as FolderType, Asset as AssetType, ProjectStatus } from '@/data/mock-data';
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
  
  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [newFolderParentContext, setNewFolderParentContext] = useState<FolderType | null>(null);

  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const getFolderPath = useCallback((folderId: string | null, currentProject: Project | null, allFolders: FolderType[]): Array<{ id: string | null; name: string, type: 'project' | 'folder'}> => {
    const path: Array<{ id: string | null; name: string, type: 'project' | 'folder' }> = [];
    if (!currentProject) return path;

    let current: FolderType | undefined | null = folderId ? allFolders.find(f => f.id === folderId && f.projectId === currentProject.id) : null;
  
    while (current) {
      path.unshift({ id: current.id, name: current.name, type: 'folder' });
      current = current.parentId ? allFolders.find(f => f.id === current.parentId && f.projectId === currentProject.id) : null;
    }
    path.unshift({ id: null, name: currentProject.name, type: 'project' }); 
    return path;
  }, []);

  const loadProjectData = useCallback(() => {
    if (projectId) {
      const foundProject = LocalStorageService.getProjects().find(p => p.id === projectId);
      setProject(foundProject || null);
      if (foundProject) {
        const allFoldersFromStorage = LocalStorageService.getFolders();
        setAllProjectFolders(allFoldersFromStorage.filter(f => f.projectId === projectId));
        
        if (currentUrlFolderId) {
          const folderFromUrl = allFoldersFromStorage.find(f => f.id === currentUrlFolderId && f.projectId === projectId);
          setSelectedFolder(folderFromUrl || null);
        } else {
          setSelectedFolder(null); 
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

  useEffect(() => {
    if (project) {
      const currentPath = `/project/${project.id}${selectedFolder ? `?folderId=${selectedFolder.id}` : ''}`;
      if (typeof window !== 'undefined' && window.location.pathname + window.location.search !== currentPath) {
         router.replace(currentPath, { scroll: false });
      }
    }
  }, [selectedFolder, project, router]);


  if (!project) {
    return <div className="container mx-auto p-4 text-center">{t('loadingProjectContext', 'Loading project context...')}</div>;
  }

  const handleSelectFolder = (folder: FolderType | null) => {
    setSelectedFolder(folder);
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
    setAllProjectFolders(LocalStorageService.getFolders().filter(f => f.projectId === projectId)); 
    setSelectedFolder(newFolder); 
    
    const updatedProjectData = {
      ...project,
      lastAccessed: new Date().toISOString(),
      status: 'recent' as ProjectStatus,
    };
    LocalStorageService.updateProject(updatedProjectData);
    setProject(updatedProjectData); 
    
    setNewFolderName('');
    setIsNewFolderDialogOpen(false);
    setNewFolderParentContext(null); 
    toast({ title: t('folderCreated', 'Folder Created'), description: t('folderCreatedNavigatedDesc', `Folder "{folderName}" created and selected.`, {folderName: newFolder.name})});
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
    setAllProjectFolders(currentFolders => currentFolders.filter(f => f.id !== deletedFolder.id));
    if (selectedFolder && selectedFolder.id === deletedFolder.id) {
      const parentFolder = deletedFolder.parentId ? allProjectFolders.find(f => f.id === deletedFolder.parentId) : null;
      setSelectedFolder(parentFolder || null);
    }
  };

  const handleFolderUpdated = (updatedFolder: FolderType) => {
    setAllProjectFolders(LocalStorageService.getFolders().filter(f => f.projectId === projectId)); 
    if (selectedFolder && selectedFolder.id === updatedFolder.id) {
      setSelectedFolder(updatedFolder); 
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
  
  const canCreateAsset = !!selectedFolder; 
  const newAssetHref = canCreateAsset ? `/project/${project.id}/new-asset?folderId=${selectedFolder!.id}` : '#';
  
  const breadcrumbItems = project ? getFolderPath(selectedFolder?.id || null, project, allProjectFolders) : [];

  const foldersToDisplay = allProjectFolders.filter(f => {
    if (selectedFolder) {
      return f.parentId === selectedFolder.id;
    } else {
      return f.parentId === null; // Root folders
    }
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary hover:underline flex items-center">
            <Home className="mr-1 h-4 w-4" /> {t('allProjects', 'All Projects')}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline mt-1">{project.name}</h1>
          <p className="text-muted-foreground text-sm sm:text-base line-clamp-2 sm:line-clamp-none">{project.description}</p>
        </div>
        {!isMobile && (
          <Link href={newAssetHref} passHref legacyBehavior>
            <Button
              className="w-full sm:w-auto"
              disabled={!canCreateAsset}
              onClick={(e) => {
                if (!canCreateAsset) {
                  e.preventDefault();
                  toast({ title: t('noFolderSelectedForAssetTitle', "No Folder Selected"), description: t('noFolderSelectedForAssetDesc', "Please create or select a folder before adding an asset.") });
                }
              }}
              title={!canCreateAsset ? t('selectFolderForAssetTooltip', "Select a folder to add an asset") : t('newAsset', 'New Asset')}
            >
              <FilePlus className="mr-2 h-5 w-5" />
              {t('newAsset', 'New Asset')}
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <CardTitle className="text-base sm:text-lg flex flex-wrap items-center">
                {breadcrumbItems.map((item, index) => (
                    <React.Fragment key={item.id || `project_root_${project.id}`}>
                    <span
                        className={`cursor-pointer hover:underline ${index === breadcrumbItems.length - 1 ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => {
                        if (item.type === 'project') {
                            handleSelectFolder(null);
                        } else if (item.id) {
                            const folderToSelect = allProjectFolders.find(f => f.id === item.id);
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
                {!isMobile && (
                    <Button variant="default" size="lg" onClick={() => openNewFolderDialog(selectedFolder)} title={selectedFolder ? t('addSubfolderTitle', 'Add subfolder to {folderName}', {folderName: selectedFolder.name}) : t('addRootFolderTitle', 'Add folder to project root')}>
                        <FolderPlus className="mr-2 h-4 w-4" /> {selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
                    </Button>
                )}
            </div>
            {selectedFolder ? 
                <CardDescription>{t('contentsOfFolder', 'Contents of "{folderName}"', {folderName: selectedFolder.name})}</CardDescription> 
                : 
                <CardDescription>{t('projectRootContents', 'Project Root - Folders')}</CardDescription>
            }
        </CardHeader>
        <CardContent>
        <FolderGrid
            foldersToDisplay={foldersToDisplay}
            onSelectFolder={handleSelectFolder}
            onAddSubfolder={(parentFolder) => openNewFolderDialog(parentFolder)}
            onEditFolder={handleOpenEditFolderModal}
            onDeleteFolder={handleFolderDeleted}
            projectId={project.id}
        />
        {allProjectFolders.length === 0 && ( 
            <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">{t('noFoldersInProjectStart', 'This project has no folders yet.')}</p>
                {isMobile ? (
                     <p className="text-sm text-muted-foreground">{t('useFabToAddFolderMobile', 'Use the "Add New Folder" button below to get started.')}</p>
                ) : (
                    <Button variant="outline" onClick={() => openNewFolderDialog(null)}>
                        <FolderPlus className="mr-2 h-4 w-4" /> {t('createNewFolderInRootButton', 'Create First Folder in Project Root')}
                    </Button>
                )}
            </div>
        )}
        </CardContent>
      </Card>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/90 backdrop-blur-sm border-t z-40 flex justify-around items-center space-x-2">
          <Button
            onClick={() => openNewFolderDialog(selectedFolder)} 
            className="flex-1"
            size="lg"
          >
            <FolderPlus className="mr-2 h-5 w-5" />
            {selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addNewFolderToRoot', 'Add Folder to Root')}
          </Button>
          <Link href={newAssetHref} passHref legacyBehavior>
            <Button
              className="flex-1"
              size="lg"
              disabled={!canCreateAsset}
              onClick={(e) => {
                if (!canCreateAsset) {
                  e.preventDefault();
                  toast({ title: t('noFolderSelectedForAssetTitle', "No Folder Selected"), description: t('noFolderSelectedForAssetDesc', "Please create or select a folder before adding an asset.") });
                }
              }}
              title={!canCreateAsset ? t('selectFolderForAssetTooltip', "Select a folder to add an asset") : t('newAsset', 'New Asset')}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
                {newFolderParentContext ? t('addNewSubfolderTo', 'Add New Subfolder to "{parentName}"', { parentName: newFolderParentContext.name }) : t('addNewFolderToRoot', 'Add New Folder to Root')}
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="new-folder-name">{t('folderName', 'Folder Name')}</Label>
            <Input 
              id="new-folder-name" 
              value={newFolderName} 
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t('folderNamePlaceholder', "e.g., Inspection Area 1")}
            />
          </div>
          <DialogFooter>
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

