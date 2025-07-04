
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
import React, { useCallback, useMemo } from 'react'; 
import { AssetCard } from '@/components/asset-card';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
      className="group flex flex-row items-center justify-between p-3 hover:shadow-md transition-shadow cursor-pointer w-full border-b last:border-b-0 rounded-none first:rounded-t-md last:rounded-b-md"
      onClick={() => onSelectFolder(folder)}
      title={folder.name}
    >
      <div className="flex items-center gap-3 flex-grow min-w-0">
        <FolderIcon className="h-6 w-6 text-primary shrink-0" />
        <CardTitle className="text-sm sm:text-base font-medium truncate">
          {folder.name}
        </CardTitle>
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

interface FolderGridCardProps {
  folder: Folder;
  onSelectFolder?: (folder: Folder) => void;
  onAddSubfolder?: (parentFolder: Folder) => void;
  onEditFolder?: (folder: Folder) => void;
  onActualDeleteFolder?: (e: React.MouseEvent, folder: Folder) => void;
  t: (key: string, defaultText: string, params?: Record<string, string | number>) => string;
  isOverlay?: boolean;
  isOver?: boolean;
}

export const FolderGridCard = React.memo(function FolderGridCard({
  folder,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onActualDeleteFolder,
  t,
  isOverlay = false,
  isOver = false
}: FolderGridCardProps) {
  
  const handleCardClick = (e: React.MouseEvent) => {
    if (isOverlay) return;
    e.stopPropagation();
    onSelectFolder?.(folder);
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col items-center justify-center p-4 hover:shadow-lg transition-shadow duration-200 aspect-square border-0 shadow-none",
        isOverlay ? "shadow-xl bg-background" : "cursor-pointer",
        isOver && !isOverlay && "outline outline-2 outline-primary outline-dashed"
      )}
      onClick={handleCardClick}
      title={folder.name}
    >
      {!isOverlay && onAddSubfolder && onEditFolder && onActualDeleteFolder && (
        <div className="absolute top-1 right-1 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('folderActions', 'Folder actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {onSelectFolder && <DropdownMenuItem onClick={() => onSelectFolder(folder)}>
                <Eye className="mr-2 h-4 w-4" />
                {t('openFolder', 'Open Folder')}
              </DropdownMenuItem>}
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
      )}

      <div className="flex flex-col items-center justify-center text-center flex-grow pointer-events-none">
          <FolderIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary mb-2 transition-transform group-hover:scale-110" />
          <CardTitle className="text-sm font-medium w-full break-words">
            {folder.name}
          </CardTitle>
      </div>
    </Card>
  )
});

function SortableFolderItem({ folder, isDraggable, overId, children }: { folder: Folder, isDraggable: boolean, overId: string | null, children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: folder.id,
    data: {
      type: 'folder',
      folder: folder,
    },
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}


interface FolderTreeDisplayProps {
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
  displayMode?: 'grid' | 'list';
  isDraggable?: boolean;
  activeDragId?: string | null;
  overId?: string | null;
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
  displayMode = 'list',
  isDraggable = false,
  activeDragId,
  overId,
}: FolderTreeDisplayProps) {
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

  const folderIds = useMemo(() => foldersToDisplay.map(f => f.id), [foldersToDisplay]);


  if (foldersToDisplay.length === 0 && assetsToDisplay.length === 0) {
    return null; 
  }

  const folderGrid = (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-4">
      {foldersToDisplay.map(folder => (
        <SortableFolderItem key={folder.id} folder={folder} isDraggable={isDraggable} overId={overId}>
          <div style={{ visibility: activeDragId === folder.id ? 'hidden' : 'visible' }}>
            <FolderGridCard
              folder={folder}
              onSelectFolder={onSelectFolder}
              onAddSubfolder={onAddSubfolder}
              onEditFolder={onEditFolder}
              onActualDeleteFolder={handleDeleteClick}
              t={t}
              isOver={overId === folder.id}
            />
          </div>
        </SortableFolderItem>
      ))}
    </div>
  );

  const folderList = (
    <div className="flex flex-col border rounded-md">
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
  );

  return (
    <SortableContext items={folderIds} strategy={rectSortingStrategy} disabled={!isDraggable}>
      <div className="space-y-6">
        {foldersToDisplay.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground/90 flex items-center">
              <FolderIcon className="mr-2 h-5 w-5 text-primary" />
              {t('folders', 'Folders')} ({foldersToDisplay.length})
            </h3>
            {displayMode === 'grid' ? folderGrid : folderList}
          </div>
        )}
        {assetsToDisplay.length > 0 && (
          <div className={foldersToDisplay.length > 0 ? "mt-6" : ""}>
            <h3 className="text-lg font-semibold mb-3 text-foreground/90 flex items-center">
              <FileArchive className="mr-2 h-5 w-5 text-accent" />
              {t('assets', 'Assets')} ({assetsToDisplay.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
          </div>
        )}
      </div>
    </SortableContext>
  );
}
