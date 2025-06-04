
"use client";
import type { Folder } from '@/data/mock-data';
import { Folder as FolderIcon, MoreVertical, Edit3, FolderPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language-context';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';

interface FolderGridProps {
  foldersToDisplay: Folder[];
  onSelectFolder: (folder: Folder) => void;
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void; // Added for completeness, though not explicitly requested for this step
  projectId: string;
}

export function FolderGrid({
  foldersToDisplay,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onDeleteFolder, // Placeholder for now
  projectId,
}: FolderGridProps) {
  const { t } = useLanguage();
  const { toast } = useToast();


  // Basic delete handler, can be expanded with confirmation dialog
  const handleDeleteClick = (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation(); // Prevent card click
     // Basic confirmation, ideally use an AlertDialog
    if (confirm(t('deleteFolderConfirmation', `Are you sure you want to delete "${folder.name}" and all its contents? This action cannot be undone.`, { folderName: folder.name }))) {
      // Check if folder has children folders or assets
      const childFolders = LocalStorageService.getFolders().filter(f => f.parentId === folder.id);
      const childAssets = LocalStorageService.getAssets().filter(a => a.folderId === folder.id);

      if (childFolders.length > 0 || childAssets.length > 0) {
        toast({
          title: t('folderNotEmptyTitle', 'Folder Not Empty'),
          description: t('folderNotEmptyDesc', 'Cannot delete folder. Please delete all subfolders and assets first.'),
          variant: 'destructive',
        });
        return;
      }
      
      LocalStorageService.deleteFolder(folder.id); // Assumes deleteFolder exists in service
      onDeleteFolder(folder); // Callback to update parent state
      toast({
        title: t('folderDeletedTitle', 'Folder Deleted'),
        description: t('folderDeletedDesc', `Folder "${folder.name}" has been deleted.`, { folderName: folder.name }),
      });
    }
  };


  if (foldersToDisplay.length === 0) {
    return (
      <div className="py-8 text-center">
        <FolderIcon className="mx-auto h-16 w-16 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          {t('noFoldersInCurrentView', 'This folder is empty.')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('useButtonToAddSubfolderPrompt', 'You can add a subfolder using the button above or the context menu on a parent folder.')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {foldersToDisplay.map((folder) => (
        <Card
          key={folder.id}
          className="hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => onSelectFolder(folder)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <div className="flex items-center truncate">
              <FolderIcon className="h-10 w-10 mr-3 text-primary flex-shrink-0" />
              <CardTitle className="text-lg font-medium truncate" title={folder.name}>
                {folder.name}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-50 group-hover:opacity-100 focus:opacity-100"
                  onClick={(e) => e.stopPropagation()} // Prevent card click
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">{t('folderActions', 'Folder actions')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectFolder(folder); }}>
                  {t('openFolder', 'Open')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddSubfolder(folder); }}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  {t('addSubfolderToCurrent', 'Add subfolder here')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditFolder(folder); }}>
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
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {/* Can add more details here like item count or last modified later */}
            <p className="text-xs text-muted-foreground">
              {/* Placeholder for sub-item count or other info */}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
