
"use client";
import React, { useEffect, useState, useCallback, useMemo, useDeferredValue, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderTreeDisplay } from '@/components/folder-tree';
import type { Project, Folder as FolderType, ProjectStatus, Asset } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { Home, Loader2, CloudOff, FolderPlus, Upload, FilePlus, Search, Edit3, Image as ImageIcon, FileArchive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ImagePreviewModal } from '@/components/modals/image-preview-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOnlineStatus } from '@/hooks/use-online-status';
import * as OfflineService from '@/lib/offline-service';
import * as XLSX from 'xlsx';
import Image from 'next/image';
import type { DocumentData } from 'firebase/firestore';

// Lazy load modals to improve initial page load time
const EditFolderModal = React.lazy(() => import('@/components/modals/edit-folder-modal').then(module => ({ default: module.EditFolderModal })));
const NewAssetModal = React.lazy(() => import('@/components/modals/new-asset-modal').then(module => ({ default: module.NewAssetModal })));


export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const currentUrlFolderId = searchParams.get('folderId') || null;
  const isOnline = useOnlineStatus();

  // State for project structure and folder view
  const [project, setProject] = useState<Project | null>(null);
  const [allProjectFolders, setAllProjectFolders] = useState<FolderType[]>([]);
  const [allProjectAssets, setAllProjectAssets] = useState<Asset[]>([]);
  const [currentViewAssets, setCurrentViewAssets] = useState<Asset[]>([]);
  const [offlineFolders, setOfflineFolders] = useState<FolderType[]>([]);
  const [offlineAssets, setOfflineAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [isContentLoading, setIsContentLoading] = useState(true); 
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreAssets, setHasMoreAssets] = useState(true);
  const [lastVisibleAssetDoc, setLastVisibleAssetDoc] = useState<DocumentData | null>(null);
  const [isNavigatingToHome, setIsNavigatingToHome] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  
  // State for modals and forms
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

  // State for new project-wide search
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [searchedAssets, setSearchedAssets] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(true);
  const [lastSearchedDoc, setLastSearchedDoc] = useState<DocumentData | null>(null);
  const searchLoaderRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';
  const isMobile = useIsMobile();
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  const loadInitialStructure = useCallback(async () => {
    if (projectId) {
      setIsLoading(true);
      try {
        const [foundProject, projectFolders, allAssetsForCounts] = await Promise.all([
          FirestoreService.getProjectById(projectId),
          FirestoreService.getFolders(projectId),
          FirestoreService.getAllAssetsForProject(projectId),
        ]);

        if (!foundProject) {
          toast({ title: t('projectNotFound', "Project not found"), variant: "destructive" });
          router.push('/');
          return;
        }
        
        setProject(foundProject);
        setAllProjectFolders(projectFolders);
        setAllProjectAssets(allAssetsForCounts);
        
        const queuedActions = OfflineService.getOfflineQueue();
        setOfflineFolders(queuedActions.filter(a => a.type === 'add-folder' && a.projectId === projectId).map(a => ({ ...a.payload, id: a.localId, isOffline: true } as FolderType)));

      } catch (error) {
        console.error("Error loading project structure:", error);
        toast({ title: "Error", description: "Failed to load project data.", variant: "destructive" });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }
  }, [projectId, router, t, toast]);
  
  const fetchFirstPageOfAssets = useCallback(async (pId: string, fId: string | null) => {
    setIsContentLoading(true);
    setCurrentViewAssets([]); // Clear previous assets
    
    const { assets, lastDoc } = await FirestoreService.getAssetsPaginated(pId, fId, 15);
    
    setCurrentViewAssets(assets);
    setLastVisibleAssetDoc(lastDoc);
    setHasMoreAssets(lastDoc !== null);
    
    // Also fetch offline assets for this folder
    const queuedActions = OfflineService.getOfflineQueue();
    const offlineForView = queuedActions
        .filter(a => a.type === 'add-asset' && a.projectId === pId && (a.payload.folderId || null) === fId)
        .map(a => ({ ...a.payload, id: a.localId, createdAt: Date.now(), isOffline: true } as Asset));
    setOfflineAssets(offlineForView);

    setIsContentLoading(false);
  }, []);

  const loadMoreAssets = useCallback(async () => {
    if (isLoadingMore || !hasMoreAssets || !project) return;
    
    setIsLoadingMore(true);
    const { assets: newAssets, lastDoc } = await FirestoreService.getAssetsPaginated(project.id, currentUrlFolderId, 15, lastVisibleAssetDoc);

    setCurrentViewAssets(prev => [...prev, ...newAssets]);
    setLastVisibleAssetDoc(lastDoc);
    setHasMoreAssets(lastDoc !== null);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMoreAssets, project, currentUrlFolderId, lastVisibleAssetDoc]);

  // Initial Data Load
  useEffect(() => {
    loadInitialStructure();
  }, [loadInitialStructure]);

  // Load folder content when project is loaded or folderId changes
  useEffect(() => {
    if (!isLoading && project) {
      fetchFirstPageOfAssets(project.id, currentUrlFolderId);
    }
  }, [isLoading, project, currentUrlFolderId, fetchFirstPageOfAssets]);

  const reloadAllData = useCallback(async () => {
    await loadInitialStructure();
  }, [loadInitialStructure]);
  
  // Offline Sync
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

  // --- Search Logic ---
  const handleSearch = useCallback(async (term: string, loadMore = false) => {
      if (!project) return;
      
      setIsSearchLoading(true);
  
      const { assets: newAssets, lastDoc } = await FirestoreService.searchAssets(
          project.id,
          term,
          10,
          loadMore ? lastSearchedDoc : null,
          currentUrlFolderId // Pass folderId to scope search
      );
  
      if (loadMore) {
          setSearchedAssets(prev => [...prev, ...newAssets]);
      } else {
          setSearchedAssets(newAssets);
      }
      
      setLastSearchedDoc(lastDoc);
      setHasMoreSearchResults(lastDoc !== null);
      setIsSearchLoading(false);
  
  }, [project, lastSearchedDoc, currentUrlFolderId]);
  
  useEffect(() => {
      const term = deferredSearchTerm.trim();
      if (term) {
          setIsSearching(true);
          // Reset previous search state for a new search
          setSearchedAssets([]);
          setLastSearchedDoc(null);
          setHasMoreSearchResults(true);
          handleSearch(term);
      } else {
          setIsSearching(false);
          setSearchedAssets([]);
      }
  }, [deferredSearchTerm, handleSearch]);
  
  // Infinite scroll for search results
  useEffect(() => {
      if (!isSearching || !searchLoaderRef.current || !hasMoreSearchResults || isSearchLoading) return;
  
      const observer = new IntersectionObserver(
          (entries) => {
              if (entries[0].isIntersecting) {
                  handleSearch(deferredSearchTerm.trim(), true);
              }
          },
          { root: null, rootMargin: '0px', threshold: 1.0 }
      );
  
      const currentLoader = searchLoaderRef.current;
      if (currentLoader) {
          observer.observe(currentLoader);
      }
  
      return () => {
          if (currentLoader) {
              observer.unobserve(currentLoader);
          }
      };
  }, [isSearching, isSearchLoading, hasMoreSearchResults, deferredSearchTerm, handleSearch]);

  // --- Memoized Data and Folder Logic ---
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
    return [...currentViewAssets, ...offlineAssets];
  }, [currentViewAssets, offlineAssets]);
  
  const finalAssetsToDisplay = useMemo(() => combinedCurrentViewAssets, [combinedCurrentViewAssets]);
  const finalFoldersToDisplay = useMemo(() => combinedFolders.filter(folder => folder.parentId === (currentUrlFolderId || null)), [combinedFolders, currentUrlFolderId]);

  useEffect(() => {
    if (!isLoading && currentUrlFolderId && combinedFolders.length > 0 && !foldersMap.has(currentUrlFolderId)) {
        toast({ title: "Error", description: t('folderNotFoundOrInvalid', "Folder not found or invalid for this project."), variant: "destructive" });
        router.push(`/project/${projectId}`);
    }
  }, [currentUrlFolderId, foldersMap, isLoading, projectId, router, t, toast, combinedFolders.length]);

  // --- Callbacks for UI actions ---
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

    setCurrentViewAssets(prev => [optimisticAsset, ...prev]);

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
                
                const serialValue = row[serialHeader as string];
                const parsedSerial = serialValue != null ? parseFloat(String(serialValue)) : NaN;
                const serial = !isNaN(parsedSerial) ? parsedSerial : undefined;

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

  // --- Render Functions ---
  const renderFolderView = () => {
    const isCurrentLocationEmpty = finalFoldersToDisplay.length === 0 && finalAssetsToDisplay.length === 0;
    return (
        <>
            {isContentLoading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <FolderTreeDisplay
                    foldersToDisplay={finalFoldersToDisplay}
                    assetsToDisplay={finalAssetsToDisplay}
                    allProjectAssets={allProjectAssets}
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
                    onLoadMore={loadMoreAssets}
                    hasMore={hasMoreAssets}
                    isLoadingMore={isLoadingMore}
                    scrollAreaRef={scrollAreaRef}
                />
            )}
            
            {isCurrentLocationEmpty && !isContentLoading && (
                <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                        {selectedFolder ? t('folderIsEmpty', 'This folder is empty. Add a subfolder or asset.') : t('projectRootIsEmpty', 'This project has no folders or root assets. Add a folder to get started.')}
                    </p>
                </div>
            )}
        </>
    );
  };
  
  const renderSearchResults = () => {
    return (
        <ScrollArea className="h-full pr-3" viewportRef={scrollAreaRef}>
            {(isSearchLoading && searchedAssets.length === 0) && (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
            
            {searchedAssets.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground/90">
                        {t('searchResultsTitle', 'Search Results')}
                    </h3>
                    <div className="flex flex-col border rounded-md">
                        {searchedAssets.map(asset => {
                            const path = getFolderPath(asset.folderId);
                            const pathString = path.map(p => p.name).join(' > ');
                            return (
                                <Card 
                                    key={asset.id} 
                                    className="group flex flex-row items-center justify-between p-3 hover:shadow-md transition-shadow cursor-pointer w-full border-b last:border-b-0 rounded-none first:rounded-t-md last:rounded-b-md"
                                    onClick={() => handleEditAsset(asset)}
                                >
                                    <div className="flex items-center gap-3 flex-grow min-w-0">
                                        <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                            {asset.photos && asset.photos.length > 0 ? (
                                                <Image src={asset.photos[0]} alt={asset.name} fill className="object-cover" />
                                            ) : (
                                                <FileArchive className="w-6 h-6 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <CardTitle className="text-sm sm:text-base font-medium truncate group-hover:text-primary transition-colors">
                                                {asset.name}
                                            </CardTitle>
                                            {!currentUrlFolderId && (
                                                <CardDescription className="text-xs text-muted-foreground truncate" title={pathString}>
                                                    {pathString}
                                                </CardDescription>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-2">
                                        <Button variant="ghost" size="sm" onClick={(e) => {e.stopPropagation(); handleEditAsset(asset);}}>{t('edit','Edit')}</Button>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}
            
            {(!isSearchLoading && searchedAssets.length === 0 && deferredSearchTerm.trim()) && (
                 <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                       {t('noSearchResults', 'No assets found matching your search.')}
                    </p>
                </div>
            )}

            <div ref={searchLoaderRef} className="h-14 mt-4 flex items-center justify-center col-span-full">
                {isSearchLoading && searchedAssets.length > 0 && (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                )}
                {!hasMoreSearchResults && searchedAssets.length > 0 && (
                    <p className="text-sm text-muted-foreground">{t('noMoreAssets', 'End of list.')}</p>
                )}
            </div>
        </ScrollArea>
    )
  };


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
             {!isSearching && (
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
             )}
          </CardHeader>
          <CardContent className="transition-colors rounded-b-lg p-2 md:p-4">
             <div className="flex justify-end mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('searchByNameOrSerial', 'Search by name or serial...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                    />
                </div>
            </div>
            {isSearching ? (
                <div className="h-[calc(100vh-32rem)]">
                    {renderSearchResults()}
                </div>
            ) : (
                <div className="h-[calc(100vh-32rem)]" ref={scrollAreaRef}>
                  <ScrollArea className="h-full pr-3">
                      {renderFolderView()}
                  </ScrollArea>
                </div>
            )}
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

        {/* Suspense is needed for lazy loading components */}
        <React.Suspense fallback={null}>
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
        </React.Suspense>

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
