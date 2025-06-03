"use client";
import type { Folder } from '@/data/mock-data';
import { ChevronRight, Folder as FolderIcon, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface FolderTreeProps {
  folders: Folder[];
  projectId: string;
  onSelectFolder: (folder: Folder) => void;
  onAddSubfolder: (parentFolder: Folder) => void;
  parentId?: string | null;
  level?: number;
}

interface FolderItemProps extends FolderTreeProps {
  folder: Folder;
}

function FolderItem({ folder, folders, projectId, onSelectFolder, onAddSubfolder, level = 0 }: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const childFolders = folders.filter(f => f.parentId === folder.id && f.projectId === projectId);

  return (
    <li style={{ paddingLeft: `${level * 1.5}rem` }}>
      <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted cursor-pointer group">
        <div className="flex items-center flex-grow" onClick={() => { onSelectFolder(folder); setIsOpen(!isOpen); }}>
          {childFolders.length > 0 && (
            <ChevronRight className={cn("h-4 w-4 mr-1 transform transition-transform", isOpen && "rotate-90")} />
          )}
          <FolderIcon className={cn("h-5 w-5 mr-2 text-primary", childFolders.length === 0 && "ml-[calc(1rem+2px)]")} /> 
          <span className="text-sm">{folder.name}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onAddSubfolder(folder); }}
          title={`Add subfolder to ${folder.name}`}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>
      {isOpen && childFolders.length > 0 && (
        <ul className="mt-1">
          {childFolders.map(child => (
            <FolderItem
              key={child.id}
              folder={child}
              folders={folders}
              projectId={projectId}
              onSelectFolder={onSelectFolder}
              onAddSubfolder={onAddSubfolder}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}


export function FolderTree({ folders, projectId, onSelectFolder, onAddSubfolder, parentId = null, level = 0 }: FolderTreeProps) {
  const rootFolders = folders.filter(f => f.parentId === parentId && f.projectId === projectId);

  if (rootFolders.length === 0 && level === 0) {
    return <p className="text-sm text-muted-foreground p-2">No folders created yet.</p>;
  }

  return (
    <ul className="space-y-0.5">
      {rootFolders.map(folder => (
        <FolderItem
          key={folder.id}
          folder={folder}
          folders={folders}
          projectId={projectId}
          onSelectFolder={onSelectFolder}
          onAddSubfolder={onAddSubfolder}
          level={level}
        />
      ))}
    </ul>
  );
}
