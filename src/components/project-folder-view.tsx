
"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Project, Folder as FolderType, Asset } from '@/data/mock-data';
import { useLanguage } from '@/contexts/language-context';
import { FolderTreeDisplay } from '@/components/folder-tree';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface ProjectFolderViewProps {
  project: Project;
  isContentLoading: boolean;
  foldersToDisplay: FolderType[];
  assetsToDisplay: Asset[];
  allProjectAssets: Asset[];
  selectedFolder: FolderType | null;
  deletingItemId: string | null;
  loadingAssetId: string | null;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  onSelectFolder: (folder: FolderType) => void;
  onAddSubfolder: (parentFolder: FolderType | null) => void;
  onEditFolder: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
  onPreviewAsset: (asset: Asset) => void;
  isAdmin: boolean;
  isOnline: boolean;
}

export function ProjectFolderView({
  project,
  isContentLoading,
  foldersToDisplay,
  assetsToDisplay,
  allProjectAssets,
  selectedFolder,
  deletingItemId,
  loadingAssetId,
  scrollAreaRef,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onDeleteFolder,
  onEditAsset,
  onDeleteAsset,
  onPreviewAsset,
  isAdmin,
  isOnline
}: ProjectFolderViewProps) {
  const { t } = useLanguage();

  const isCurrentLocationEmpty = foldersToDisplay.length === 0 && assetsToDisplay.length === 0;

  const { setNodeRef: setRootDroppableRef, isOver: isOverRoot } = useDroppable({
    id: 'root-droppable',
    disabled: !isAdmin || !isOnline,
    data: {
      type: 'root'
    }
  });

  return (
    <div 
        ref={isAdmin ? setRootDroppableRef : null} 
        className={cn(
            'h-full p-1 rounded-lg',
            isOverRoot && 'bg-primary/10 ring-2 ring-primary ring-inset'
        )}
    >
      <ScrollArea className="h-full pr-3" viewportRef={scrollAreaRef}>
        {isContentLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <FolderTreeDisplay
            foldersToDisplay={foldersToDisplay}
            assetsToDisplay={assetsToDisplay}
            allProjectAssets={allProjectAssets}
            projectId={project.id}
            onSelectFolder={onSelectFolder}
            onAddSubfolder={onAddSubfolder}
            onEditFolder={onEditFolder}
            onDeleteFolder={onDeleteFolder}
            onEditAsset={onEditAsset}
            onDeleteAsset={onDeleteAsset}
            onPreviewAsset={onPreviewAsset}
            currentSelectedFolderId={selectedFolder?.id || null}
            displayMode="grid"
            deletingItemId={deletingItemId}
            loadingAssetId={loadingAssetId}
            isAdmin={isAdmin}
            isOnline={isOnline}
          />
        )}
        
        {isCurrentLocationEmpty && !isContentLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {selectedFolder ? t('folderIsEmpty', 'This folder is empty. Add a subfolder or asset.') : t('projectRootIsEmpty', 'This project has no folders or root assets. Add a folder to get started.')}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
