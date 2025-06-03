
"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderTree } from '@/components/folder-tree';
import { mockProjects, mockFolders, type Project, type Folder as FolderType, mockAssets, Asset as AssetType } from '@/data/mock-data';
import { Home, FolderPlus, FilePlus, Trash2, Edit, Image as ImageIcon, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);

  const { t } = useLanguage();

  useEffect(() => {
    if (projectId) {
      const foundProject = mockProjects.find(p => p.id === projectId);
      setProject(foundProject || null);
      if (foundProject) {
        const projectFolders = mockFolders.filter(f => f.projectId === projectId);
        setFolders(projectFolders);
        const projectAssets = mockAssets.filter(a => a.projectId === projectId);
        setAssets(projectAssets);
      } else {
        // Handle project not found, e.g. redirect or show error
        router.push('/'); 
      }
    }
  }, [projectId, router]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !project) return;
    const newFolder: FolderType = {
      id: `folder_${Date.now()}`,
      name: newFolderName,
      projectId: project.id,
      parentId: selectedFolder ? selectedFolder.id : null,
    };

    // Update project's lastAccessed time and status
    const projectIndex = mockProjects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
      mockProjects[projectIndex] = {
        ...mockProjects[projectIndex],
        lastAccessed: new Date().toISOString(),
        status: 'recent',
      };
    }
    
    mockFolders.push(newFolder); // Add to global mockFolders
    setFolders(prev => [...prev, newFolder]); // Update local state for UI

    setNewFolderName('');
    setIsNewFolderDialogOpen(false);
    setSelectedFolder(null); // Reset selected folder for adding to root next time or clear selection
  };

  const currentPathDisplay = selectedFolder ? selectedFolder.name : (project?.name || 'Project');
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
            <Home className="mr-1 h-4 w-4" /> All Projects
          </Link>
          <h1 className="text-3xl font-bold font-headline mt-1">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <Link href={`/project/${project.id}/new-asset`} passHref legacyBehavior>
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
            <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setSelectedFolder(null)}> {/* Default to root */}
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('addNewFolder', 'Add New Folder')} {selectedFolder ? `inside ${selectedFolder.name}`: `to ${project.name}`}</DialogTitle>
                </DialogHeader>
                <div>
                  <Label htmlFor="new-folder-name">{t('folderName', 'Folder Name')}</Label>
                  <Input 
                    id="new-folder-name" 
                    value={newFolderName} 
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g., Inspection Area 1" 
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>{t('cancel', 'Cancel')}</Button>
                  <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>{t('confirm', 'Confirm')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <FolderTree 
              folders={folders} 
              projectId={project.id} 
              onSelectFolder={setSelectedFolder}
              onAddSubfolder={(folder) => { setSelectedFolder(folder); setIsNewFolderDialogOpen(true); }}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('assets', 'Assets')} in <span className="text-primary">{currentPathDisplay}</span></CardTitle>
            <CardDescription>Manage assets within the selected folder or project root.</CardDescription>
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
                        <p className="text-xs text-muted-foreground line-clamp-1">{asset.description}</p>
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
              <p className="text-muted-foreground text-center py-8">No assets found in this location.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
