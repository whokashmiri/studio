
"use client";
import type { Folder, Asset } from '@/data/mock-data';
import { Folder as FolderIcon, MoreVertical, FolderPlus, Edit3, Trash2, Eye, FileArchive, Loader2, Copy, Scissors } from 'lucide-react';
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
import { useClipboard } from '@/contexts/clipboard-context';
import { useToast } from '@/hooks/use-toast';
import React, { useCallback, useMemo } from 'react'; 
import { AssetCard } from '@/components/asset-card';
import { FolderGridCard } from '@/components/folder-grid-card';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface FolderTreeDisplayProps {
  foldersToDisplay: Folder[];
  assetsToDisplay: Asset[];
  allProjectAssets?: Asset[];
  projectId: string;
  onSelectFolder: (folder: Folder) => void; 
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void; 
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void; 
  onPreviewAsset: (asset: Asset) => void;
  currentSelectedFolderId: string | null;
  displayMode?: 'grid' | 'list';
  deletingItemId?: string | null;
  loadingAssetId?: string | null;
  loadingFolderId?: string | null;
  isAdmin: boolean;
  isOnline: boolean;
}

const DraggableAsset = ({ asset, children, isAdmin, isOnline }: { asset: Asset; children: React.ReactNode, isAdmin: boolean, isOnline: boolean }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: asset.id,
      data: { type: 'asset', item: asset },
      disabled: !isAdmin || asset.isOffline || !isOnline,
    });
  
    if (!isAdmin) return <>{children}</>;
  
    return (
      <div ref={setNodeRef} style={{ opacity: isDragging ? 0.4 : 1 }} {...listeners} {...attributes}>
        {children}
      </div>
    );
};
  
const DraggableAndDroppableFolder = ({ folder, children, isAdmin, isOnline }: { folder: Folder, children: React.ReactNode, isAdmin: boolean, isOnline: boolean }) => {
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: folder.id,
        data: { type: 'folder', item: folder },
        disabled: !isAdmin || folder.isOffline || !isOnline,
    });

    const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
        id: folder.id,
        data: { type: 'folder', item: folder },
        disabled: !isAdmin || folder.isOffline || !isOnline,
    });

    if (!isAdmin) return <>{children}</>;

    const setCombinedRef = (node: HTMLElement | null) => {
        setDraggableRef(node);
        setDroppableRef(node);
    };

    return (
        <div ref={setCombinedRef} style={{ opacity: isDragging ? 0.4 : 1 }} className={cn(isOver && !isDragging && 'outline outline-2 outline-offset-2 outline-primary rounded-lg transition-all duration-100')}>
            <div {...listeners} {...attributes}>
                {children}
            </div>
        </div>
    );
};


export function FolderTreeDisplay({ 
  foldersToDisplay,
  assetsToDisplay,
  allProjectAssets,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onDeleteFolder,
  onEditAsset,
  onDeleteAsset,
  onPreviewAsset,
  displayMode = 'grid',
  deletingItemId,
  loadingAssetId,
  loadingFolderId,
  isAdmin,
  isOnline,
}: FolderTreeDisplayProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const assetCountsByFolder = useMemo(() => {
    if (!allProjectAssets) return new Map<string, number>();
    return allProjectAssets.reduce((acc, asset) => {
        if (asset.folderId) {
            acc.set(asset.folderId, (acc.get(asset.folderId) || 0) + 1);
        }
        return acc;
    }, new Map<string, number>());
  }, [allProjectAssets]);

  const handleDeleteFolderClick = useCallback((e: React.MouseEvent, folder: Folder) => {
      e.stopPropagation();
      onDeleteFolder(folder);
  }, [onDeleteFolder]);
  
  const combinedItems = useMemo(() => [
    ...foldersToDisplay.map(f => ({ type: 'folder' as const, data: f })),
    ...assetsToDisplay.map(a => ({ type: 'asset' as const, data: a })),
  ], [foldersToDisplay, assetsToDisplay]);

  if (displayMode === 'grid') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {combinedItems.map(item => {
            if (item.type === 'folder') {
                const folderCard = (
                    <FolderGridCard
                        folder={item.data}
                        assetCount={assetCountsByFolder.get(item.data.id)}
                        onSelectFolder={onSelectFolder}
                        onAddSubfolder={onAddSubfolder}
                        onEditFolder={onEditFolder}
                        onActualDeleteFolder={handleDeleteFolderClick}
                        t={t}
                        isOnline={isOnline}
                        isLoading={loadingFolderId === item.data.id}
                    />
                );
                return (
                    <DraggableAndDroppableFolder key={`folder-${item.data.id}`} folder={item.data} isAdmin={isAdmin} isOnline={isOnline}>
                        {folderCard}
                    </DraggableAndDroppableFolder>
                );
            }
            if (item.type === 'asset') {
                const assetCard = (
                    <AssetCard
                        asset={item.data}
                        onEditAsset={onEditAsset}
                        onDeleteAsset={onDeleteAsset}
                        onPreviewAsset={onPreviewAsset}
                        displayMode="grid"
                        isDeleting={deletingItemId === item.data.id}
                        isLoading={loadingAssetId === item.data.id}
                        isOnline={isOnline}
                    />
                );
                return (
                    <DraggableAsset key={`dnd-asset-${item.data.id}`} asset={item.data} isAdmin={isAdmin} isOnline={isOnline}>
                        {assetCard}
                    </DraggableAsset>
                );
            }
            return null;
          })}
        </div>
      </div>
    );
  }

  // --- LIST MODE IS NOT CURRENTLY USED BUT LEFT FOR POTENTIAL FUTURE USE ---
  return null; 
}
