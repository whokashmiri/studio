
"use client";
import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder as FolderIcon, MoreVertical, FolderPlus, Edit3, Trash2, Eye, CloudOff, Edit2, Copy, Scissors, Loader2, HardDriveDownload } from 'lucide-react';
import type { Folder } from '@/data/mock-data';
import { cn } from '@/lib/utils';
import { useClipboard } from '@/contexts/clipboard-context';
import { useAuth } from '@/contexts/auth-context';

interface FolderGridCardProps {
  folder: Folder;
  onSelectFolder: (folder: Folder) => void;
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onActualDeleteFolder: (e: React.MouseEvent, folder: Folder) => void;
  onDownloadFolder: (folder: Folder) => void;
  t: (key: string, defaultText: string, params?: Record<string, string | number>) => string;
  assetCount?: number;
  isOnline?: boolean;
  isLoading?: boolean;
  isDownloading?: boolean;
}

export const FolderGridCard = React.memo(function FolderGridCard({
  folder,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onActualDeleteFolder,
  onDownloadFolder,
  t,
  assetCount,
  isOnline = true,
  isLoading = false,
  isDownloading = false,
}: FolderGridCardProps) {
  
  const { currentUser } = useAuth();
  const { setClipboard, isItemCut } = useClipboard();
  const isAdmin = currentUser?.role === 'Admin';
  
  const isOffline = !!folder.isOffline;
  const isOfflineUpdate = !!folder.isOfflineUpdate;
  const isCut = isItemCut(folder.id);
  const cardIsDisabled = isOffline || isLoading || isDownloading;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardIsDisabled) return;
    onSelectFolder(folder);
  };
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClipboard({ itemId: folder.id, itemType: 'folder', operation: 'copy', sourceProjectId: folder.projectId });
  };
  
  const handleCut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClipboard({ itemId: folder.id, itemType: 'folder', operation: 'cut', sourceProjectId: folder.projectId });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownloadFolder(folder);
  }

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg hover:shadow-lg transition-shadow duration-200 bg-card/50 p-1",
        cardIsDisabled ? "cursor-wait" : "cursor-pointer",
        isCut && "opacity-60"
      )}
      onClick={handleCardClick}
      title={folder.name}
    >
       {(isLoading || isDownloading) && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
       )}
       <div className={cn("flex flex-col flex-grow", cardIsDisabled && "opacity-50 pointer-events-none")}>
        {(isOffline || isOfflineUpdate) && (
            <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-background/60 rounded-full flex items-center gap-1">
              {isOffline && <CloudOff className="h-4 w-4 text-muted-foreground" title="Saved locally, pending sync"/>}
              {isOfflineUpdate && !isOffline && <Edit2 className="h-4 w-4 text-accent" title="Changes pending sync"/>}
            </div>
          )}
        <div className="absolute top-1 right-1 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100"
                onClick={(e) => e.stopPropagation()}
                disabled={cardIsDisabled}
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
              {isAdmin && isOnline && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCopy}>
                      <Copy className="mr-2 h-4 w-4" />
                      {t('copy', 'Copy')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCut}>
                      <Scissors className="mr-2 h-4 w-4" />
                      {t('cut', 'Cut')}
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={handleDownload}>
                        <HardDriveDownload className="mr-2 h-4 w-4" />
                        {t('downloadProject', 'Download')}
                    </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => onActualDeleteFolder(e, folder)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                disabled={!isOnline}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteFolder', 'Delete folder')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative flex-grow flex items-center justify-center w-full aspect-square bg-muted/30 group-hover:bg-muted/50 transition-colors rounded-md">
          <FolderIcon className="h-16 w-16 text-primary transition-transform group-hover:scale-110" />
        </div>

        <div className="pt-0.5 text-center">
          <CardTitle className="text-sm font-medium w-full break-words">
              {folder.name}
          </CardTitle>
          {assetCount !== undefined && (
              <p className="text-xs text-muted-foreground">{t('totalAssets', '{count} Assets', { count: assetCount })}</p>
          )}
        </div>
      </div>
    </Card>
  )
});

    