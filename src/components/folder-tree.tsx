
"use client";
import type { Folder } from '@/data/mock-data';
import { ChevronRight, Folder as FolderIcon, FolderPlus, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language-context';

interface FolderTreeProps {
  folders: Folder[];
  projectId: string;
  onSelectFolder: (folder: Folder | null) => void; 
  onAddSubfolder: (parentFolder: Folder) => void;
  onEditFolder: (folder: Folder) => void;
  parentId?: string | null;
  level?: number;
  selectedFolderId?: string | null;
}

interface FolderItemProps extends Omit<FolderTreeProps, 'parentId' | 'level'> {
  folder: Folder;
  level: number;
}

function FolderItem({ folder, folders, projectId, onSelectFolder, onAddSubfolder, onEditFolder, level = 0, selectedFolderId }: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const childFolders = folders.filter(f => f.parentId === folder.id && f.projectId === projectId);

  useEffect(() => {
    if (selectedFolderId) {
      const tracePathToSelected = (currentFolderId: string | null): boolean => {
        if (!currentFolderId) return false;
        if (currentFolderId === folder.id) return true;
        const currentF = folders.find(f => f.id === currentFolderId);
        return tracePathToSelected(currentF?.parentId || null);
      };
      if (tracePathToSelected(selectedFolderId) && folder.id !== selectedFolderId && childFolders.length > 0) {
        // Consider if auto-opening is desired. It can be aggressive.
        // setIsOpen(true); 
      }
    }
  }, [selectedFolderId, folder.id, folders, childFolders.length]);


  return (
    <li style={{ paddingLeft: `${level * 1.25}rem` }} className="my-0.5">
      <div 
        className={cn(
            "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted cursor-pointer group",
            selectedFolderId === folder.id && "bg-primary/10 text-primary ring-1 ring-primary/50"
        )}
        onClick={() => { onSelectFolder(folder); if (childFolders.length > 0) setIsOpen(!isOpen); }}
      >
        <div className="flex items-center flex-grow truncate min-w-0">
          {childFolders.length > 0 ? (
            <ChevronRight 
              className={cn("h-4 w-4 mr-1 transform transition-transform shrink-0", isOpen && "rotate-90")} 
              onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen);}}
            />
          ) : (
             <span className="w-4 mr-1 shrink-0"></span> 
          )}
          <FolderIcon className={cn("h-5 w-5 mr-2 shrink-0", selectedFolderId === folder.id ? "text-primary" : "text-muted-foreground group-hover:text-primary/80")} /> 
          <span className="text-sm truncate" title={folder.name}>{folder.name}</span>
        </div>
        <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onEditFolder(folder); }}
                title={t('editFolderTitle', 'Edit folder {folderName}', {folderName: folder.name})}
            >
                <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onAddSubfolder(folder); }}
                title={t('addSubfolderTitle', 'Add subfolder to {folderName}', {folderName: folder.name})}
            >
                <FolderPlus className="h-4 w-4" />
            </Button>
        </div>
      </div>
      {isOpen && childFolders.length > 0 && (
        <ul className="mt-0.5">
          {childFolders.map(child => (
            <FolderItem
              key={child.id}
              folder={child}
              folders={folders}
              projectId={projectId}
              onSelectFolder={onSelectFolder}
              onAddSubfolder={onAddSubfolder}
              onEditFolder={onEditFolder}
              level={level + 1}
              selectedFolderId={selectedFolderId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}


export function FolderTree({ folders, projectId, onSelectFolder, onAddSubfolder, onEditFolder, parentId = null, level = 0, selectedFolderId }: FolderTreeProps) {
  const rootFolders = folders.filter(f => f.parentId === parentId && f.projectId === projectId);
  const { t } = useLanguage();

  if (rootFolders.length === 0 && level === 0 && (folders.filter(f => f.projectId === projectId).length === 0) ) {
     return <p className="text-xs text-muted-foreground p-2 text-center">{t('noTopLevelFolders', 'No top-level folders created yet.')}</p>;
  }

  return (
    <ul className="space-y-0">
      {rootFolders.map(folder => (
        <FolderItem
          key={folder.id}
          folder={folder}
          folders={folders}
          projectId={projectId}
          onSelectFolder={onSelectFolder}
          onAddSubfolder={onAddSubfolder}
          onEditFolder={onEditFolder}
          level={level}
          selectedFolderId={selectedFolderId}
        />
      ))}
    </ul>
  );
}

