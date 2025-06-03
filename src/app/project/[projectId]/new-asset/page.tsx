
"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AssetDescriptionInput } from '@/components/asset-description-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Camera, ImageUp, Save, ArrowRight, X, Edit3, AlertTriangle } from 'lucide-react';
import type { Project, Asset, ProjectStatus } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Alert, AlertDescription } from '@/components/ui/alert';

type AssetCreationStep = 'name' | 'photos' | 'description';

export default function NewAssetPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const projectId = params.projectId as string;
  const folderId = searchParams.get('folderId') || null;

  const [currentStep, setCurrentStep] = useState<AssetCreationStep>('name');
  const [project, setProject] = useState<Project | null>(null);
  const [assetName, setAssetName] = useState('');
  
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  
  const { toast } = useToast();
  const { t } = useLanguage();

  const MAX_PHOTOS = 5;

  const loadProject = useCallback(() => {
    if (projectId) {
      const allProjects = LocalStorageService.getProjects();
      const foundProject = allProjects.find(p => p.id === projectId);
      setProject(foundProject || null);
      if (!foundProject) {
        toast({ title: "Project Not Found", variant: "destructive" });
        router.push('/');
      }
    }
  }, [projectId, router, toast]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);
  
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      if (photos.length + newFiles.length > MAX_PHOTOS) {
        toast({
          title: t('maxPhotosTitle', `Maximum ${MAX_PHOTOS} Photos`),
          description: t('maxPhotosDesc', `You can upload a maximum of ${MAX_PHOTOS} photos.`),
          variant: "destructive"
        });
      }
      const combinedFiles = [...photos, ...newFiles].slice(0, MAX_PHOTOS); 
      setPhotos(combinedFiles);
      
      // Revoke old object URLs before creating new ones to prevent memory leaks
      // photoPreviews.forEach(url => URL.revokeObjectURL(url)); // Do this selectively on removal or unmount
      
      const newPreviews = combinedFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviews(newPreviews); // This will overwrite, so old previews are implicitly "revoked" by not being used if files change
    }
  };

  const removePhoto = (indexToRemove: number) => {
    URL.revokeObjectURL(photoPreviews[indexToRemove]);
    setPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    setPhotoPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleNameSubmit = () => {
    if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), description: t('assetNameRequiredDesc', "Please enter a name for the asset."), variant: "destructive" });
      return;
    }
    setIsPhotoModalOpen(true);
  };

  const handlePhotosSubmittedOrSkipped = () => {
    setIsPhotoModalOpen(false);
    setCurrentStep('description');
  };

  const handleSaveAsset = (description: string, summary?: string) => {
    if (!project) {
      toast({ title: "Project context lost", variant: "destructive" });
      return;
    }
     if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), variant: "destructive" });
      setCurrentStep('name');
      return;
    }

    const updatedProject = {
      ...project,
      lastAccessed: new Date().toISOString(),
      status: 'recent' as ProjectStatus,
    };
    LocalStorageService.updateProject(updatedProject);
    
    const newAsset: Asset = {
      id: `asset_${Date.now()}`,
      name: assetName,
      projectId: project.id,
      folderId: folderId,
      photos: photoPreviews, // For mock data, these are fine. Real app: uploaded URLs.
      description: description,
      summary: summary,
      createdAt: new Date().toISOString(),
    };
    
    LocalStorageService.addAsset(newAsset); 

    toast({ title: t('assetSavedTitle', "Asset Saved"), description: t('assetSavedDesc', `Asset "${assetName}" has been saved.`) });
    router.push(`/project/${project.id}${folderId ? `?folderId=${folderId}` : ''}`);
  };

  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  if (!project) {
    return <div className="container mx-auto p-4 text-center">Loading project context...</div>;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">{t('newAsset', 'Create New Asset')} for {project.name}</CardTitle>
              {folderId && <CardDescription>{t('inFolder', 'In folder:')} {LocalStorageService.getFolders().find(f=>f.id === folderId)?.name || 'Unknown Folder'}</CardDescription>}
              <CardDescription>Step 1 of 3: {t('enterAssetNamePrompt', 'Enter the asset name.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="asset-name">{t('assetName', 'Asset Name')}</Label>
                <Input
                  id="asset-name"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder={t('assetNamePlaceholder', "e.g., Main Entrance Column")}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleNameSubmit}>
                {t('nextAddPhotos', 'Next: Add Photos')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
      case 'description':
        return (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">{t('addDescriptionFor', 'Add Description for:')} <span className="text-primary">{assetName}</span></CardTitle>
              <CardDescription>Step 3 of 3: {t('provideDetailsPrompt', 'Provide detailed information about the asset.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {photoPreviews.length > 0 && (
                <div className="space-y-2">
                    <Label>{t('photosAdded', 'Photos Added')} ({photoPreviews.length}/{MAX_PHOTOS})</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {photoPreviews.map((src, index) => (
                        <div key={index} className="relative group">
                          <img src={src} alt={`Preview ${index + 1}`} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
                          <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              onClick={() => removePhoto(index)}
                              title={t('removePhotoTitle', "Remove photo")}
                          >
                              <X className="h-3 w-3" />
                          </Button>
                        </div>
                    ))}
                    </div>
                </div>
                )}
                 <Button variant="outline" size="sm" onClick={() => { setCurrentStep('name'); setIsPhotoModalOpen(true); }} className="mt-2">
                    <Edit3 className="mr-2 h-4 w-4" /> {t('editPhotos', 'Add/Edit Photos')}
                 </Button>
              <AssetDescriptionInput 
                assetName={assetName}
                onSave={handleSaveAsset}
              />
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Link href={`/project/${projectId}${folderId ? `?folderId=${folderId}` : ''}`} className="text-sm text-primary hover:underline flex items-center mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t('backTo', 'Back to')} {project.name}
      </Link>

      {renderStepContent()}

      <Dialog open={isPhotoModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { // If modal is closed by any means (X, Esc, outside click)
            setIsPhotoModalOpen(false);
            // If user was at name step and closed modal, move to description to allow skipping photos
            if (currentStep === 'name' && assetName.trim()){
                 setCurrentStep('description');
            }
          } else {
            setIsPhotoModalOpen(true);
          }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Step 2 of 3: {t('addPhotosFor', 'Add Photos for')} "{assetName}"</DialogTitle>
            <DialogDescription>{t('takeOrUploadPhotosPrompt', `You can take new photos or upload from your gallery. Max ${MAX_PHOTOS} photos.`)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => document.getElementById('camera-input-modal')?.click()} className="w-full sm:w-auto" disabled={photos.length >= MAX_PHOTOS}>
                <Camera className="mr-2 h-4 w-4" /> {t('takePhotos', 'Take Photos')}
              </Button>
              <input type="file" accept="image/*" capture="environment" id="camera-input-modal" className="hidden" onChange={handlePhotoUpload} />
              
              <Button variant="outline" onClick={() => document.getElementById('gallery-input-modal')?.click()} className="w-full sm:w-auto" disabled={photos.length >= MAX_PHOTOS}>
                <ImageUp className="mr-2 h-4 w-4" /> {t('uploadFromGallery', 'Upload from Gallery')}
              </Button>
              <input type="file" accept="image/*" multiple id="gallery-input-modal" className="hidden" onChange={handlePhotoUpload} />
            </div>
            {photos.length >= MAX_PHOTOS && (
                 <Alert variant="default" className="border-yellow-500 text-yellow-700">
                    <AlertTriangle className="h-4 w-4 !text-yellow-600" />
                    <AlertDescription>
                       {t('maxPhotosReached', `You have reached the maximum of ${MAX_PHOTOS} photos.`)}
                    </AlertDescription>
                </Alert>
            )}
            {photoPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {photoPreviews.map((src, index) => (
                  <div key={index} className="relative group">
                    <img src={src} alt={`Preview ${index + 1}`} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
                     <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        onClick={() => removePhoto(index)}
                        title={t('removePhotoTitle', "Remove photo")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                  </div>
                ))}
              </div>
            )}
             {photoPreviews.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('noPhotosAddedYet', 'No photos added yet.')}</p>
             )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePhotosSubmittedOrSkipped}>
              {photoPreviews.length > 0 ? t('nextStepDescription', 'Next: Description') : t('skipPhotosAndNext', 'Skip Photos & Next')}
            </Button>
            <Button onClick={handlePhotosSubmittedOrSkipped} disabled={photos.length === 0 && photoPreviews.length === 0}>
              <Save className="mr-2 h-4 w-4" /> {t('savePhotosAndContinue', 'Save Photos & Continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
