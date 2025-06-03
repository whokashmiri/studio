
"use client";
import type { Folder } from '@/data/mock-data';
import { ChevronRight, Folder as FolderIcon, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FolderTreeProps {
  folders: Folder[];
  projectId: string;
  onSelectFolder: (folder: Folder | null) => void; // Allow null for project root
  onAddSubfolder: (parentFolder: Folder) => void;
  parentId?: string | null;
  level?: number;
  selectedFolderId?: string | null;
}

interface FolderItemProps extends Omit<FolderTreeProps, 'parentId' | 'level'> {
  folder: Folder;
  level: number;
}

function FolderItem({ folder, folders, projectId, onSelectFolder, onAddSubfolder, level = 0, selectedFolderId }: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const childFolders = folders.filter(f => f.parentId === folder.id && f.projectId === projectId);

  useEffect(() => {
    // Automatically open parent folders if a child is selected
    if (selectedFolderId) {
      const isParentOfSelected = folders.some(f => f.id === selectedFolderId && f.parentId === folder.id);
      if (isParentOfSelected || folder.id === selectedFolderId) {
        // setIsOpen(true); // This might open too many, need a more direct path check
      }
      // A more robust solution would trace path from selectedFolderId up to root.
      // For now, simple selection highlighting is primary.
    }
  }, [selectedFolderId, folder.id, folders]);


  return (
    <li style={{ paddingLeft: `${level * 1.25}rem` }} className="my-0.5">
      <div 
        className={cn(
            "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted cursor-pointer group",
            selectedFolderId === folder.id && "bg-primary/10 text-primary ring-1 ring-primary/50"
        )}
        onClick={() => { onSelectFolder(folder); if (childFolders.length > 0) setIsOpen(!isOpen); }}
      >
        <div className="flex items-center flex-grow truncate">
          {childFolders.length > 0 ? (
            <ChevronRight 
              className={cn("h-4 w-4 mr-1 transform transition-transform shrink-0", isOpen && "rotate-90")} 
              onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen);}}
            />
          ) : (
             <span className="w-4 mr-1 shrink-0"></span> // Placeholder for alignment
          )}
          <FolderIcon className={cn("h-5 w-5 mr-2 shrink-0", selectedFolderId === folder.id ? "text-primary" : "text-muted-foreground group-hover:text-primary/80")} /> 
          <span className="text-sm truncate" title={folder.name}>{folder.name}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={(e) => { e.stopPropagation(); onAddSubfolder(folder); }}
          title={`Add subfolder to ${folder.name}`}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
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
              level={level + 1}
              selectedFolderId={selectedFolderId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}


export function FolderTree({ folders, projectId, onSelectFolder, onAddSubfolder, parentId = null, level = 0, selectedFolderId }: FolderTreeProps) {
  const rootFolders = folders.filter(f => f.parentId === parentId && f.projectId === projectId);

  return (
    <ul className="space-y-0">
      {/* Project Root Item */}
      <li style={{ paddingLeft: `${level * 1.25}rem` }} className="my-0.5">
        <div 
          className={cn(
            "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted cursor-pointer group",
            selectedFolderId === null && "bg-primary/10 text-primary ring-1 ring-primary/50" // Highlight if project root is selected
          )}
          onClick={() => onSelectFolder(null)} // Select project root
        >
          <div className="flex items-center flex-grow truncate">
            <span className="w-4 mr-1 shrink-0"></span> {/* Placeholder for alignment */}
            <FolderIcon className={cn("h-5 w-5 mr-2 shrink-0", selectedFolderId === null ? "text-primary" : "text-muted-foreground group-hover:text-primary/80")} />
            <span className="text-sm truncate italic">Project Root</span>
          </div>
        </div>
      </li>

      {rootFolders.map(folder => (
        <FolderItem
          key={folder.id}
          folder={folder}
          folders={folders}
          projectId={projectId}
          onSelectFolder={onSelectFolder}
          onAddSubfolder={onAddSubfolder}
          level={level}
          selectedFolderId={selectedFolderId}
        />
      ))}
      {rootFolders.length === 0 && level === 0 && (
         <p className="text-xs text-muted-foreground p-2 text-center">No top-level folders created yet.</p>
      )}
    </ul>
  );
}
