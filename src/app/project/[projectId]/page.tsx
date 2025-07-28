
"use client";
import React, { useEffect, useState, useCallback, useMemo, useDeferredValue, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Project, Folder as FolderType, ProjectStatus, Asset } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { Home, Loader2, CloudOff, FolderPlus, Upload, FilePlus, Search, FolderIcon, FileArchive, Edit2, Copy, Scissors, ClipboardPaste, CheckCircle, ListFilter, Download, Wifi, WifiOff, UploadCloud } from 'lucide-react'; 
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
import { ProjectFolderView } from '@/components/project-folder-view';
import { ProjectSearchResults } from '@/components/project-search-results';
import { EditFolderModal } from '@/components/modals/edit-folder-modal';
import { NewAssetModal, type PreloadedAssetData } from '@/components/modals/new-asset-modal';
import { ImagePreviewModal } from '@/components/modals/image-preview-modal';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import JSZip from 'jszip';
import { uploadMedia } from '@/actions/cloudinary-actions';
import { compressImage } from '@/lib/image-handler-service';


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
  const [displayedAssets, setDisplayedAssets] = useState<Asset[]>([]); 
  const [allProjectAssets, setAllProjectAssets] = useState<Asset[]>([]); 
  const [isLoading, setIsLoading] = useState(true); 
  const [isContentLoading, setIsContentLoading] = useState(true); 
  const [isNavigatingToHome, setIsNavigatingToHome] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [loadingAssetId, setLoadingAssetId] = useState<string | null>(null);
  const [loadingFolderId, setLoadingFolderId] = useState<string | null>(null);
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);
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
  const [preloadedAssetData, setPreloadedAssetData] = useState<PreloadedAssetData | null>(null);


  // State for new project-wide search
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [searchedAssets, setSearchedAssets] = useState<Asset[]>([]); 
  const [isSearching, setIsSearching] = useState(false);
  const [assetFilter, setAssetFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [isProjectAvailableOffline, setIsProjectAvailableOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // State for Drag-and-Drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);
  
  const { toast } = useToast();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { clipboardState, clearClipboard } = useClipboard();
  const isAdmin = currentUser?.role === 'Admin';
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadMoreAssetsRef = useRef<HTMLDivElement>(null);

  
  const fetchInitialFolderContent = useCallback(async (folderId: string | null) => {
      if (isSearching) return;
      setIsContentLoading(true);
      setDisplayedAssets([]); 
      setLastVisibleAssetDoc(null);
      setHasMoreAssets(true);

      try {
          if (isOnline) {
            const { assets, lastDoc } = await FirestoreService.getAssetsPaginated(projectId, folderId, 20, null, assetFilter);
            setDisplayedAssets(assets);
            setLastVisibleAssetDoc(lastDoc);
            setHasMoreAssets(lastDoc !== null);
          } else {
             // Offline: No pagination for now, load all from cache
             const allCachedAssets = await OfflineService.getAssetsFromCache(projectId);
             const filtered = allCachedAssets.filter(a => (a.folderId || null) === folderId);
             setDisplayedAssets(filtered);
             setHasMoreAssets(false);
          }
      } catch (error) {
          console.error("Error fetching initial folder content:", error);
          toast({ title: "Error", description: "Failed to load folder content.", variant: "destructive" });
      } finally {
          setIsContentLoading(false);
      }
  }, [projectId, toast, isSearching, assetFilter, isOnline]);

  const loadMoreAssets = useCallback(async () => {
    if (isFetchingMoreAssets || !hasMoreAssets || isSearching || !isOnline) return;
    
    setIsFetchingMoreAssets(true);
    try {
        const { assets: newAssets, lastDoc } = await FirestoreService.getAssetsPaginated(
            projectId,
            currentUrlFolderId,
            20,
            lastVisibleAssetDoc,
            assetFilter
        );

        setDisplayedAssets(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const uniqueNewAssets = newAssets.filter(a => !existingIds.has(a.id));
          return [...prev, ...uniqueNewAssets];
        });

        setLastVisibleAssetDoc(lastDoc);
        setHasMoreAssets(lastDoc !== null);
    } catch (error) {
        console.error("Error fetching more assets:", error);
        toast({ title: "Error", description: "Failed to load more assets.", variant: "destructive" });
    } finally {
        setIsFetchingMoreAssets(false);
    }
  }, [isFetchingMoreAssets, hasMoreAssets, projectId, currentUrlFolderId, lastVisibleAssetDoc, toast, isSearching, assetFilter, isOnline]);

  // Infinite scroll observer
  useEffect(() => {
    const scrollAreaElement = scrollAreaRef.current;
    const loaderElement = loadMoreAssetsRef.current;
  
    if (!scrollAreaElement || !loaderElement || !isOnline) return;
  
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreAssets && !isFetchingMoreAssets) {
          loadMoreAssets();
        }
      },
      { root: scrollAreaElement, rootMargin: '0px 0px 100px 0px', threshold: 0.1 }
    );
  
    observer.observe(loaderElement);
    return () => observer.disconnect();
  }, [hasMoreAssets, isFetchingMoreAssets, loadMoreAssets, currentUrlFolderId, isOnline]);


  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);

    try {
        const isProjectCached = await OfflineService.isProjectOffline(projectId);
        setIsProjectAvailableOffline(isProjectCached);
        
        let foundProject: Project | null;
        let projectFolders: FolderType[];
        let allProjAssets: Asset[];

        if (isOnline) {
            [foundProject, projectFolders, allProjAssets] = await Promise.all([
                FirestoreService.getProjectById(projectId),
                FirestoreService.getFolders(projectId),
                FirestoreService.getAllAssetsForProject(projectId, 'all'),
            ]);
        } else if (isProjectCached) {
            const cachedData = await OfflineService.getProjectDataFromCache(projectId);
            foundProject = cachedData.project;
            projectFolders = cachedData.folders;
            allProjAssets = cachedData.assets;
        } else {
            toast({ title: "Offline", description: "Project data not available offline.", variant: "destructive" });
            router.push('/');
            return;
        }

        if (!foundProject) {
            toast({ title: t('projectNotFound', "Project not found"), variant: "destructive" });
            router.push('/');
            return;
        }

        setProject(foundProject);
        setAllProjectFolders(projectFolders);
        setAllProjectAssets(allProjAssets);

    } catch (error) {
        console.error("Error loading project data:", error);
        toast({ title: "Error", description: "Failed to load project data.", variant: "destructive" });
    } finally {
        setIsLoading(false);
        setLoadingFolderId(null);
    }
  }, [projectId, router, t, toast, isOnline]);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId, loadProjectData, isOnline]);


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

  useEffect(() => {
    const term = deferredSearchTerm.trim();
    if (term) {
        setIsSearching(true);
        setSearchedAssets([]); 
        setDisplayedAssets([]); 
        setIsContentLoading(true);
        
        const performSearch = async () => {
          let assets: Asset[] = [];
          if (isOnline) {
              const { assets: onlineAssets } = await FirestoreService.searchAssets(projectId, term, 50, null, 'all');
              assets = onlineAssets;
          } else {
              assets = await OfflineService.searchAssetsInCache(projectId, term);
          }
          setSearchedAssets(assets);
          setIsContentLoading(false);
        };
        performSearch();
    } else if (isSearching) {
        setSearchedAssets([]);
        setDisplayedAssets([]); 
        setIsSearching(false); // Triggers folder content refetch
    }
  }, [deferredSearchTerm, projectId, isSearching, isOnline]);
  

  useEffect(() => {
    if (projectId && !isSearching) {
        fetchInitialFolderContent(currentUrlFolderId);
    }
  }, [currentUrlFolderId, projectId, isSearching, assetFilter, fetchInitialFolderContent]);


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
    const offlineFolderIds = new Set(offlineQueue.filter(a => a.type === 'add-folder').map(a => ('localId' in a ? a.localId : '')));
    const offlineAssetIds = new Set(offlineQueue.filter(a => a.type === 'add-asset').map(a => ('localId' in a ? a.localId : '')));
  
    const offlineFoldersForView = offlineQueue
      .filter((action): action is Extract<OfflineService.OfflineAction, {type: 'add-folder'}> => 
        action.type === 'add-folder' &&
        action.projectId === projectId &&
        (action.payload.parentId || null) === currentUrlFolderId
      )
      .map(action => ({ ...action.payload, id: action.localId, isOffline: true }));
  
    const offlineAssetsForView = offlineQueue
      .filter((action): action is Extract<OfflineService.OfflineAction, {type: 'add-asset'}> => 
        action.type === 'add-asset' &&
        action.projectId === projectId &&
        (action.payload.folderId || null) === currentUrlFolderId
      )
      .map(action => ({ ...action.payload, id: action.localId, isOffline: true, photos: [], videos: [] }));
  
    const uniqueOnlineFolders = allProjectFolders.filter(
      f => f.parentId === (currentUrlFolderId || null) && !offlineFolderIds.has(f.id)
    );
    const uniqueOnlineAssets = displayedAssets.filter(a => !offlineAssetIds.has(a.id));
  
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

  const handleSelectFolder = useCallback((folder: FolderType | null) => {
    setSearchTerm('');
    if (folder) {
        setLoadingFolderId(folder.id);
    } else {
        setLoadingFolderId(null); 
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
    if (project && isOnline) {
      await FirestoreService.updateProject(project.id, { status: 'recent' as ProjectStatus });
      const updatedProj = await FirestoreService.getProjectById(project.id);
      setProject(updatedProj);
    }
  }, [loadProjectData, project, isOnline]);

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
          setDisplayedAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
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
  }, [isOnline, t, toast]);


  const handleAssetCreatedInModal = useCallback(async (assetDataWithDataUris: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!project) return;
    
    if (!isOnline) {
      OfflineService.queueOfflineAction('add-asset', assetDataWithDataUris, project.id);
      toast({
        title: "Working Offline",
        description: `Asset "${assetDataWithDataUris.name}" saved locally. It will sync when you're back online.`
      });
      await loadProjectData();
      return;
    }
    
    const tempId = `temp_${uuidv4()}`;
    const optimisticAsset: Asset = {
      ...assetDataWithDataUris,
      id: tempId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isUploading: true,
      photos: assetDataWithDataUris.photos || [],
      videos: assetDataWithDataUris.videos || [],
      folderId: assetDataWithDataUris.folderId || null,
    };

    setDisplayedAssets(prev => [optimisticAsset, ...prev]);

    toast({
      title: t('saving', 'Saving...'),
      description: `Asset "${assetDataWithDataUris.name}" is being uploaded.`,
    });

    (async () => {
      try {
        const newAssetFromDb = await FirestoreService.addAsset(assetDataWithDataUris);
        if (newAssetFromDb) {
          toast({
            title: t('assetSavedTitle', "Asset Saved"),
            description: t('assetSavedDesc', `Asset "${newAssetFromDb.name}" has been saved.`, { assetName: newAssetFromDb.name }),
            variant: "success-yellow"
          });
          await loadProjectData(); 
        } else {
           throw new Error("Failed to save asset to Firestore.");
        }
      } catch (error) {
        console.error("Error saving asset in background:", error);
        toast({ title: "Upload Error", description: `An error occurred while saving "${assetDataWithDataUris.name}".`, variant: "destructive" });
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
            const folderName = fileToImport.name.replace(/\.[^/.]+$/, ""); 
            const newFolderData: Omit<FolderType, 'id'> = {
                name: folderName,
                projectId: project.id,
                parentId: selectedFolder?.id || null, 
            };
            const createdFolder = await FirestoreService.addFolder(newFolderData);

            if (!createdFolder) {
                toast({ title: t('importErrorTitle', "Import Error"), description: "Could not create a folder for the import.", variant: "destructive" });
                return;
            }
            const newFolderId = createdFolder.id;

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
                        folderId: newFolderId, 
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
  
    const handlePaste = async () => {
      if (!clipboardState.itemId || isPasting || !project) return;

      const { itemId, itemType, operation, sourceProjectId } = clipboardState;
      if (sourceProjectId !== project.id) {
          toast({ title: "Paste Error", description: "Cannot paste items between different projects.", variant: "destructive" });
          return;
      }
      setIsPasting(true);
      const destinationFolderId = currentUrlFolderId;

      let success = false;
      try {
          if (isOnline) {
              if (itemType === 'asset') {
                  if (operation === 'cut') {
                      success = await FirestoreService.updateAsset(itemId, { folderId: destinationFolderId });
                  } else { // copy
                      const originalAsset = allProjectAssets.find(a => a.id === itemId) || displayedAssets.find(a => a.id === itemId);
                      if (!originalAsset) throw new Error("Original asset not found for copy.");
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { id, createdAt, updatedAt, ...assetToCopy } = originalAsset;
                      success = !!await FirestoreService.addAsset({ ...assetToCopy, folderId: destinationFolderId });
                  }
              } else if (itemType === 'folder') {
                  if (operation === 'cut') {
                      success = await FirestoreService.updateFolder(itemId, { parentId: destinationFolderId });
                  } else { // copy
                      success = await FirestoreService.copyFolderRecursively(itemId, destinationFolderId);
                  }
              }
          } else { // Offline
              if (itemType === 'asset') {
                  if (operation === 'cut') {
                    OfflineService.queueOfflineAction('update-asset', { folderId: destinationFolderId }, project.id, itemId);
                    success = true;
                  } // Copy is too complex offline for now.
              } else if (itemType === 'folder') {
                 if (operation === 'cut') {
                    OfflineService.queueOfflineAction('update-folder', { parentId: destinationFolderId }, project.id, itemId);
                    success = true;
                  } // Copy is too complex offline for now.
              }
          }

          if (success) {
              toast({ title: "Success", description: `Item ${operation === 'copy' ? 'copied' : 'moved'} successfully. ${!isOnline ? '(Queued for sync)' : ''}` });
              await loadProjectData(); // This will now load from cache if offline
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


    const handleDownloadForOffline = async () => {
      if (!project) return;
      setIsDownloading(true);
      toast({ title: 'Downloading Project', description: 'Preparing project for offline use...' });
      try {
        await OfflineService.saveProjectForOffline(project.id);
        setIsProjectAvailableOffline(true);
        toast({ title: 'Download Complete', description: `Project "${project.name}" is now available offline.`, variant: 'success-yellow' });
      } catch (error) {
        console.error("Failed to download project for offline use:", error);
        toast({ title: 'Download Failed', description: 'Could not save the project for offline use.', variant: 'destructive' });
      } finally {
        setIsDownloading(false);
      }
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      if (isProcessingDrop || !project || !currentUser || !isOnline) {
          if (!isOnline) {
              toast({ title: "Action Not Available", description: "Drag and drop is not available in offline mode.", variant: "default" });
          }
          return;
      }
  
      setIsProcessingDrop(true);
      toast({ title: "Processing Drop", description: "Creating assets and folders..." });
  
      const getFilePromise = (entry: FileSystemFileEntry): Promise<File> => {
          return new Promise((resolve, reject) => entry.file(resolve, reject));
      };
  
      const readEntriesPromise = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
          return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      };
      
      const isImageFile = (entry: FileSystemEntry): entry is FileSystemFileEntry => {
          return entry.isFile && entry.name.match(/\.(jpe?g|png|gif|webp|heic)$/i) !== null;
      };
  
      const processDirectoryEntry = async (entry: FileSystemDirectoryEntry, parentFolderId: string | null): Promise<void> => {
          const reader = entry.createReader();
          let allEntries: FileSystemEntry[] = [];
          let currentBatch: FileSystemEntry[];
          do {
              currentBatch = await readEntriesPromise(reader);
              allEntries.push(...currentBatch);
          } while (currentBatch.length > 0);
  
          const subDirectories = allEntries.filter(e => e.isDirectory) as FileSystemDirectoryEntry[];
          const imageFiles = allEntries.filter(isImageFile);
          
          if (subDirectories.length === 0 && imageFiles.length > 0) {
              // This is an Asset folder.
              const tempAssetId = `temp_drop_${uuidv4()}`;
              const tempAsset: Asset = {
                id: tempAssetId, name: entry.name, projectId: project.id, folderId: parentFolderId, photos: [], isUploading: true, createdAt: Date.now()
              }
              setDisplayedAssets(prev => [tempAsset, ...prev]);

              const uploadPromises = imageFiles.map(async (fileEntry) => {
                  try {
                    const file = await getFilePromise(fileEntry);
                    const compressedDataUrl = await compressImage(file);
                    const result = await uploadMedia(compressedDataUrl);
                    return result.success ? result.url : null;
                  } catch (e) {
                    console.error('Failed to process or upload an image:', e);
                    return null;
                  }
              });

              const uploadedUrls = (await Promise.all(uploadPromises)).filter((url): url is string => url !== null);
              
              const assetPayload = {
                  name: entry.name,
                  projectId: project.id,
                  folderId: parentFolderId,
                  userId: currentUser.id,
                  photos: uploadedUrls,
                  videos: [],
              };
              const newAsset = await FirestoreService.addAsset(assetPayload);

              // Replace optimistic UI with final data
              setDisplayedAssets(prev => prev.map(a => a.id === tempAssetId ? (newAsset || a) : a).filter(a => a !== tempAsset || !!newAsset));
              if (!newAsset) {
                toast({title: "Upload Error", description: `Failed to create asset for ${entry.name}`, variant: 'destructive'});
              }

          } else {
              // This is a container folder (it's empty or has subfolders).
              const folderPayload: Omit<FolderType, 'id'> = {
                  name: entry.name,
                  projectId: project.id,
                  parentId: parentFolderId,
              };
              const createdFolder = await FirestoreService.addFolder(folderPayload);
              if (!createdFolder) {
                  console.error(`Failed to create folder for: ${entry.name}`);
                  return;
              }
  
              // Recurse into subdirectories.
              for (const subDir of subDirectories) {
                  await processDirectoryEntry(subDir, createdFolder.id);
              }
             
              if(imageFiles.length > 0) {
                  const imageAssetPromises = imageFiles.map(fileEntry => {
                      return (async () => {
                          const file = await getFilePromise(fileEntry);
                          const compressedDataUrl = await compressImage(file);
                          const result = await uploadMedia(compressedDataUrl);
                          if (!result.success) return;

                          const assetName = file.name.replace(/\.[^/.]+$/, "");
                          await FirestoreService.addAsset({
                              name: assetName,
                              projectId: project.id,
                              folderId: createdFolder.id,
                              userId: currentUser.id,
                              photos: [result.url!],
                              videos: []
                          });
                      })();
                  });
                  await Promise.all(imageAssetPromises);
              }
          }
      };
  
      try {
          const items = Array.from(e.dataTransfer.items);
          const rootEntries = items.map(item => item.webkitGetAsEntry()).filter((entry): entry is FileSystemEntry => entry !== null);
          
          const processingPromises = rootEntries.map(entry => {
              if (entry.isDirectory) {
                  return processDirectoryEntry(entry as FileSystemDirectoryEntry, currentUrlFolderId);
              }
              // Ignore loose files dropped at the top level for now
              return Promise.resolve();
          });
  
          await Promise.all(processingPromises);
          toast({ title: "Drop Complete", description: "Assets and folders created successfully.", variant: 'success-yellow' });
      } catch (error) {
          console.error("Error processing drop:", error);
          toast({ title: "Drop Error", description: "Could not process the dropped folder(s).", variant: "destructive" });
      } finally {
          setIsProcessingDrop(false);
          await loadProjectData();
      }
  }, [isProcessingDrop, toast, project, currentUser, currentUrlFolderId, loadProjectData, isOnline]);

    useEffect(() => {
        const preventDefault = (e: DragEvent) => e.preventDefault();
        window.addEventListener('dragover', preventDefault);
        window.addEventListener('drop', preventDefault);
    
        return () => {
          window.removeEventListener('dragover', preventDefault);
          window.removeEventListener('drop', preventDefault);
        };
      }, []);

  const handleDownloadAsset = useCallback(async (asset: Asset) => {
    if (!asset.photos || asset.photos.length === 0) {
      toast({ title: "No Media", description: "This asset has no photos to download.", variant: "default" });
      return;
    }
    setDownloadingItemId(asset.id);
    toast({ title: "Downloading Asset", description: `Preparing to download media for "${asset.name}"...` });
    try {
      const zip = new JSZip();
      const safeAssetName = asset.name.replace(/[/\\?%*:|"<>]/g, '-') || `asset-${asset.id}`;
      const assetFolder = zip.folder(safeAssetName);
      if (!assetFolder) throw new Error("Could not create asset folder in zip.");

      const photoPromises = asset.photos.map(async (photoUrl, index) => {
        try {
          const hqUrl = photoUrl.replace(/\/upload\/.*?\//, '/upload/');
          const response = await fetch(hqUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch photo: ${hqUrl}, status: ${response.status}`);
            return;
          }
          const blob = await response.blob();
          assetFolder.file(`photo_${index + 1}.jpg`, blob);
        } catch (fetchError) {
           console.warn(`Could not download photo ${photoUrl}:`, fetchError);
        }
      });
      await Promise.all(photoPromises);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${safeAssetName}_Media.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({ title: "Download Complete", description: `Media for asset "${asset.name}" downloaded.`, variant: "success-yellow" });
    } catch(error) {
      console.error("Error downloading asset media:", error);
      toast({ title: "Download Failed", description: "An error occurred while downloading asset media.", variant: "destructive" });
    } finally {
      setDownloadingItemId(null);
    }
  }, [toast]);

  const handleDownloadFolder = useCallback(async (folder: FolderType) => {
    setDownloadingItemId(folder.id);
    toast({ title: "Downloading Folder", description: `Preparing to download media for "${folder.name}"...` });
    
    try {
      const zip = new JSZip();
      const safeFolderName = folder.name.replace(/[/\\?%*:|"<>]/g, '-') || `folder-${folder.id}`;
      const baseFolder = zip.folder(safeFolderName);
      if (!baseFolder) throw new Error("Could not create base folder in zip.");

      const assetsToProcess = allProjectAssets.filter(a => a.folderId === folder.id);

      for (const asset of assetsToProcess) {
        if (!asset.photos || asset.photos.length === 0) continue;

        const safeAssetName = asset.name.replace(/[/\\?%*:|"<>]/g, '-') || `asset-${asset.id}`;
        const assetFolder = baseFolder.folder(safeAssetName);
        if (!assetFolder) continue;

        const photoPromises = asset.photos.map(async (photoUrl, index) => {
          try {
            const hqUrl = photoUrl.replace(/\/upload\/.*?\//, '/upload/');
            const response = await fetch(hqUrl);
            if (!response.ok) return;
            const blob = await response.blob();
            assetFolder.file(`photo_${index + 1}.jpg`, blob);
          } catch (fetchError) {
            console.warn(`Could not download photo ${photoUrl}:`, fetchError);
          }
        });
        await Promise.all(photoPromises);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${safeFolderName}_Media.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({ title: "Download Complete", description: `Media for folder "${folder.name}" downloaded.`, variant: "success-yellow" });
    } catch (error) {
      console.error("Error downloading folder media:", error);
      toast({ title: "Download Failed", description: "An error occurred while downloading folder media.", variant: "destructive" });
    } finally {
      setDownloadingItemId(null);
    }
  }, [allProjectAssets, toast]);

  if (isLoading || !project) {
    return (
        <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground mt-4">
            {t('loadingProjectContext', 'Loading project context...')}</p>
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
                        className={cn(
                          'cursor-pointer hover:underline',
                          index === breadcrumbItems.length - 1 ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'
                        )}
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
        <div className="flex justify-between items-center mb-4 gap-2">
            {!isSearching && (
                <Tabs value={assetFilter} onValueChange={(value) => setAssetFilter(value as 'active' | 'completed' | 'all')}>
                    <TabsList>
                        <TabsTrigger value="active" className="text-xs sm:text-sm px-2 sm:px-3">
                           <ListFilter className="mr-1 h-3.5 w-3.5" /> {t('activeAssetsFilter', 'Active')}
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 sm:px-3">
                            <CheckCircle className="mr-1 h-3.5 w-3.5" /> {t('completedAssetsFilter', 'Completed')}
                        </TabsTrigger>
                        <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">
                           {t('all', 'All')}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}
            <div className="relative w-full max-w-sm ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('searchByNameOrSerial', 'Search by name or serial...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={isLoading || (!isOnline && !isProjectAvailableOffline)}
                />
            </div>
        </div>
        <div className="h-[calc(100%-4rem)]">
              {isSearching ? (
                  <ProjectSearchResults
                      project={project}
                      searchTerm={deferredSearchTerm}
                      onEditAsset={handleEditAsset}
                      onPreviewAsset={onPreviewAsset}
                      loadingAssetId={loadingAssetId}
                      foldersMap={foldersMap}
                      searchedAssets={searchedAssets}
                      isSearchLoading={isContentLoading}
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
                downloadingItemId={downloadingItemId}
                scrollAreaRef={scrollAreaRef}
                onSelectFolder={handleSelectFolder}
                onAddSubfolder={openNewFolderDialog}
                onEditFolder={handleOpenEditFolderModal}
                onDeleteFolder={handleDeleteFolder}
                onEditAsset={handleEditAsset}
                onDeleteAsset={handleDeleteAsset}
                onPreviewAsset={onPreviewAsset}
                onDownloadAsset={handleDownloadAsset}
                onDownloadFolder={handleDownloadFolder}
                isAdmin={isAdmin}
                isOnline={isOnline}
                loadMoreAssetsRef={loadMoreAssetsRef}
                hasMoreAssets={hasMoreAssets}
                isFetchingMoreAssets={isFetchingMoreAssets}
              />
            )}
        </div>
      </CardContent>
    </>
  );
  
  return (
    <div 
        className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-2 sm:space-y-4 pb-24"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
        {isDraggingOver && (
            <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center z-50 pointer-events-none">
                <UploadCloud className="h-24 w-24 text-primary animate-pulse" />
                <p className="mt-4 text-xl font-bold text-primary">Drop a folder to create a new asset</p>
            </div>
        )}
         {isProcessingDrop && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <p className="mt-4 text-lg font-medium text-primary">Processing dropped folder...</p>
            </div>
        )}
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
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title={isOnline ? 'You are online' : 'You are offline'}>
              {isOnline ? <Wifi /> : <WifiOff className="text-destructive" />}
            </Button>
          </h1>
        </div>
        <div>
          {isProjectAvailableOffline && isOnline && (
            <Button variant="outline" onClick={handleDownloadForOffline} disabled={isDownloading}>
               {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Re-sync Offline Data
            </Button>
          )}
           {isProjectAvailableOffline && !isOnline && (
            <div className="flex items-center gap-2 text-sm text-green-600 border border-green-200 bg-green-50 rounded-md px-3 py-2">
              <CheckCircle className="h-4 w-4" />
              <span>Available Offline</span>
            </div>
          )}
          {!isProjectAvailableOffline && isOnline && (
            <Button variant="secondary" onClick={handleDownloadForOffline} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download for Offline
            </Button>
          )}
        </div>
      </div>
      
      <Card>
        {mainContent}
      </Card>
      
      <div className="fixed bottom-0 inset-x-0 p-4 bg-background/80 backdrop-blur-sm border-t z-40">
        <div className="container mx-auto flex justify-center items-center gap-2 flex-wrap">
            <Button 
                variant="default" 
                size="lg" 
                onClick={() => openNewFolderDialog(selectedFolder)} 
                title={selectedFolder ? t('addNewFolder', 'New Folder') : t('addRootFolderTitle', 'Add Folder to Project Root')}
                className="shadow-lg"
                disabled={!isOnline && !isProjectAvailableOffline}
            >
                {t('addNewFolder', 'New Folder')}
            </Button>
            <Button
                onClick={() => {
                    setPreloadedAssetData(null);
                    setIsNewAssetModalOpen(true);
                }}
                className="shadow-lg"
                size="lg"
                title={t('newAsset', 'New Asset')}
                disabled={!isOnline && !isProjectAvailableOffline}
            >
                {t('newAsset', 'New Asset')}
            </Button>
             {isAdmin && (
              <Button variant="outline" size="lg" onClick={() => setIsImportModalOpen(true)}  className="shadow-lg" disabled={true}>
                {t('importAssetsButton', 'Import Assets')}
              </Button> 
            )}
            {clipboardState.itemId && (
              <Button variant="secondary" size="lg" onClick={handlePaste} className="shadow-lg" disabled={isPasting}>
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
          onClose={() => {
              setIsNewAssetModalOpen(false);
              setPreloadedAssetData(null);
          }}
          project={project}
          parentFolder={selectedFolder}
          onAssetCreated={handleAssetCreatedInModal}
          preloadedData={preloadedAssetData}
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
