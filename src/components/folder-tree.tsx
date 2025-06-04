
"use client";
import type { Folder } from '@/data/mock-data';
import { Folder as FolderIcon, MoreVertical, FolderPlus, Edit3, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language-context';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

interface FolderGridViewProps {
  foldersToDisplay: Folder[];
  projectId: string;
  onSelectFolder: (folder: Folder) => void; // To navigate into a folder
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  currentSelectedFolderId: string | null;
}

export function FolderTreeDisplay({ // Conceptually a GridView now
  foldersToDisplay,
  projectId,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onDeleteFolder,
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

    // Using window.confirm for simplicity; a custom dialog would be better for UX.
    if (window.confirm(t('deleteFolderConfirmation', `Are you sure you want to delete "${currentFolder.name}"? This action cannot be undone.`, { folderName: currentFolder.name }))) {
      LocalStorageService.deleteFolderCascade(currentFolder.id);
      onDeleteFolder(currentFolder);
      toast({
        title: t('folderDeletedTitle', 'Folder Deleted'),
        description: t('folderDeletedDesc', `Folder "${currentFolder.name}" has been deleted.`, { folderName: currentFolder.name }),
      });
    }
  };

  if (foldersToDisplay.length === 0) {
    return (
      <div className="py-12 text-center">
        <FolderIcon className="mx-auto h-24 w-24 text-muted-foreground/30" />
        <p className="mt-4 text-muted-foreground">
          {currentSelectedFolderId ? t('folderIsEmpty', 'This folder is empty.') : t('noFoldersInProjectStart', 'This project has no folders yet.')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {foldersToDisplay.map(folder => (
        <Card 
          key={folder.id} 
          className="group flex flex-col items-center justify-center text-center p-4 hover:shadow-md transition-shadow cursor-pointer relative aspect-square" // Added aspect-square for more "drive-like" items
          onClick={() => onSelectFolder(folder)}
          title={folder.name}
        >
          <FolderIcon className="h-16 w-16 sm:h-20 sm:w-20 text-primary mb-2" /> {/* Made icon slightly responsive */}
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
    </div>
  );
}
