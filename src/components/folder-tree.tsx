
"use client";
import type { Folder, Asset } from '@/data/mock-data';
import { Folder as FolderIcon, MoreVertical, FolderPlus, Edit3, Trash2, Eye, FileArchive } from 'lucide-react';
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
import React, { useCallback } from 'react'; // Import useCallback
import { AssetCard } from '@/components/asset-card';

interface FolderDisplayCardProps {
  folder: Folder;
  onSelectFolder: (folder: Folder) => void;
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onActualDeleteFolder: (e: React.MouseEvent, folder: Folder) => void;
  t: (key: string, defaultText: string, params?: Record<string, string | number>) => string;
}

const FolderDisplayCard = React.memo(function FolderDisplayCard({
  folder,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onActualDeleteFolder,
  t
}: FolderDisplayCardProps) {
  return (
    <Card 
      key={`folder-${folder.id}`} 
      className="group flex flex-row items-center justify-between p-3 hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={() => onSelectFolder(folder)}
      title={folder.name}
    >
      <div className="flex items-center gap-3 flex-grow min-w-0">
        <FolderIcon className="h-10 w-10 text-primary shrink-0" />
        <CardTitle className="text-sm sm:text-base font-medium truncate">
          {folder.name}
        </CardTitle>
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 shrink-0">
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

interface FolderGridViewProps {
  foldersToDisplay: Folder[];
  assetsToDisplay: Asset[];
  projectId: string;
  onSelectFolder: (folder: Folder) => void; 
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void; 
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void; 
  onPreviewImageAsset: (imageUrl: string) => void;
  currentSelectedFolderId: string | null;
}

export function FolderTreeDisplay({ 
  foldersToDisplay,
  assetsToDisplay,
  projectId,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onDeleteFolder,
  onEditAsset,
  onDeleteAsset,
  onPreviewImageAsset,
  currentSelectedFolderId,
}: FolderGridViewProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

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
        onDeleteFolder(currentFolder); 
        toast({
          title: t('folderDeletedTitle', 'Folder Deleted'),
          description: t('folderDeletedDesc', `Folder "${currentFolder.name}" has been deleted.`, { folderName: currentFolder.name }),
        });
      } else {
         toast({ title: "Error", description: "Failed to delete folder.", variant: "destructive" });
      }
    }
  }, [toast, t, onDeleteFolder]); 
  
  const handleDeleteAssetClick = async (asset: Asset) => {
    onDeleteAsset(asset);
  };

  if (foldersToDisplay.length === 0 && assetsToDisplay.length === 0) {
    return null; 
  }

  return (
    <div className="space-y-4">
      {foldersToDisplay.length > 0 && (
        <div className="space-y-3">
          {foldersToDisplay.map(folder => (
            <FolderDisplayCard
              key={`folder-card-${folder.id}`}
              folder={folder}
              onSelectFolder={onSelectFolder}
              onAddSubfolder={onAddSubfolder}
              onEditFolder={onEditFolder}
              onActualDeleteFolder={handleDeleteClick}
              t={t}
            />
          ))}
        </div>
      )}
      {assetsToDisplay.length > 0 && (
        <div className="space-y-4">
          {assetsToDisplay.map(asset => (
            <AssetCard
              key={`asset-${asset.id}`}
              asset={asset}
              onEditAsset={() => onEditAsset(asset)}
              onDeleteAsset={() => handleDeleteAssetClick(asset)}
              onPreviewImage={onPreviewImageAsset}
            />
          ))}
        </div>
      )}
    </div>
  );
}
