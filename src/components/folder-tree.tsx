
"use client";
import type { Folder, Asset } from '@/data/mock-data';
import { Folder as FolderIcon, MoreVertical, FolderPlus, Edit3, Trash2, Eye, FileArchive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language-context';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import React, { useCallback, useMemo, useRef, useEffect } from 'react'; 
import { AssetCard } from '@/components/asset-card';
import { FolderGridCard } from '@/components/folder-grid-card';
import { ScrollArea } from '@/components/ui/scroll-area';


interface FolderDisplayCardProps {
  folder: Folder;
  onSelectFolder: (folder: Folder) => void;
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onActualDeleteFolder: (e: React.MouseEvent, folder: Folder) => void;
  t: (key: string, defaultText: string, params?: Record<string, string | number>) => string;
  assetCount?: number;
}

const FolderDisplayCard = React.memo(function FolderDisplayCard({
  folder,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onActualDeleteFolder,
  t,
  assetCount
}: FolderDisplayCardProps) {
  return (
    <Card 
      className="group flex flex-row items-center justify-between p-3 hover:shadow-md transition-shadow cursor-pointer w-full border-b last:border-b-0 rounded-none first:rounded-t-md last:rounded-b-md"
      onClick={() => onSelectFolder(folder)}
      title={folder.name}
    >
      <div className="flex items-center gap-3 flex-grow min-w-0">
        <FolderIcon className="h-6 w-6 text-primary shrink-0" />
        <div className="flex-grow min-w-0">
            <CardTitle className="text-sm sm:text-base font-medium truncate">
            {folder.name}
            </CardTitle>
            {assetCount !== undefined && (
                <p className="text-xs text-muted-foreground">{t('totalAssets', '{count} Assets', { count: assetCount })}</p>
            )}
        </div>
      </div>
      
      <div className="shrink-0 ml-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()} 
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">{t('folderActions', 'Folder actions')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onSelectFolder(folder)}>
              <Eye className="mr-2 h-4 w-4" />
              {t('openFolder', 'Open Folder')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddSubfolder(folder)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              {t('addSubfolderToCurrent', 'Add subfolder here')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditFolder(folder)}>
              <Edit3 className="mr-2 h-4 w-4" />
              {t('editFolder', 'Edit folder')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => onActualDeleteFolder(e, folder)}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('deleteFolder', 'Delete folder')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
});

interface FolderTreeDisplayProps {
  foldersToDisplay: Folder[];
  assetsToDisplay: Asset[];
  allProjectAssets?: Asset[];
  projectId: string;
  onSelectFolder: (folder: Folder) => void; 
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: () => void; 
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void; 
  onPreviewAsset: (asset: Asset) => void;
  currentSelectedFolderId: string | null;
  displayMode?: 'grid' | 'list';
  deletingAssetId?: string | null;
  loadingAssetId?: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  scrollAreaRef?: React.RefObject<HTMLDivElement>;
}

export function FolderTreeDisplay({ 
  foldersToDisplay,
  assetsToDisplay,
  allProjectAssets,
  projectId,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onDeleteFolder,
  onEditAsset,
  onDeleteAsset,
  onPreviewAsset,
  currentSelectedFolderId,
  displayMode = 'list',
  deletingAssetId,
  loadingAssetId,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  scrollAreaRef,
}: FolderTreeDisplayProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore) return;

    const observer = new IntersectionObserver(
        (entries) => {
            const firstEntry = entries[0];
            if (firstEntry.isIntersecting && hasMore && !isLoadingMore) {
                onLoadMore();
            }
        },
        { root: scrollAreaRef?.current, threshold: 1.0 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
        observer.observe(currentLoader);
    }

    return () => {
        if (currentLoader) {
            observer.unobserve(currentLoader);
        }
    };
  }, [hasMore, isLoadingMore, onLoadMore, scrollAreaRef]);

  const assetCountsByFolder = useMemo(() => {
    if (!allProjectAssets) return new Map<string, number>();
    return allProjectAssets.reduce((acc, asset) => {
        if (asset.folderId) {
            acc.set(asset.folderId, (acc.get(asset.folderId) || 0) + 1);
        }
        return acc;
    }, new Map<string, number>());
  }, [allProjectAssets]);

  const handleDeleteClick = useCallback(async (e: React.MouseEvent, currentFolder: Folder) => {
    e.stopPropagation();
    const childFolders = await FirestoreService.getFolders(currentFolder.projectId);
    const hasChildFolders = childFolders.some(f => f.parentId === currentFolder.id);
    const childAssets = await FirestoreService.getAssets(currentFolder.projectId, currentFolder.id);
    const hasChildAssets = childAssets.length > 0;

    if (hasChildFolders || hasChildAssets) {
      toast({
        title: t('folderNotEmptyTitle', 'Folder Not Empty'),
        description: t('folderNotEmptyDesc', 'Cannot delete folder. Please delete all subfolders and assets first.'),
        variant: 'destructive',
      });
      return;
    }

    if (window.confirm(t('deleteFolderConfirmation', `Are you sure you want to delete "${currentFolder.name}"? This action cannot be undone.`, { folderName: currentFolder.name }))) {
      const success = await FirestoreService.deleteFolderCascade(currentFolder.id);
      if (success) {
        onDeleteFolder(); 
        toast({
          title: t('folderDeletedTitle', 'Folder Deleted'),
          description: t('folderDeletedDesc', `Folder "${currentFolder.name}" has been deleted.`, { folderName: currentFolder.name }),
        });
      } else {
         toast({ title: "Error", description: "Failed to delete folder.", variant: "destructive" });
      }
    }
  }, [toast, t, onDeleteFolder]); 
  
  const combinedItems = useMemo(() => [
    ...foldersToDisplay.map(f => ({ type: 'folder' as const, data: f })),
    ...assetsToDisplay.map(a => ({ type: 'asset' as const, data: a })),
  ], [foldersToDisplay, assetsToDisplay]);

  const infiniteScrollTrigger = (
     <div ref={loaderRef} className="h-14 mt-4 flex items-center justify-center col-span-full">
        {isLoadingMore ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
            !hasMore && assetsToDisplay.length > 0 && <p className="text-sm text-muted-foreground">{t('noMoreAssets', 'End of list.')}</p>
        )}
    </div>
  );

  if (displayMode === 'grid') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {combinedItems.map(item => {
            if (item.type === 'folder') {
              return (
                <FolderGridCard
                  key={`item-folder-${item.data.id}`}
                  folder={item.data}
                  assetCount={assetCountsByFolder.get(item.data.id)}
                  onSelectFolder={onSelectFolder}
                  onAddSubfolder={onAddSubfolder}
                  onEditFolder={onEditFolder}
                  onActualDeleteFolder={handleDeleteClick}
                  t={t}
                />
              );
            }
            if (item.type === 'asset') {
              return (
                <AssetCard
                  key={`item-asset-${item.data.id}`}
                  asset={item.data}
                  onEditAsset={onEditAsset}
                  onDeleteAsset={onDeleteAsset}
                  onPreviewAsset={onPreviewAsset}
                  displayMode="grid"
                  isDeleting={deletingAssetId === item.data.id}
                  isLoading={loadingAssetId === item.data.id}
                />
              );
            }
            return null;
          })}
        </div>
        {onLoadMore && infiniteScrollTrigger}
      </div>
    );
  }

  // --- LIST MODE LOGIC ---
  if (foldersToDisplay.length === 0 && assetsToDisplay.length === 0) {
    return null; 
  }

  const folderList = (
    <div className="flex flex-col border rounded-md">
      {foldersToDisplay.map(folder => (
        <FolderDisplayCard
          key={`folder-card-${folder.id}`}
          folder={folder}
          assetCount={assetCountsByFolder.get(folder.id)}
          onSelectFolder={onSelectFolder}
          onAddSubfolder={onAddSubfolder}
          onEditFolder={onEditFolder}
          onActualDeleteFolder={handleDeleteClick}
          t={t}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {foldersToDisplay.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground/90 flex items-center">
            <FolderIcon className="mr-2 h-5 w-5 text-primary" />
            {t('folders', 'Folders')}
          </h3>
          {folderList}
        </div>
      )}
      {assetsToDisplay.length > 0 && (
        <div className={foldersToDisplay.length > 0 ? "mt-6" : ""}>
          <h3 className="text-lg font-semibold mb-3 text-foreground/90 flex items-center">
            <FileArchive className="mr-2 h-5 w-5 text-accent" />
            {t('assets', 'Assets')}
          </h3>
          <div className="flex flex-col border rounded-md">
            {assetsToDisplay.map(asset => (
              <AssetCard
                key={`asset-${asset.id}`}
                asset={asset}
                onEditAsset={onEditAsset}
                onDeleteAsset={onDeleteAsset}
                onPreviewAsset={onPreviewAsset}
                displayMode="list"
                isDeleting={deletingAssetId === asset.id}
                isLoading={loadingAssetId === asset.id}
              />
            ))}
          </div>
        </div>
      )}
       {onLoadMore && infiniteScrollTrigger}
    </div>
  );
}
