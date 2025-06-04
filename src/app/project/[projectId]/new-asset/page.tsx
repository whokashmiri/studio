
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
import { ArrowLeft, Camera, ImageUp, Save, ArrowRight, X, Edit3 } from 'lucide-react';
import type { Project, Asset, ProjectStatus } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';

type AssetCreationStep = 'name' | 'photos' | 'description';

export default function NewAssetPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const projectId = params.projectId as string;
  const folderId = searchParams.get('folderId') || null;
  const assetIdToEdit = searchParams.get('assetId');

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentStep, setCurrentStep] = useState<AssetCreationStep>('name');
  const [project, setProject] = useState<Project | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetSummary, setAssetSummary] = useState<string | undefined>(undefined);
  
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]); 
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  
  const { toast } = useToast();
  const { t } = useLanguage();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);


  const loadProjectAndAsset = useCallback(() => {
    if (projectId) {
      const allProjects = LocalStorageService.getProjects();
      const foundProject = allProjects.find(p => p.id === projectId);
      setProject(foundProject || null);
      if (!foundProject) {
        toast({ title: t('projectNotFound', "Project Not Found"), variant: "destructive" });
        router.push('/');
        return;
      }

      if (assetIdToEdit) {
        const foundAsset = LocalStorageService.getAssets().find(a => a.id === assetIdToEdit && a.projectId === projectId);
        if (foundAsset) {
          setIsEditMode(true);
          setAssetName(foundAsset.name);
          setAssetDescription(foundAsset.description);
          setAssetSummary(foundAsset.summary);
          setPhotoPreviews(foundAsset.photos || []); 
        } else {
          toast({ title: t('assetNotFound', "Asset Not Found"), variant: "destructive" });
          router.push(`/project/${projectId}${folderId ? `?folderId=${folderId}` : ''}`);
        }
      }
    }
  }, [projectId, assetIdToEdit, router, toast, t, folderId]);

  useEffect(() => {
    loadProjectAndAsset();
  }, [loadProjectAndAsset]);

  useEffect(() => {
    if (isEditMode && assetName && currentStep === 'name') {
      setCurrentStep('description');
    }
  }, [isEditMode, assetName, currentStep]);
  

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          if (loadEvent.target?.result) {
            setPhotoPreviews(prev => [...prev, loadEvent.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    event.target.value = ''; 
  };

  const removePhoto = (indexToRemove: number) => {
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

  const handleSaveAssetFlow = (descriptionFromInput: string, summaryFromInput?: string) => {
    if (!project) {
      toast({ title: t('projectContextLost', "Project context lost"), variant: "destructive" });
      return;
    }
     if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), variant: "destructive" });
      setCurrentStep('name'); 
      setIsPhotoModalOpen(false); 
      return;
    }

    const updatedProjectData = {
      ...project,
      lastAccessed: new Date().toISOString(),
      status: 'recent' as ProjectStatus,
    };
    LocalStorageService.updateProject(updatedProjectData);
    setProject(updatedProjectData);
    
    const assetData: Asset = {
      id: isEditMode && assetIdToEdit ? assetIdToEdit : `asset_${Date.now()}`,
      name: assetName,
      projectId: project.id,
      folderId: folderId,
      photos: photoPreviews, 
      description: descriptionFromInput,
      summary: summaryFromInput,
      createdAt: isEditMode && assetIdToEdit ? LocalStorageService.getAssets().find(a=>a.id===assetIdToEdit)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(), 
    };
    
    if (isEditMode) {
      LocalStorageService.updateAsset(assetData);
      toast({ title: t('assetUpdatedTitle', "Asset Updated"), description: t('assetUpdatedDesc', `Asset "${assetName}" has been updated.`, { assetName: assetName }) });
    } else {
      LocalStorageService.addAsset(assetData); 
      toast({ title: t('assetSavedTitle', "Asset Saved"), description: t('assetSavedDesc', `Asset "${assetName}" has been saved.`, { assetName: assetName }) });
    }
    router.push(`/project/${project.id}${folderId ? `?folderId=${folderId}` : ''}`);
  };


  if (!project) {
    return <div className="container mx-auto p-4 text-center">{t('loadingProjectContext', 'Loading project context...')}</div>;
  }

  const pageTitle = isEditMode ? t('editAssetTitle', "Edit Asset") : t('newAsset', 'Create New Asset');
  const saveButtonText = isEditMode ? t('updateAssetButton', "Update Asset") : t('saveDescription', 'Save Description & Asset');

  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-headline">{pageTitle} {t('forProject', 'for')} {project.name}</CardTitle>
              {folderId && <CardDescription>{t('inFolder', 'In folder:')} {LocalStorageService.getFolders().find(f=>f.id === folderId)?.name || t('unknownFolder', 'Unknown Folder')}</CardDescription>}
              <CardDescription>{t('step1Of3', 'Step 1 of 3:')} {t('enterAssetNamePrompt', 'Enter the asset name.')}</CardDescription>
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
               <CardTitle className="text-xl sm:text-2xl font-headline">
                {isEditMode ? t('editAssetDetailsTitle', 'Edit Details for:') : t('addDescriptionFor', 'Add Description for:')} <span className="text-primary">{assetName}</span>
               </CardTitle>
              <CardDescription>
                {isEditMode ? t('updateDetailsPrompt', 'Update the details for this asset.') : `${t('step3Of3', 'Step 3 of 3:')} ${t('provideDetailsPrompt', 'Provide detailed information about the asset.')}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isEditMode && (
                     <div className="space-y-2">
                        <Label htmlFor="asset-name-edit">{t('assetName', 'Asset Name')}</Label>
                        <Input
                        id="asset-name-edit"
                        value={assetName}
                        onChange={(e) => setAssetName(e.target.value)}
                        placeholder={t('assetNamePlaceholder', "e.g., Main Entrance Column")}
                        />
                    </div>
                )}
                {photoPreviews.length > 0 && (
                <div className="space-y-2">
                    <Label>{t('photosAdded', 'Photos Added')} ({photoPreviews.length})</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {photoPreviews.map((src, index) => (
                        <div key={index} className="relative group">
                          <img src={src} alt={t('previewPhotoAlt', `Preview ${index + 1}`, {number: index + 1})} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
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
                 <Button variant="outline" size="sm" onClick={() => { setIsPhotoModalOpen(true); }} className="mt-2">
                    <Edit3 className="mr-2 h-4 w-4" /> {t('editPhotos', 'Add/Edit Photos')}
                 </Button>
              <AssetDescriptionInput 
                assetName={assetName}
                initialDescription={assetDescription}
                initialSummary={assetSummary}
                onSave={handleSaveAssetFlow}
                saveButtonText={saveButtonText}
              />
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  const backLinkHref = `/project/${projectId}${folderId ? `?folderId=${folderId}` : ''}`;
  const backLinkText = `${t('backTo', 'Back to')} ${project.name}`;


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Link href={backLinkHref} className="text-sm text-primary hover:underline flex items-center mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        {backLinkText}
      </Link>
      
       {renderStepContent()}

      <Dialog open={isPhotoModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { 
            handlePhotosSubmittedOrSkipped(); 
            if (currentStep === 'name' && assetName.trim() && !isEditMode){ 
                 setCurrentStep('description');
            } else if (isEditMode && currentStep === 'name'){
                 setCurrentStep('description'); 
            }
          } else {
            setIsPhotoModalOpen(true);
          }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-headline">{isEditMode ? t('editAssetPhotosTitle', 'Edit Photos for') : t('step2Of3', 'Step 2 of 3:')} {t('addPhotosFor', 'Add Photos for')} "{assetName}"</DialogTitle>
            <DialogDescription>{t('takeOrUploadPhotosPromptNoLimit', "You can take new photos using your device camera or upload from your gallery.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-grow overflow-y-auto">
            <div className="flex flex-col sm:flex-row gap-2">
            <Button 
                variant="outline" 
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:w-auto">
                <Camera className="mr-2 h-4 w-4" /> {t('takePhotos', 'Take Photos')}
              </Button>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                id="camera-input-modal" 
                ref={cameraInputRef}
                className="hidden" 
                onChange={handlePhotoUpload} 
                multiple
              />
              
              <Button variant="outline" onClick={() => galleryInputRef.current?.click()} className="w-full sm:w-auto">
                <ImageUp className="mr-2 h-4 w-4" /> {t('uploadFromGallery', 'Upload from Gallery')}
              </Button>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                id="gallery-input-modal" 
                ref={galleryInputRef}
                className="hidden" 
                onChange={handlePhotoUpload} 
              />
            </div>

            {photoPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {photoPreviews.map((src, index) => (
                  <div key={index} className="relative group">
                    <img src={src} alt={t('previewPhotoAlt', `Preview ${index + 1}`, {number: index+1})} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
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
          <DialogFooter className="flex flex-row justify-end space-x-2 pt-4 border-t">
             <Button variant="outline" onClick={handlePhotosSubmittedOrSkipped} className="flex-1 sm:flex-auto">
                {photoPreviews.length > 0 || isEditMode ? t('confirmPhotosAndContinue', 'Confirm Photos & Continue') : t('skipPhotosAndNext', 'Skip Photos & Next')}
             </Button>
             <Button onClick={handlePhotosSubmittedOrSkipped} disabled={photoPreviews.length === 0 && !isEditMode} className="flex-1 sm:flex-auto">
                <Save className="mr-2 h-4 w-4" /> {isEditMode ? t('saveChangesAndContinue', 'Save Changes & Continue') : t('savePhotosAndContinue', 'Save Photos & Continue')}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

