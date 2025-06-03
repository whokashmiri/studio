
"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AssetDescriptionInput } from '@/components/asset-description-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, ImageUp, Save } from 'lucide-react';
import { mockProjects, type Project, type Asset, mockAssets } from '@/data/mock-data';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';

export default function NewAssetPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [assetName, setAssetName] = useState('');
  const [photos, setPhotos] = useState<File[]>([]); // For actual file handling if implemented
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (projectId) {
      const foundProject = mockProjects.find(p => p.id === projectId);
      setProject(foundProject || null);
      if (!foundProject) {
        router.push('/'); // Redirect if project not found
      }
    }
  }, [projectId, router]);
  
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setPhotos(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleSaveAsset = (description: string, summary?: string) => {
    if (!assetName.trim()) {
      toast({ title: "Asset Name Required", description: "Please enter a name for the asset.", variant: "destructive" });
      return;
    }
    if (!project) return;

    // Update project's lastAccessed time and status
    const projectIndex = mockProjects.findIndex(p => p.id === project.id);
    if (projectIndex !== -1) {
      mockProjects[projectIndex] = {
        ...mockProjects[projectIndex],
        lastAccessed: new Date().toISOString(),
        status: 'recent',
      };
    }
    
    // Simulate saving asset
    const newAsset: Asset = {
      id: `asset_${Date.now()}`,
      name: assetName,
      projectId: project.id,
      folderId: null, // Or get from query params if navigating from a folder
      photos: photoPreviews, // Using previews for mock, in real app upload files and get URLs
      description: description,
      summary: summary,
      createdAt: new Date().toISOString(),
    };
    
    // Add to mock data (in real app, this would be an API call)
    mockAssets.push(newAsset); 

    toast({ title: "Asset Saved", description: `Asset "${assetName}" has been saved.` });
    router.push(`/project/${project.id}`); // Navigate back to project page
  };

  if (!project) {
    return <div className="container mx-auto p-4 text-center">Loading project context...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Link href={`/project/${projectId}`} className="text-sm text-primary hover:underline flex items-center mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to {project.name}
      </Link>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">{t('newAsset', 'Create New Asset')} for {project.name}</CardTitle>
          <CardDescription>Add photos, a name, and a description for your new asset.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo Upload Section */}
          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => document.getElementById('camera-input')?.click()} className="w-full sm:w-auto">
                <Camera className="mr-2 h-4 w-4" /> {t('takePhotos', 'Take Photos')}
              </Button>
              <input type="file" accept="image/*" capture="environment" id="camera-input" className="hidden" onChange={handlePhotoUpload} />
              
              <Button variant="outline" onClick={() => document.getElementById('gallery-input')?.click()} className="w-full sm:w-auto">
                <ImageUp className="mr-2 h-4 w-4" /> {t('uploadFromGallery', 'Upload from Gallery')}
              </Button>
              <input type="file" accept="image/*" multiple id="gallery-input" className="hidden" onChange={handlePhotoUpload} />
            </div>
            {photoPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {photoPreviews.map((src, index) => (
                  <img key={index} src={src} alt={`Preview ${index + 1}`} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
                ))}
              </div>
            )}
          </div>

          {/* Asset Name Input */}
          <div className="space-y-2">
            <Label htmlFor="asset-name">{t('assetName', 'Asset Name')}</Label>
            <Input
              id="asset-name"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g., Main Entrance Column"
            />
          </div>

          {/* Asset Description Input Component */}
          <AssetDescriptionInput 
            assetName={assetName}
            onSave={handleSaveAsset} 
          />
          
        </CardContent>
        {/* Footer might be part of AssetDescriptionInput now, or add general skip/save here if needed */}
        {/* <CardFooter className="flex justify-end">
          <Button variant="outline" className="mr-2" onClick={() => router.push(`/project/${projectId}`)}>{t('skip', 'Skip & Back')}</Button>
          <Button onClick={() => {
            // Trigger save from AssetDescriptionInput if description is main part, or handle standalone save
            // This button is somewhat redundant if AssetDescriptionInput has its own save that calls handleSaveAsset
            // For now, let's assume AssetDescriptionInput's save button is primary.
            // If there's no description, a save button here would need to call handleSaveAsset with empty description.
            if (!assetName.trim()) {
                toast({ title: "Asset Name Required", variant: "destructive"});
            } else {
                // This implies a way to trigger save on the child or that state is lifted
                // The current AssetDescriptionInput handles its own save logic.
            }
          }}>
            <Save className="mr-2 h-4 w-4" /> {t('save', 'Save Asset')}
          </Button>
        </CardFooter> */}
      </Card>
    </div>
  );
}
