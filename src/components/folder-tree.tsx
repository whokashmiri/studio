
"use client";
import type { Folder, Asset } from '@/data/mock-data'; // Added Asset type
import { Folder as FolderIcon, MoreVertical, FolderPlus, Edit3, Trash2, Eye, FileArchive } from 'lucide-react'; // Added FileArchive for generic empty
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardTitle } from '@/components/ui/card'; // Removed CardContent, CardFooter, CardHeader as they are not directly used by folder cards
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language-context';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { AssetCard } from '@/components/asset-card'; // Import AssetCard

interface FolderGridViewProps {
  foldersToDisplay: Folder[];
  assetsToDisplay: Asset[]; // New prop for assets
  projectId: string;
  onSelectFolder: (folder: Folder) => void; 
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onEditAsset: (asset: Asset) => void; // New prop
  onDeleteAsset: (asset: Asset) => void; // New prop
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
  currentSelectedFolderId,
}: FolderGridViewProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleDeleteClick = (e: React.MouseEvent, currentFolder: Folder) => {
    e.stopPropagation();
    const childFolders = LocalStorageService.getFolders().filter(f => f.parentId === currentFolder.id);
    const childAssets = LocalStorageService.getAssets().filter(a => a.folderId === currentFolder.id);

    if (childFolders.length > 0 || childAssets.length > 0) {
      toast({
        title: t('folderNotEmptyTitle', 'Folder Not Empty'),
        description: t('folderNotEmptyDesc', 'Cannot delete folder. Please delete all subfolders and assets first.'),
        variant: 'destructive',
      });
      return;
    }

    if (window.confirm(t('deleteFolderConfirmation', `Are you sure you want to delete "${currentFolder.name}"? This action cannot be undone.`, { folderName: currentFolder.name }))) {
      LocalStorageService.deleteFolderCascade(currentFolder.id); // Assuming this also handles assets within
      onDeleteFolder(currentFolder);
      toast({
        title: t('folderDeletedTitle', 'Folder Deleted'),
        description: t('folderDeletedDesc', `Folder "${currentFolder.name}" has been deleted.`, { folderName: currentFolder.name }),
      });
    }
  };

  if (foldersToDisplay.length === 0 && assetsToDisplay.length === 0) {
    // This specific empty message is now handled by the parent ProjectPage for more context
    // It can be removed if ProjectPage covers all empty states, or kept for a very specific "no items at all here" message.
    // For now, let ProjectPage handle the contextual empty messages.
    return null; 
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {foldersToDisplay.map(folder => (
        <Card 
          key={`folder-${folder.id}`} 
          className="group flex flex-col items-center justify-center text-center p-4 hover:shadow-md transition-shadow cursor-pointer relative aspect-square"
          onClick={() => onSelectFolder(folder)}
          title={folder.name}
        >
          <FolderIcon className="h-16 w-16 sm:h-20 sm:w-20 text-primary mb-2" />
          <CardTitle className="text-xs sm:text-sm font-medium truncate w-full">
            {folder.name}
          </CardTitle>
          
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
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
                  onClick={(e) => handleDeleteClick(e, folder)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('deleteFolder', 'Delete folder')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
      {assetsToDisplay.map(asset => (
        <AssetCard
          key={`asset-${asset.id}`}
          asset={asset}
          onEditAsset={() => onEditAsset(asset)}
          onDeleteAsset={() => onDeleteAsset(asset)}
        />
      ))}
    </div>
  );
}

    