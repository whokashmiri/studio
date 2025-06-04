
"use client";
import type { Folder } from '@/data/mock-data';
import { Folder as FolderIcon, MoreVertical, Edit3, FolderPlus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import React, { useState } from 'react';

interface FolderTreeProps {
  allProjectFolders: Folder[];
  projectId: string;
  selectedFolderId: string | null;
  onSelectFolder: (folder: Folder | null) => void;
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
}

interface FolderNodeProps extends FolderTreeProps {
  folder: Folder;
  level: number;
  expandedFolders: Set<string>;
  toggleExpand: (folderId: string) => void;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  level,
  allProjectFolders,
  projectId,
  selectedFolderId,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onDeleteFolder,
  expandedFolders,
  toggleExpand,
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const children = allProjectFolders.filter(f => f.parentId === folder.id);
  const isExpanded = expandedFolders.has(folder.id);

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

    if (confirm(t('deleteFolderConfirmation', `Are you sure you want to delete "${currentFolder.name}" and all its contents? This action cannot be undone.`, { folderName: currentFolder.name }))) {
      LocalStorageService.deleteFolder(currentFolder.id);
      onDeleteFolder(currentFolder);
      toast({
        title: t('folderDeletedTitle', 'Folder Deleted'),
        description: t('folderDeletedDesc', `Folder "${currentFolder.name}" has been deleted.`, { folderName: currentFolder.name }),
      });
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex items-center justify-between p-2 rounded-md hover:bg-accent/50 group",
          selectedFolderId === folder.id && "bg-accent text-accent-foreground hover:bg-accent"
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }} // Indentation
        onClick={() => onSelectFolder(folder)}
      >
        <div className="flex items-center gap-2 truncate cursor-pointer flex-grow">
          {children.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
          {!children.length && <span className="w-6 h-6 inline-block"></span>}
          <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />
          <span className="truncate" title={folder.name}>{folder.name}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-50 group-hover:opacity-100 focus:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">{t('folderActions', 'Folder actions')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onSelectFolder(folder)}>
              {t('selectFolder', 'Select Folder')}
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
      {isExpanded && children.length > 0 && (
        <div className="flex flex-col">
          {children.map(childFolder => (
            <FolderNode
              key={childFolder.id}
              folder={childFolder}
              level={level + 1}
              allProjectFolders={allProjectFolders}
              projectId={projectId}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onAddSubfolder={onAddSubfolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              expandedFolders={expandedFolders}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function FolderTreeDisplay({
  allProjectFolders,
  projectId,
  selectedFolderId,
  onSelectFolder,
  onAddSubfolder,
  onEditFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const { t } = useLanguage();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };
  
  const rootFolders = allProjectFolders.filter(folder => folder.parentId === null && folder.projectId === projectId);

  if (allProjectFolders.filter(f => f.projectId === projectId).length === 0) {
    return (
      <div className="py-8 text-center">
        <FolderIcon className="mx-auto h-16 w-16 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          {t('noFoldersInProjectStart', 'This project has no folders yet.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {rootFolders.map(folder => (
        <FolderNode
          key={folder.id}
          folder={folder}
          level={0}
          allProjectFolders={allProjectFolders}
          projectId={projectId}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onAddSubfolder={onAddSubfolder}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          expandedFolders={expandedFolders}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
}
    