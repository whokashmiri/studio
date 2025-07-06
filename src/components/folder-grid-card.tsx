
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
import { Folder as FolderIcon, MoreVertical, FolderPlus, Edit3, Trash2, Eye, CloudOff } from 'lucide-react';
import type { Folder } from '@/data/mock-data';
import { cn } from '@/lib/utils';

interface FolderGridCardProps {
  folder: Folder;
  onSelectFolder: (folder: Folder) => void;
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onActualDeleteFolder: (e: React.MouseEvent, folder: Folder) => void;
  t: (key: string, defaultText: string, params?: Record<string, string | number>) => string;
}

export const FolderGridCard = React.memo(function FolderGridCard({
  folder,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onActualDeleteFolder,
  t,
}: FolderGridCardProps) {
  
  const isOffline = !!folder.isOffline;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectFolder(folder);
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg hover:shadow-lg transition-shadow duration-200 bg-card/50 p-1",
        isOffline ? "cursor-wait" : "cursor-pointer"
      )}
      onClick={handleCardClick}
      title={folder.name}
    >
       {isOffline && (
          <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-background/60 rounded-full">
            <CloudOff className="h-4 w-4 text-muted-foreground" title="Saved locally, pending sync"/>
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
              disabled={isOffline}
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

      <div className="relative flex-grow flex items-center justify-center w-full aspect-square bg-muted/30 group-hover:bg-muted/50 transition-colors rounded-md">
        <FolderIcon className="h-16 w-16 text-primary transition-transform group-hover:scale-110" />
      </div>

      <div className="pt-0.5 text-center">
        <CardTitle className="text-sm font-medium w-full break-words">
            {folder.name}
        </CardTitle>
      </div>
    </Card>
  )
});
