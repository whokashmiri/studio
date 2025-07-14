
"use client";
import React, { useEffect, useState, useCallback, useMemo, useDeferredValue, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Project, Folder as FolderType, ProjectStatus, Asset } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { Home, Loader2, CloudOff, FolderPlus, Upload, FilePlus, Search, FolderIcon, FileArchive, Edit2, Copy, Scissors, ClipboardPaste } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { useClipboard } from '@/contexts/clipboard-context';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/use-online-status';
import * as OfflineService from '@/lib/offline-service';
import type { DocumentData } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { uploadMedia } from '@/actions/cloudinary-actions';
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { ProjectFolderView } from '@/components/project-folder-view';
import { ProjectSearchResults } from '@/components/project-search-results';
import { EditFolderModal } from '@/components/modals/edit-folder-modal';
import { NewAssetModal } from '@/components/modals/new-asset-modal';
import { ImagePreviewModal } from '@/components/modals/image-preview-modal';


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
  const [displayedAssets, setDisplayedAssets] = useState<Asset[]>([]); // For paginated display
  const [allProjectAssets, setAllProjectAssets] = useState<Asset[]>([]); // For asset counts, might be removed later
  const [isLoading, setIsLoading] = useState(true); 
  const [isContentLoading, setIsContentLoading] = useState(true); 
  const [isNavigatingToHome, setIsNavigatingToHome] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [loadingAssetId, setLoadingAssetId] = useState<string | null>(null);
  const [loadingFolderId, setLoadingFolderId] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);

  // Pagination state for assets
  const [lastVisibleAssetDoc, setLastVisibleAssetDoc] = useState<DocumentData | null>(null);
  const [hasMoreAssets, setHasMoreAssets] = useState(true);
  const [isFetchingMoreAssets, setIsFetchingMoreAssets] = useState(false);
  
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
  const [isSearching, setIsSearching] = useState(false);
  
  // State for asset filtering
  const [assetFilter, setAssetFilter] = useState<'all' | 'done' | 'notDone'>('notDone');
  
  const { toast } = useToast();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { clipboardState, clearClipboard } = useClipboard();
  const isAdmin = currentUser?.role === 'Admin';
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadMoreAssetsRef = useRef<HTMLDivElement>(null);

  // Drag and Drop state
  const [activeDragItem, setActiveDragItem] = useState<{ id: string; type: 'folder' | 'asset'; data: any } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // User must drag 8px before a drag event is initiated
      },
    })
  );

  const fetchInitialFolderContent = useCallback(async (folderId: string | null, filter: 'all' | 'done' | 'notDone') => {
      if (isSearching) return; // Do not fetch folder content while searching
      setIsContentLoading(true);
      setDisplayedAssets([]);
      setLastVisibleAssetDoc(null);
      setHasMoreAssets(true);

      try {
          const { assets, lastDoc } = await FirestoreService.getAssetsPaginated(projectId, folderId, filter, 20);
          setDisplayedAssets(assets);
          setLastVisibleAssetDoc(lastDoc);
          setHasMoreAssets(lastDoc !== null);
      } catch (error) {
          console.error("Error fetching initial folder content:", error);
          toast({ title: "Error", description: "Failed to load folder content.", variant: "destructive" });
      } finally {
          setIsContentLoading(false);
      }
  }, [projectId, toast, isSearching]);

  const loadMoreAssets = useCallback(async () => {
    if (isFetchingMoreAssets || !hasMoreAssets || isSearching) return;
    
    setIsFetchingMoreAssets(true);
    try {
        const { assets: newAssets, lastDoc } = await FirestoreService.getAssetsPaginated(
            projectId,
            currentUrlFolderId,
            assetFilter,
            20,
            lastVisibleAssetDoc
        );

        setDisplayedAssets(prev => [...prev, ...newAssets]);
        setLastVisibleAssetDoc(lastDoc);
        setHasMoreAssets(lastDoc !== null);
    } catch (error) {
        console.error("Error fetching more assets:", error);
        toast({ title: "Error", description: "Failed to load more assets.", variant: "destructive" });
    } finally {
        setIsFetchingMoreAssets(false);
    }
  }, [isFetchingMoreAssets, hasMoreAssets, projectId, currentUrlFolderId, assetFilter, lastVisibleAssetDoc, toast, isSearching]);

  // Infinite scroll observer
  useEffect(() => {
    const scrollAreaElement = scrollAreaRef.current;
    const loaderElement = loadMoreAssetsRef.current;
  
    if (!scrollAreaElement || !loaderElement) {
      return;
    }
  
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreAssets && !isFetchingMoreAssets) {
          loadMoreAssets();
        }
      },
      {
        root: scrollAreaElement,
        rootMargin: '0px 0px 100px 0px', // Trigger when loader is 100px from bottom
        threshold: 0.1,
      }
    );
  
    observer.observe(loaderElement);
  
    return () => {
      observer.disconnect();
    };
  }, [hasMoreAssets, isFetchingMoreAssets, loadMoreAssets, currentUrlFolderId]); // Re-create observer when folder changes


  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    
    try {
      const [foundProject, projectFolders, allProjAssets] = await Promise.all([
        FirestoreService.getProjectById(projectId),
        FirestoreService.getFolders(projectId),
        FirestoreService.getAllAssetsForProject(projectId), // Keep for counts
      ]);

      if (!foundProject) {
        toast({ title: t('projectNotFound', "Project not found"), variant: "destructive" });
        router.push('/');
        return;
      }

      setProject(foundProject);
      setAllProjectFolders(projectFolders);
      setAllProjectAssets(allProjAssets); // For asset counts
      
    } catch (error) {
      console.error("Error loading project data:", error);
      toast({ title: "Error", description: "Failed to load project data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setLoadingFolderId(null);
    }
  }, [projectId, router, toast, t]);
  
  // Refetch content when filter or folder changes
  useEffect(() => {
    if (projectId && !isSearching) {
        fetchInitialFolderContent(currentUrlFolderId, assetFilter);
    }
  }, [assetFilter, currentUrlFolderId, fetchInitialFolderContent, projectId, isSearching]);


  useEffect(() => {
    loadProjectData();
  }, [projectId]);

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
          loadProjectData();
        }
      });
    }
  }, [isOnline, loadProjectData, toast]);

  // --- Search Activation ---
  useEffect(() => {
      const term = deferredSearchTerm.trim();
      if (term) {
          setIsSearching(true);
      } else {
          setIsSearching(false);
          // When search is cleared, we must also clear the displayed assets to avoid clashes
          // before the folder content re-fetches via the other useEffect.
          setDisplayedAssets([]);
      }
  }, [deferredSearchTerm]);

  // --- Memoized Data and Folder Logic ---
  const foldersMap = useMemo(() => new Map(allProjectFolders.map(f => [f.id, f])), [allProjectFolders]);
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

  const { finalFoldersToDisplay, finalAssetsToDisplay } = useMemo(() => {
    const offlineQueue = OfflineService.getOfflineQueue();
    
    // Create a Set of all offline item IDs for quick lookup
    const offlineItemIds = new Set(
        offlineQueue.map(action => 'localId' in action ? action.localId : 'assetId' in action ? action.assetId : action.folderId)
    );

    const offlineFoldersForView = offlineQueue
      .filter(action => action.type === 'add-folder' && action.projectId === projectId && (action.payload.parentId || null) === currentUrlFolderId)
      .map(action => ({ ...(action as any).payload, id: (action as any).localId, isOffline: true }));

    const offlineAssetsForView = offlineQueue
      .filter(action => action.type === 'add-asset' && action.projectId === projectId && (action.payload.folderId || null) === currentUrlFolderId)
      .map(action => ({ ...(action as any).payload, id: (action as any).localId, isOffline: true }));
    
    // Filter online items to exclude any that are still in the offline queue (even if synced but UI not updated)
    const uniqueOnlineFolders = allProjectFolders.filter(
        f => f.parentId === (currentUrlFolderId || null) && !offlineItemIds.has(f.id)
    );
    
    const uniqueOnlineAssets = displayedAssets.filter(a => !offlineItemIds.has(a.id));

    return {
        finalFoldersToDisplay: [...offlineFoldersForView, ...uniqueOnlineFolders],
        finalAssetsToDisplay: [...offlineAssetsForView, ...uniqueOnlineAssets],
    };
  }, [allProjectFolders, displayedAssets, projectId, currentUrlFolderId]);


  useEffect(() => {
    if (!isLoading && currentUrlFolderId && allProjectFolders.length > 0 && !foldersMap.has(currentUrlFolderId)) {
        toast({ title: "Error", description: t('folderNotFoundOrInvalid', "Folder not found or invalid for this project."), variant: "destructive" });
        router.push(`/project/${projectId}`);
    }
  }, [currentUrlFolderId, foldersMap, isLoading, projectId, router, t, toast, allProjectFolders.length]);

  // --- Callbacks for UI actions ---
  const handleSelectFolder = useCallback((folder: FolderType | null) => {
    setSearchTerm('');
    if (folder) {
        setLoadingFolderId(folder.id);
    }
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
          await loadProjectData();
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
      OfflineService.queueOfflineAction('add-folder', newFolderData, project.id);
      toast({ title: "Working Offline", description: `Folder "${newFolderName}" saved locally. It will sync when you're back online.` });
      
      setIsCreatingFolder(false);
      setNewFolderName('');
      setIsNewFolderDialogOpen(false);
      setNewFolderParentContext(null);
      await loadProjectData();
    }
  }, [newFolderName, project, newFolderParentContext, loadProjectData, t, toast, isOnline]);

  const openNewFolderDialog = useCallback((parentContextForNewDialog: FolderType | null) => {
    setNewFolderParentContext(parentContextForNewDialog);
    setIsNewFolderDialogOpen(true);
  }, []); 

  const handleOpenEditFolderModal = useCallback((folderToEdit: FolderType) => {
    setEditingFolder(folderToEdit);
    setIsEditFolderModalOpen(true);
  }, []);

  const handleDeleteFolder = useCallback(async (folderToDelete: FolderType) => {
    if (!isOnline) {
      toast({ title: "Action Not Available", description: "Cannot delete folders while offline.", variant: "default" });
      return;
    }
    const hasChildFolders = allProjectFolders.some(f => f.parentId === folderToDelete.id);
    const hasChildAssets = allProjectAssets.some(a => a.folderId === folderToDelete.id);

    if (hasChildFolders || hasChildAssets) {
      toast({ title: t('folderNotEmptyTitle', 'Folder Not Empty'), description: t('folderNotEmptyDesc', 'Cannot delete folder. Please delete all subfolders and assets first.'), variant: 'destructive' });
      return;
    }

    if (window.confirm(t('deleteFolderConfirmation', `Are you sure you want to delete "${folderToDelete.name}"? This action cannot be undone.`, { folderName: folderToDelete.name }))) {
      setDeletingItemId(folderToDelete.id);
      const success = await FirestoreService.deleteFolderCascade(folderToDelete.id);
      if (success) {
        toast({ title: t('folderDeletedTitle', 'Folder Deleted'), description: t('folderDeletedDesc', `Folder "${folderToDelete.name}" has been deleted.`, { folderName: folderToDelete.name }) });
        await loadProjectData();
      } else {
        toast({ title: "Error", description: "Failed to delete folder.", variant: "destructive" });
      }
      setDeletingItemId(null);
    }
  }, [allProjectFolders, allProjectAssets, isOnline, loadProjectData, t, toast]);


  const handleFolderUpdated = useCallback(async () => {
    await loadProjectData(); 
    if (project) {
      await FirestoreService.updateProject(project.id, { status: 'recent' as ProjectStatus });
      const updatedProj = await FirestoreService.getProjectById(project.id);
      setProject(updatedProj);
    }
  }, [loadProjectData, project]);

  const handleEditAsset = useCallback((asset: Asset) => {
    setLoadingAssetId(asset.id);
    const editUrl = `/project/${projectId}/new-asset?assetId=${asset.id}${asset.folderId ? `&folderId=${asset.folderId}` : ''}`;
    router.push(editUrl); 
  }, [projectId, router]);

  const handleDeleteAsset = useCallback(async (assetToDelete: Asset) => {
    if (!isOnline) {
      toast({ title: "Action Not Available", description: "Cannot delete items while offline.", variant: "default" });
      return;
    }
    if (window.confirm(t('deleteAssetConfirmationDesc', `Are you sure you want to delete asset "${assetToDelete.name}"?`, {assetName: assetToDelete.name}))) {
      setDeletingItemId(assetToDelete.id);
      try {
        const success = await FirestoreService.deleteAsset(assetToDelete.id);
        if (success) {
          toast({ title: t('assetDeletedTitle', 'Asset Deleted'), description: t('assetDeletedDesc', `Asset "${assetToDelete.name}" has been deleted.`, {assetName: assetToDelete.name})});
          await loadProjectData();
        } else {
          toast({ title: "Error", description: "Failed to delete asset.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error deleting asset:", error);
        toast({ title: "Error", description: "Failed to delete asset.", variant: "destructive" });
      } finally {
        setDeletingItemId(null);
      }
    }
  }, [loadProjectData, t, toast, isOnline]);

  const handleAssetCreatedInModal = useCallback(async (assetDataWithDataUris: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!project) return;
    if (!isOnline) {
      OfflineService.queueOfflineAction('add-asset', assetDataWithDataUris, project.id);
      toast({
        title: "Working Offline",
        description: `Asset "${assetDataWithDataUris.name}" saved locally. It will sync when you're back online.`
      });
      await loadProjectData(); // To show optimistic offline asset
      return;
    }
    
    // --- Online optimistic UI flow ---
    const tempId = `temp_${uuidv4()}`;
    const optimisticAsset: Asset = {
      ...assetDataWithDataUris,
      id: tempId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isUploading: true,
      photos: assetDataWithDataUris.photos || [], // These are data URIs
      videos: assetDataWithDataUris.videos || [], // These are data URIs
      folderId: assetDataWithDataUris.folderId || null,
    };

    // Add to UI immediately
    setDisplayedAssets(prev => [optimisticAsset, ...prev]);

    toast({
      title: t('saving', 'Saving...'),
      description: `Asset "${assetDataWithDataUris.name}" is being uploaded.`,
    });

    // Start background upload and save
    (async () => {
      try {
        // Upload all media files to Cloudinary
        const photoUploadPromises = (assetDataWithDataUris.photos || []).map(async (dataUri) => {
            const result = await uploadMedia(dataUri);
            if (!result.success) throw new Error(result.error || 'Photo upload failed');
            return result.url;
        });
        const videoUploadPromises = (assetDataWithDataUris.videos || []).map(async (dataUri) => {
            const result = await uploadMedia(dataUri);
            if (!result.success) throw new Error(result.error || 'Video upload failed');
            return result.url;
        });
        
        const uploadedPhotoUrls = await Promise.all(photoUploadPromises);
        const uploadedVideoUrls = await Promise.all(videoUploadPromises);

        // Create the final asset payload with Cloudinary URLs
        const finalAssetData = {
          ...assetDataWithDataUris,
          photos: uploadedPhotoUrls,
          videos: uploadedVideoUrls,
        };

        const newAssetFromDb = await FirestoreService.addAsset(finalAssetData);
        
        if (newAssetFromDb) {
          toast({
            title: t('assetSavedTitle', "Asset Saved"),
            description: t('assetSavedDesc', `Asset "${newAssetFromDb.name}" has been saved.`, { assetName: newAssetFromDb.name }),
            variant: "success-yellow"
          });
          // Full reload to ensure consistency
          await loadProjectData(); 
        } else {
           throw new Error("Failed to save asset to Firestore.");
        }
      } catch (error) {
        console.error("Error saving asset in background:", error);
        toast({ title: "Upload Error", description: `An error occurred while saving "${assetDataWithDataUris.name}".`, variant: "destructive" });
        // Remove the failed optimistic asset from UI
        setDisplayedAssets(prev => prev.filter(asset => asset.id !== tempId));
      }
    })();
  }, [isOnline, project, toast, t, loadProjectData]);

  const onPreviewAsset = useCallback((asset: Asset) => {
    if(asset.isUploading) return;
    setAssetToPreview(asset);
    setIsImagePreviewModalOpen(true);
  }, []);

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

    const XLSX = await import('xlsx');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            // 1. Create a new folder for the import
            const folderName = fileToImport.name.replace(/\.[^/.]+$/, ""); // Remove file extension
            const newFolderData: Omit<FolderType, 'id'> = {
                name: folderName,
                projectId: project.id,
                parentId: selectedFolder?.id || null, // Create inside current folder or at root
            };
            const createdFolder = await FirestoreService.addFolder(newFolderData);

            if (!createdFolder) {
                toast({ title: t('importErrorTitle', "Import Error"), description: "Could not create a folder for the import.", variant: "destructive" });
                return;
            }
            const newFolderId = createdFolder.id;

            // 2. Read the file and create assets within the new folder
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

            const assetsToCreate: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'name_lowercase' | 'name_lowercase_with_status'>[] = [];
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
                        folderId: newFolderId, // Use the new folder's ID
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

            toast({ title: t('importSuccessTitle', "Import Successful"), description: t('importSuccessDescInFolder', "{count} assets have been created in folder '{folderName}'.", { count: createdCount, folderName: folderName }) });
            await loadProjectData();
        } catch (error) {
            console.error("Error importing file:", error);
            toast({ title: t('importErrorTitle', "Import Error"), description: t('importErrorGeneric', "An error occurred while processing the file."), variant: "destructive" });
        } finally {
            setIsImporting(false);
            setFileToImport(null);
            setIsImportModalOpen(false);
        }
    };
    
    reader.onerror = () => {
        toast({ title: t('importErrorTitle', "Import Error"), description: "Could not read the selected file.", variant: "destructive" });
        setIsImporting(false);
        setFileToImport(null);
        setIsImportModalOpen(false);
    };

    reader.readAsBinaryString(fileToImport);
  };
  
    const handleDragStart = (event: any) => {
        if (!isOnline) return;
        const { active } = event;
        const itemType = active.data.current?.type;
        const itemData = active.data.current?.item;
        if (itemData) {
            setActiveDragItem({ id: active.id, type: itemType, data: itemData });
        }
    };

    const handleDragEnd = async (event: any) => {
        if (!isOnline) return;
        setActiveDragItem(null);
        const { active, over } = event;
    
        if (!over || active.id === over.id) {
            return;
        }

        const draggedItemId = active.id as string;
        const draggedItemType = active.data.current?.type as 'folder' | 'asset';
        const droppedOnId = over.id as string;
        const droppedOnType = over.data.current?.type;

        if (droppedOnType === 'asset') {
            toast({ title: "Invalid Move", description: "Cannot move an item into an asset.", variant: "destructive" });
            return;
        }

        const newParentId = droppedOnId === 'root-droppable' ? null : droppedOnId;
    
        let success = false;
        try {
            if (draggedItemType === 'folder') {
                const draggedFolder = active.data.current.item as FolderType;
                if (draggedFolder.parentId === newParentId) return; // No change
                success = await FirestoreService.updateFolder(draggedItemId, { parentId: newParentId });
            } else if (draggedItemType === 'asset') {
                const draggedAsset = active.data.current.item as Asset;
                if (draggedAsset.folderId === newParentId) return; // No change
                success = await FirestoreService.updateAsset(draggedItemId, { folderId: newParentId });
            }
        
            if (success) {
                toast({ title: "Item Moved", description: "The item has been moved successfully.", variant: "success-yellow" });
                await loadProjectData();
            } else {
                throw new Error("Update operation failed.");
            }
        } catch (error) {
            console.error("Error moving item:", error);
            toast({ title: "Error", description: "Failed to move the item.", variant: "destructive" });
        }
    };

    const handlePaste = async () => {
        if (!clipboardState.itemId || !isOnline || isPasting) return;
    
        const { itemId, itemType, operation, sourceProjectId } = clipboardState;
    
        if (sourceProjectId !== project?.id) {
            toast({ title: "Paste Error", description: "Cannot paste items between different projects.", variant: "destructive" });
            return;
        }
    
        setIsPasting(true);
    
        const destinationFolderId = currentUrlFolderId;
    
        let success = false;
        try {
            if (itemType === 'asset') {
                const originalAsset = allProjectAssets.find(a => a.id === itemId) || displayedAssets.find(a => a.id === itemId);
                if (!originalAsset) throw new Error("Original asset not found");
    
                if (operation === 'cut') {
                    success = await FirestoreService.updateAsset(itemId, { folderId: destinationFolderId });
                } else { // copy
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, createdAt, updatedAt, ...assetToCopy } = originalAsset;
                    success = !!await FirestoreService.addAsset({
                        ...assetToCopy,
                        folderId: destinationFolderId,
                    });
                }
            } else if (itemType === 'folder') {
                if (operation === 'cut') {
                    success = await FirestoreService.updateFolder(itemId, { parentId: destinationFolderId });
                } else { // copy
                    success = await FirestoreService.copyFolderRecursively(itemId, destinationFolderId);
                }
            }
    
            if (success) {
                toast({ title: "Success", description: `Item ${operation === 'copy' ? 'copied' : 'moved'} successfully.` });
                await loadProjectData();
            } else {
                throw new Error(`Failed to ${operation} item.`);
            }
        } catch (error) {
            console.error(`Error during paste operation:`, error);
            toast({ title: "Error", description: `Could not complete the ${operation} operation.`, variant: "destructive" });
        } finally {
            clearClipboard();
            setIsPasting(false);
        }
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

  const mainContent = (
    <>
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
      <CardContent className="transition-colors rounded-b-lg p-2 md:p-4 h-[calc(100vh-25rem)]">
          <div className="flex justify-end mb-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('searchByNameOrSerial', 'Search by name or serial...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={isLoading || !isOnline}
                />
            </div>
        </div>
        <div className="h-[calc(100%-4rem)]">
              {isSearching ? (
                  <ProjectSearchResults
                      project={project}
                      searchTerm={deferredSearchTerm}
                      assetFilter="all"
                      onEditAsset={handleEditAsset}
                      onPreviewAsset={onPreviewAsset}
                      loadingAssetId={loadingAssetId}
                      foldersMap={foldersMap}
                  />
            ) : (
              <ProjectFolderView
                project={project}
                isContentLoading={isContentLoading}
                foldersToDisplay={finalFoldersToDisplay}
                assetsToDisplay={finalAssetsToDisplay}
                allProjectAssets={allProjectAssets}
                selectedFolder={selectedFolder}
                deletingItemId={deletingItemId}
                loadingAssetId={loadingAssetId}
                loadingFolderId={loadingFolderId}
                scrollAreaRef={scrollAreaRef}
                onSelectFolder={handleSelectFolder}
                onAddSubfolder={openNewFolderDialog}
                onEditFolder={handleOpenEditFolderModal}
                onDeleteFolder={handleDeleteFolder}
                onEditAsset={handleEditAsset}
                onDeleteAsset={handleDeleteAsset}
                onPreviewAsset={onPreviewAsset}
                isAdmin={isAdmin}
                isOnline={isOnline}
                loadMoreAssetsRef={loadMoreAssetsRef}
                hasMoreAssets={hasMoreAssets}
                isFetchingMoreAssets={isFetchingMoreAssets}
                assetFilter={assetFilter}
                onSetAssetFilter={setAssetFilter}
              />
            )}
        </div>
      </CardContent>
    </>
  );
  
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
      
      {isAdmin ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Card>
            {mainContent}
          </Card>
          <DragOverlay>
            {activeDragItem ? (
              <div className="rounded-lg bg-primary text-primary-foreground p-2 shadow-xl flex items-center gap-2">
                 {activeDragItem.type === 'folder' ? <FolderIcon/> : <FileArchive/>}
                 <span className="font-semibold text-sm">{activeDragItem.data.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <Card>
          {mainContent}
        </Card>
      )}

      <div className="fixed bottom-0 inset-x-0 p-4 bg-background/80 backdrop-blur-sm border-t z-40">
        <div className="container mx-auto flex justify-center items-center gap-2 flex-wrap">
            <Button 
                variant="default" 
                size="lg" 
                onClick={() => openNewFolderDialog(selectedFolder)} 
                title={selectedFolder ? t('addNewFolder', 'New Folder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
                className="shadow-lg"
            >
                <FolderPlus className="mr-2 h-4 w-4" />
                {t('addNewFolder', 'New Folder')}
            </Button>
            <Button
                onClick={() => setIsNewAssetModalOpen(true)} 
                className="shadow-lg"
                size="lg"
                title={t('newAsset', 'New Asset')}
            >
                <FilePlus className="mr-2 h-4 w-4" />
                {t('newAsset', 'New Asset')}
            </Button>
             {isAdmin && (
              <Button variant="outline" size="lg" onClick={() => setIsImportModalOpen(true)}  className="shadow-lg" disabled={!isOnline}>
                <Upload className="mr-2 h-4 w-4" />
                {t('importAssetsButton', 'Import Assets')}
              </Button> 
            )}
            {isAdmin && clipboardState.itemId && (
              <Button variant="secondary" size="lg" onClick={handlePaste} className="shadow-lg" disabled={!isOnline || isPasting}>
                {isPasting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ClipboardPaste className="mr-2 h-4 w-4" />}
                {isPasting ? t('pasting', 'Pasting...') : t('paste', 'Paste')}
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
          isOnline={isOnline}
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
