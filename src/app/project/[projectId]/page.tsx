
"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderTreeDisplay } from '@/components/folder-tree';
import type { Project, Folder as FolderType, ProjectStatus, Asset } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { Home, Loader2, CloudOff, FolderPlus, Upload, FilePlus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import * as XLSX from 'xlsx';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const currentUrlFolderId = searchParams.get('folderId') || null;
  const isOnline = useOnlineStatus();

  const [project, setProject] = useState<Project | null>(null);
  const [allProjectFolders, setAllProjectFolders] = useState<FolderType[]>([]);
  
  // State for all assets, used for counts. Fetched in background.
  const [allAssetsForCount, setAllAssetsForCount] = useState<Asset[]>([]);
  // State for assets in the current folder/view. Fetched on demand.
  const [currentViewAssets, setCurrentViewAssets] = useState<Asset[]>([]);

  const [offlineFolders, setOfflineFolders] = useState<FolderType[]>([]);
  const [offlineAssets, setOfflineAssets] = useState<Asset[]>([]);

  const [isLoading, setIsLoading] = useState(true); // For initial page structure
  const [isContentLoading, setIsContentLoading] = useState(false); // For folder/asset content
  
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
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';
  const isMobile = useIsMobile();

  const loadInitialStructure = useCallback(async () => {
    if (projectId) {
      setIsLoading(true);
      try {
        const [foundProject, projectFolders] = await Promise.all([
          FirestoreService.getProjectById(projectId),
          FirestoreService.getFolders(projectId),
        ]);

        if (!foundProject) {
          toast({ title: t('projectNotFound', "Project not found"), variant: "destructive" });
          router.push('/');
          return;
        }
        
        setProject(foundProject);
        setAllProjectFolders(projectFolders);
        
        const queuedActions = OfflineService.getOfflineQueue();
        setOfflineFolders(queuedActions.filter(a => a.type === 'add-folder' && a.projectId === projectId).map(a => ({ ...a.payload, id: a.localId, isOffline: true } as FolderType)));
        setOfflineAssets(queuedActions.filter(a => a.type === 'add-asset' && a.projectId === projectId).map(a => ({ ...a.payload, id: a.localId, createdAt: Date.now(), isOffline: true } as Asset)));

        FirestoreService.getAllAssetsForProject(projectId).then(setAllAssetsForCount);

      } catch (error) {
        console.error("Error loading project structure:", error);
        toast({ title: "Error", description: "Failed to load project data.", variant: "destructive" });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }
  }, [projectId, router, t, toast]);

  const loadCurrentViewAssets = useCallback(async () => {
    if (!projectId || isLoading) return;

    setIsContentLoading(true);
    try {
        const assets = await FirestoreService.getAssets(projectId, currentUrlFolderId);
        setCurrentViewAssets(assets);
    } catch(error) {
        console.error("Error loading view assets:", error);
        toast({ title: "Error", description: "Failed to load folder contents.", variant: "destructive" });
        setCurrentViewAssets([]);
    } finally {
        setIsContentLoading(false);
    }
  }, [projectId, currentUrlFolderId, isLoading, toast]);

  useEffect(() => {
    loadInitialStructure();
  }, [loadInitialStructure]);
  
  useEffect(() => {
    loadCurrentViewAssets();
  }, [loadCurrentViewAssets]);
  
  const reloadAllData = useCallback(async () => {
    await loadInitialStructure();
    await loadCurrentViewAssets();
  }, [loadInitialStructure, loadCurrentViewAssets]);

  useEffect(() => {
    if (isOnline) {
      OfflineService.syncOfflineActions().then(({ syncedCount }) => {
        if (syncedCount > 0) {
          toast({
            title: "Data Synced",
            description: `${syncedCount} offline item(s) have been successfully synced.`,
            variant: "success-yellow"
          });
          reloadAllData();
        }
      });
    }
  }, [isOnline, reloadAllData, toast]);

  const combinedFolders = useMemo(() => [...allProjectFolders, ...offlineFolders], [allProjectFolders, offlineFolders]);
  const foldersMap = useMemo(() => new Map(combinedFolders.map(f => [f.id, f])), [combinedFolders]);
  const selectedFolder = useMemo(() => currentUrlFolderId ? foldersMap.get(currentUrlFolderId) ?? null : null, [currentUrlFolderId, foldersMap]);
  
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

  const combinedCurrentViewAssets = useMemo(() => {
    const offlineForView = offlineAssets.filter(asset => asset.folderId === currentUrlFolderId);
    return [...currentViewAssets, ...offlineForView];
  }, [currentViewAssets, offlineAssets, currentUrlFolderId]);

  const filteredAssetsToDisplay = useMemo(() => {
    if (!searchTerm) {
      return combinedCurrentViewAssets;
    }
    const lowercasedSearch = searchTerm.toLowerCase();
    return combinedCurrentViewAssets.filter(asset => 
      asset.name.toLowerCase().includes(lowercasedSearch) ||
      (asset.serialNumber && asset.serialNumber.toLowerCase().includes(lowercasedSearch))
    );
  }, [combinedCurrentViewAssets, searchTerm]);
  
  const foldersToDisplay = useMemo(() => {
    return combinedFolders.filter(folder => folder.parentId === (currentUrlFolderId || null));
  }, [combinedFolders, currentUrlFolderId]);

  useEffect(() => {
    if (!isLoading && currentUrlFolderId && combinedFolders.length > 0 && !foldersMap.has(currentUrlFolderId)) {
        toast({ title: "Error", description: t('folderNotFoundOrInvalid', "Folder not found or invalid for this project."), variant: "destructive" });
        router.push(`/project/${projectId}`);
    }
  }, [currentUrlFolderId, foldersMap, isLoading, projectId, router, t, toast, combinedFolders.length]);

  const handleSelectFolder = useCallback((folder: FolderType | null) => {
    setSearchTerm('');
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
          await reloadAllData();
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
  }, [newFolderName, project, newFolderParentContext, reloadAllData, t, toast, isOnline]);

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
    await reloadAllData(); 
  }, [reloadAllData]);

  const handleFolderUpdated = useCallback(async () => {
    await reloadAllData(); 
    if (project) {
      await FirestoreService.updateProject(project.id, { status: 'recent' as ProjectStatus });
      const updatedProj = await FirestoreService.getProjectById(project.id);
      setProject(updatedProj);
    }
  }, [reloadAllData, project]);

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
      setDeletingAssetId(assetToDelete.id);
      try {
        const success = await FirestoreService.deleteAsset(assetToDelete.id);
        if (success) {
          toast({ title: t('assetDeletedTitle', 'Asset Deleted'), description: t('assetDeletedDesc', `Asset "${assetToDelete.name}" has been deleted.`, {assetName: assetToDelete.name})});
          await reloadAllData();
        } else {
          toast({ title: "Error", description: "Failed to delete asset.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error deleting asset:", error);
        toast({ title: "Error", description: "Failed to delete asset.", variant: "destructive" });
      } finally {
        setDeletingAssetId(null);
      }
    }
  }, [reloadAllData, t, toast]);

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

    setCurrentViewAssets(prev => [...prev, optimisticAsset]);

    toast({
      title: t('saving', 'Saving...'),
      description: `Asset "${assetData.name}" is being uploaded.`,
    });

    try {
      const newAssetFromDb = await FirestoreService.addAsset(assetData);
      if (newAssetFromDb) {
        toast({
          title: t('assetSavedTitle', "Asset Saved"),
          description: t('assetSavedDesc', `Asset "${newAssetFromDb.name}" has been saved.`, { assetName: newAssetFromDb.name }),
          variant: "success-yellow"
        });
        await reloadAllData();
      } else {
        toast({ title: "Error", description: `Failed to save asset "${assetData.name}".`, variant: "destructive" });
        setCurrentViewAssets(prev => prev.filter(asset => asset.id !== tempId));
      }
    } catch (error) {
      console.error("Error saving asset in background:", error);
      toast({ title: "Error", description: `An error occurred while saving "${assetData.name}".`, variant: "destructive" });
      setCurrentViewAssets(prev => prev.filter(asset => asset.id !== tempId));
    }
  }, [isOnline, projectId, toast, t, reloadAllData]);


  const handleOpenImagePreviewModal = useCallback((asset: Asset) => {
    if(asset.isUploading) return;
    setAssetToPreview(asset);
    setIsImagePreviewModalOpen(true);
  }, []);

  const handleCloseImagePreviewModal = useCallback(() => {
    setIsImagePreviewModalOpen(false);
    setAssetToPreview(null);
  }, []);
  
  const handleFileImport = async () => {
    if (!fileToImport || !project || !currentUser) return;
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                toast({ title: t('importErrorTitle', "Import Error"), description: t('importErrorEmptyFile', "The Excel file is empty or could not be read."), variant: "destructive" });
                return;
            }

            const headers = Object.keys(jsonData[0]);
            const findHeader = (possibleNames: string[]) => {
                for (const name of possibleNames) {
                    const foundHeader = headers.find(h => h.toLowerCase().trim() === name);
                    if (foundHeader) return foundHeader;
                }
                return null;
            };

            const nameHeader = findHeader(['name', 'asset name']);
            const quantityHeader = findHeader(['quantity', 'qty']);
            const serialHeader = findHeader(['serial number', 'serial']);
            const descHeader = findHeader(['description', 'desc']);

            const knownHeaderStrings = [nameHeader, quantityHeader, serialHeader, descHeader].filter(Boolean) as string[];
            const miscellaneousHeaders = headers.filter(h => !knownHeaderStrings.includes(h));

            if (!nameHeader) {
                toast({ title: t('importErrorTitle', "Import Error"), description: t('importErrorMissingNameColumn', "The Excel file must contain a 'Name' column."), variant: "destructive" });
                return;
            }

            const assetsToCreate: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>[] = [];
            for (const row of jsonData) {
                const baseName = row[nameHeader];
                if (!baseName || typeof baseName !== 'string') continue;

                const quantity = Number(row[quantityHeader as string] || 1);
                const serial = row[serialHeader as string] ? String(row[serialHeader as string]) : undefined;
                const description = row[descHeader as string] ? String(row[descHeader as string]) : undefined;

                const miscellaneousData: Record<string, any> = {};
                miscellaneousHeaders.forEach(header => {
                    if (row[header] !== undefined && row[header] !== null && row[header] !== '') {
                        miscellaneousData[header] = row[header];
                    }
                });

                for (let i = 1; i <= quantity; i++) {
                    assetsToCreate.push({
                        name: quantity > 1 ? `${baseName} ${i}` : baseName,
                        projectId: project.id,
                        folderId: selectedFolder?.id || null,
                        serialNumber: serial,
                        textDescription: description,
                        photos: [],
                        videos: [],
                        userId: currentUser.id,
                        miscellaneous: Object.keys(miscellaneousData).length > 0 ? miscellaneousData : undefined,
                    });
                }
            }
            
            let createdCount = 0;
            for (const assetPayload of assetsToCreate) {
                const newAsset = await FirestoreService.addAsset(assetPayload);
                if (newAsset) createdCount++;
            }

            toast({ title: t('importSuccessTitle', "Import Successful"), description: t('importSuccessDesc', "{count} assets have been created.", { count: createdCount }) });
            await reloadAllData();
        } catch (error) {
            console.error("Error importing file:", error);
            toast({ title: t('importErrorTitle', "Import Error"), description: t('importErrorGeneric', "An error occurred while processing the file."), variant: "destructive" });
        } finally {
            setIsImporting(false);
            setFileToImport(null);
            setIsImportModalOpen(false);
        }
    };
    reader.readAsBinaryString(fileToImport);
  };

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

  const isCurrentLocationEmpty = foldersToDisplay.length === 0 && filteredAssetsToDisplay.length === 0;

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
             <div className="flex justify-end mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('searchByNameOrSerial', 'Search by name or serial...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        disabled={isContentLoading}
                    />
                </div>
            </div>
            <ScrollArea className="h-[calc(100vh-28rem)] pr-3">
              {isContentLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <FolderTreeDisplay
                    foldersToDisplay={foldersToDisplay}
                    assetsToDisplay={filteredAssetsToDisplay}
                    allProjectAssets={allAssetsForCount}
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
                    deletingAssetId={deletingAssetId}
                />
              )}
              
              {isCurrentLocationEmpty && !isContentLoading && searchTerm && (
                  <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        {t('noSearchResults', 'No assets found matching your search.')}
                      </p>
                  </div>
              )}

              {isCurrentLocationEmpty && !isContentLoading && !searchTerm && (
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
          <div className="container mx-auto flex justify-center items-center gap-2 flex-wrap">
              <Button 
                  variant="default" 
                  size="lg" 
                  onClick={() => openNewFolderDialog(selectedFolder)} 
                  title={selectedFolder ? t('addNewFolder', 'New Folder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
                  className="shadow-lg"
              >
                  {t('addNewFolder', 'New Folder')}
              </Button>
              <Button
                  onClick={() => setIsNewAssetModalOpen(true)} 
                  className="shadow-lg"
                  size="lg"
                  title={t('newAsset', 'New Asset')}
              >
                  {t('newAsset', 'New Asset')}
              </Button>
               {isAdmin && (
                <Button variant="outline" size="lg" onClick={() => setIsImportModalOpen(true)} className="shadow-lg">
                  <Upload className="mr-2 h-4 w-4" />
                  {t('importAssetsButton', 'Import Assets')}
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
                  {newFolderParentContext ? t('addNewFolderTo', 'New Folder in "{parentName}"', { parentName: newFolderParentContext.name }) : t('addRootFolderTitle', 'Add Folder to Project Root')}
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
        
        {isAdmin && (
          <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('importAssetsModalTitle', 'Import Assets from Excel')}</DialogTitle>
                <DialogDescription>
                  {t('importAssetsModalDesc', 'Select an .xlsx file with columns: Name, quantity, Serial Number, Description.')}
                </DialogDescription>
              </DialogHeader>
              <div className="pt-4 pb-0 space-y-2">
                  <Label htmlFor="import-file">{t('excelFileLabel', 'Excel File')}</Label>
                  <Input 
                    id="import-file" 
                    type="file" 
                    accept=".xlsx"
                    onChange={(e) => setFileToImport(e.target.files ? e.target.files[0] : null)}
                    disabled={isImporting}
                  />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportModalOpen(false)} disabled={isImporting}>
                  {t('cancel', 'Cancel')}
                </Button>
                <Button onClick={handleFileImport} disabled={isImporting || !fileToImport}>
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isImporting ? t('importing', 'Importing...') : t('import', 'Import')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

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
