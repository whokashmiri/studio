
"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Project, Folder as FolderType, Asset } from '@/data/mock-data';
import { useLanguage } from '@/contexts/language-context';

// Lazy load the heaviest component
const FolderTreeDisplay = React.lazy(() => import('@/components/folder-tree').then(module => ({ default: module.FolderTreeDisplay })));

interface ProjectFolderViewProps {
  project: Project;
  isContentLoading: boolean;
  foldersToDisplay: FolderType[];
  assetsToDisplay: Asset[];
  allProjectAssets: Asset[];
  selectedFolder: FolderType | null;
  deletingAssetId: string | null;
  loadingAssetId: string | null;
  hasMoreAssets: boolean;
  isLoadingMore: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  onSelectFolder: (folder: FolderType) => void;
  onAddSubfolder: (parentFolder: FolderType | null) => void;
  onEditFolder: (folder: FolderType) => void;
  onDeleteFolder: () => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
  onPreviewAsset: (asset: Asset) => void;
  onLoadMore: () => void;
}

export function ProjectFolderView({
  project,
  isContentLoading,
  foldersToDisplay,
  assetsToDisplay,
  allProjectAssets,
  selectedFolder,
  deletingAssetId,
  loadingAssetId,
  hasMoreAssets,
  isLoadingMore,
  scrollAreaRef,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onDeleteFolder,
  onEditAsset,
  onDeleteAsset,
  onPreviewAsset,
  onLoadMore
}: ProjectFolderViewProps) {
  const { t } = useLanguage();

  const isCurrentLocationEmpty = foldersToDisplay.length === 0 && assetsToDisplay.length === 0;

  return (
    <ScrollArea className="h-full pr-3" viewportRef={scrollAreaRef}>
      {isContentLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <React.Suspense fallback={
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
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
            deletingAssetId={deletingAssetId}
            loadingAssetId={loadingAssetId}
            onLoadMore={onLoadMore}
            hasMore={hasMoreAssets}
            isLoadingMore={isLoadingMore}
            scrollAreaRef={scrollAreaRef}
          />
        </React.Suspense>
      )}
      
      {isCurrentLocationEmpty && !isContentLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            {selectedFolder ? t('folderIsEmpty', 'This folder is empty. Add a subfolder or asset.') : t('projectRootIsEmpty', 'This project has no folders or root assets. Add a folder to get started.')}
          </p>
        </div>
      )}
    </ScrollArea>
  );
}
