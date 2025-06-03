
"use client";
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderTree } from '@/components/folder-tree';
import type { Project, Folder as FolderType, Asset as AssetType, ProjectStatus } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { Home, FolderPlus, FilePlus, Trash2, Edit, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const currentUrlFolderId = searchParams.get('folderId');

  const [project, setProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadProjectData = useCallback(() => {
    if (projectId) {
      const foundProject = LocalStorageService.getProjects().find(p => p.id === projectId);
      setProject(foundProject || null);
      if (foundProject) {
        const allFolders = LocalStorageService.getFolders();
        setFolders(allFolders.filter(f => f.projectId === projectId));
        
        const allAssets = LocalStorageService.getAssets();
        setAssets(allAssets.filter(a => a.projectId === projectId));

        if (currentUrlFolderId) {
          const folderFromUrl = allFolders.find(f => f.id === currentUrlFolderId && f.projectId === projectId);
          setSelectedFolder(folderFromUrl || null);
        } else {
          setSelectedFolder(null);
        }

      } else {
        toast({ title: "Project not found", variant: "destructive" });
        router.push('/'); 
      }
    }
  }, [projectId, router, toast, currentUrlFolderId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Update URL when selectedFolder changes
  useEffect(() => {
    if (project) {
      const currentPath = `/project/${project.id}${selectedFolder ? `?folderId=${selectedFolder.id}` : ''}`;
      if (window.location.pathname + window.location.search !== currentPath) {
         router.replace(currentPath, { scroll: false });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, project?.id, router]);


  const handleSelectFolder = (folder: FolderType | null) => {
    setSelectedFolder(folder);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !project) return;
    
    const newFolder: FolderType = {
      id: `folder_${Date.now()}`,
      name: newFolderName,
      projectId: project.id,
      parentId: selectedFolder ? selectedFolder.id : null, // Use the folder that was active when dialog opened
    };

    LocalStorageService.addFolder(newFolder);
    
    // Update project's lastAccessed time and status
    const updatedProject = {
      ...project,
      lastAccessed: new Date().toISOString(),
      status: 'recent' as ProjectStatus,
    };
    LocalStorageService.updateProject(updatedProject);
    
    setFolders(prev => [...prev, newFolder]); // Update local state for UI

    setNewFolderName('');
    setIsNewFolderDialogOpen(false);
    // Don't reset selectedFolder here, let user decide next action
    toast({ title: t('folderCreated', 'Folder Created'), description: `Folder "${newFolder.name}" added.`});
  };
  
  const openNewFolderDialog = (parentFolder: FolderType | null) => {
    setSelectedFolder(parentFolder); // Set context for where new folder will be created
    setIsNewFolderDialogOpen(true);
  };


  const currentPathDisplay = selectedFolder ? selectedFolder.name : (project?.name || 'Project Root');
  const displayedAssets = assets.filter(asset => 
    selectedFolder ? asset.folderId === selectedFolder.id : asset.folderId === null
  );

  if (!project) {
    return <div className="container mx-auto p-4 text-center">Loading project details...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-primary hover:underline flex items-center">
            <Home className="mr-1 h-4 w-4" /> {t('allProjects', 'All Projects')}
          </Link>
          <h1 className="text-3xl font-bold font-headline mt-1">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <Link href={`/project/${project.id}/new-asset${selectedFolder ? `?folderId=${selectedFolder.id}` : ''}`} passHref legacyBehavior>
          <Button>
            <FilePlus className="mr-2 h-5 w-5" />
            {t('newAsset', 'New Asset')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('folders', 'Folders')}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => openNewFolderDialog(null)}> {/* Always add to root from this button */}
              <FolderPlus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <FolderTree 
              folders={folders} 
              projectId={project.id} 
              onSelectFolder={handleSelectFolder}
              onAddSubfolder={(parentFolder) => openNewFolderDialog(parentFolder)}
              selectedFolderId={selectedFolder?.id || null}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('assetsIn', 'Assets in')} <span className="text-primary">{currentPathDisplay}</span></CardTitle>
            <CardDescription>{t('manageAssetsPrompt', 'Manage assets within the selected folder or project root.')}</CardDescription>
          </CardHeader>
          <CardContent>
            {displayedAssets.length > 0 ? (
              <ul className="space-y-3">
                {displayedAssets.map(asset => (
                  <li key={asset.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                    <div className="flex items-center">
                      {asset.photos && asset.photos.length > 0 ? (
                        <img src={asset.photos[0]} alt={asset.name} data-ai-hint="asset thumbnail" className="h-10 w-10 rounded-md object-cover mr-3" />
                      ) : (
                        <ImageIcon className="h-10 w-10 rounded-md text-muted-foreground bg-muted p-2 mr-3" />
                      )}
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{asset.summary || asset.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8">
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-8">{t('noAssetsInLocation', 'No assets found in this location.')}</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addNewFolder', 'Add New Folder')} {selectedFolder ? `${t('inside', 'inside')} ${selectedFolder.name}`: `${t('to', 'to')} ${project.name}`}</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="new-folder-name">{t('folderName', 'Folder Name')}</Label>
            <Input 
              id="new-folder-name" 
              value={newFolderName} 
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t('folderNamePlaceholder', "e.g., Inspection Area 1")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>{t('cancel', 'Cancel')}</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>{t('confirm', 'Confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
