
"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderTree } from '@/components/folder-tree';
import type { Project, Folder as FolderType, Asset as AssetType, ProjectStatus } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { Home, FolderPlus, FilePlus, Trash2, Edit, Image as ImageIcon } from 'lucide-react';
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
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  
  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const loadProjectData = useCallback(() => {
    if (projectId) {
      const foundProject = LocalStorageService.getProjects().find(p => p.id === projectId);
      setProject(foundProject || null);
      if (foundProject) {
        const allFolders = LocalStorageService.getFolders();
        setFolders(allFolders.filter(f => f.projectId === projectId));
        
        const allAssets = LocalStorageService.getAssets();
        setAssets(allAssets.filter(a => a.projectId === projectId));

        if (currentUrlFolderId) {
          const folderFromUrl = allFolders.find(f => f.id === currentUrlFolderId && f.projectId === projectId);
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

  const getFolderPath = useCallback((folderId: string | null, currentProject: Project, allFolders: FolderType[]): Array<{ id: string | null; name: string, type: 'project' | 'folder'}> => {
    const path: Array<{ id: string | null; name: string, type: 'project' | 'folder' }> = [];
    let current: FolderType | undefined | null = folderId ? allFolders.find(f => f.id === folderId && f.projectId === currentProject.id) : null;
  
    while (current) {
      path.unshift({ id: current.id, name: current.name, type: 'folder' });
      current = current.parentId ? allFolders.find(f => f.id === current.parentId && f.projectId === currentProject.id) : null;
    }
    path.unshift({ id: null, name: currentProject.name, type: 'project' }); 
    return path;
  }, []); // This useCallback is now before the early return

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
      parentId: selectedFolder ? selectedFolder.id : null, 
    };

    LocalStorageService.addFolder(newFolder);
    setFolders(LocalStorageService.getFolders().filter(f => f.projectId === projectId)); 
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
    toast({ title: t('folderCreated', 'Folder Created'), description: t('folderCreatedNavigatedDesc', `Folder "{folderName}" created and selected.`, {folderName: newFolder.name})});
  };
  
  const openNewFolderDialog = (parentFolderContext: FolderType | null) => {
    setSelectedFolder(parentFolderContext); // Set context before opening dialog
    setIsNewFolderDialogOpen(true); 
  };

  const handleOpenEditFolderModal = (folderToEdit: FolderType) => {
    setEditingFolder(folderToEdit);
    setIsEditFolderModalOpen(true);
  };

  const handleFolderUpdated = (updatedFolder: FolderType) => {
    setFolders(LocalStorageService.getFolders().filter(f => f.projectId === projectId)); 
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
  
  const displayedAssets = assets.filter(asset => 
    selectedFolder ? asset.folderId === selectedFolder.id : false // Only show assets if a folder is selected
  );

  const canCreateAsset = !!selectedFolder;
  const newAssetHref = canCreateAsset ? `/project/${project.id}/new-asset?folderId=${selectedFolder!.id}` : '#';
  const breadcrumbItems = selectedFolder ? getFolderPath(selectedFolder.id, project, folders) : [{ id: null, name: project.name, type: 'project' as 'project' | 'folder' }];


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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-end">
            {!isMobile && (
              <Button variant="default" size="lg" onClick={() => openNewFolderDialog(selectedFolder)}> 
                <FolderPlus className="mr-2 h-4 w-4" /> {selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addNewFolderToRoot', 'Add New Folder to Root')}
              </Button>
            )}
            {isMobile && <div className="h-10"></div>} {/* Placeholder for mobile to maintain layout consistency if header content varies */}
          </CardHeader>
          <CardContent>
            <FolderTree 
              folders={folders} 
              projectId={project.id} 
              onSelectFolder={handleSelectFolder}
              onAddSubfolder={(parentFolder) => {
                openNewFolderDialog(parentFolder);
              }}
              onEditFolder={handleOpenEditFolderModal}
              selectedFolderId={selectedFolder?.id || null}
            />
             {folders.filter(f => f.projectId === projectId).length === 0 && (
                <p className="text-xs text-muted-foreground p-2 text-center pt-4">{t('noFoldersInProject', 'No folders in this project yet. Click "Add New Folder" to create one.')}</p>
             )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex flex-wrap items-center">
              {t('assetsInPath', 'Assets in: ')}
              {breadcrumbItems.map((item, index) => (
                <React.Fragment key={item.id || `project_root_${project.id}`}>
                  <span
                    className={`cursor-pointer hover:underline ${index === breadcrumbItems.length - 1 ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => {
                      if (item.type === 'project') {
                        handleSelectFolder(null);
                      } else if (item.id) {
                        const folderToSelect = folders.find(f => f.id === item.id);
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
            {!selectedFolder && <CardDescription>{t('selectFolderToViewAssetsDesc', 'Select a folder from the tree to view its assets or add new ones.')}</CardDescription>}
          </CardHeader>
          <CardContent>
            {selectedFolder ? (
                displayedAssets.length > 0 ? (
                <ul className="space-y-3">
                    {displayedAssets.map(asset => (
                    <li key={asset.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                        <div className="flex items-center min-w-0">
                        {asset.photos && asset.photos.length > 0 ? (
                            <img src={asset.photos[0]} alt={asset.name} data-ai-hint="asset thumbnail" className="h-10 w-10 rounded-md object-cover mr-3 shrink-0" />
                        ) : (
                            <ImageIcon className="h-10 w-10 rounded-md text-muted-foreground bg-muted p-2 mr-3 shrink-0" />
                        )}
                        <div className="flex-1 truncate"> 
                            <p className="font-medium truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{asset.summary || asset.description}</p>
                        </div>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                        <Link href={`/project/${project.id}/new-asset?assetId=${asset.id}${asset.folderId ? `&folderId=${asset.folderId}` : ''}`} passHref legacyBehavior>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={t('editAssetTitle', 'Edit Asset')}>
                            <Edit className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title={t('deleteAssetTitle', 'Delete Asset')}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                    </li>
                    ))}
                </ul>
                ) : (
                <p className="text-muted-foreground text-center py-8">{t('noAssetsInLocation', 'No assets found in this location.')}</p>
                )
            ) : (
                <p className="text-muted-foreground text-center py-8">{t('noFolderSelectedPrompt', 'Select a folder to view assets or create a new folder.')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/90 backdrop-blur-sm border-t z-40 flex justify-around items-center space-x-2">
          <Button
            onClick={() => openNewFolderDialog(selectedFolder)} 
            className="flex-1"
            size="lg"
          >
            <FolderPlus className="mr-2 h-5 w-5" />
            {selectedFolder ? t('addNewSubfolder', 'Add New Subfolder') : t('addNewFolderToRoot', 'Add New Folder to Root')}
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
        }
        setIsNewFolderDialogOpen(isOpen);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
                {selectedFolder ? t('addNewSubfolderTo', 'Add New Subfolder to "{parentName}"', { parentName: selectedFolder.name }) : t('addNewFolderToRoot', 'Add New Folder to Root')}
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
            <Button variant="outline" onClick={() => { setIsNewFolderDialogOpen(false); setNewFolderName(''); }}>{t('cancel', 'Cancel')}</Button>
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

