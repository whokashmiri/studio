
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Camera, ImageUp, Save, ArrowRight, X, Edit3, CheckCircle, CircleDotDashed, PackagePlus } from 'lucide-react';
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
  
  const [isCustomCameraOpen, setIsCustomCameraOpen] = useState(false);
  const [capturedPhotosInSession, setCapturedPhotosInSession] = useState<string[]>([]);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null); 

  const { toast } = useToast();
  const { t } = useLanguage();


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

  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    const getCameraStream = async () => {
      if (isCustomCameraOpen) {
        try {
          streamInstance = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          setMediaStream(streamInstance);
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = streamInstance;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: t('cameraAccessDeniedTitle', 'Camera Access Denied'),
            description: t('cameraAccessDeniedDesc', 'Please enable camera permissions in your browser settings to use this app.'),
          });
          setIsCustomCameraOpen(false); 
        }
      }
    };

    getCameraStream();

    return () => { 
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setMediaStream(null);
    };
  }, [isCustomCameraOpen, toast, t]);


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

  const handleCapturePhotoFromStream = () => {
    if (videoRef.current && canvasRef.current && hasCameraPermission) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const photoDataUrl = canvas.toDataURL('image/jpeg'); 
        setCapturedPhotosInSession(prev => [...prev, photoDataUrl]);
      } else {
         toast({ title: t('photoCaptureErrorTitle', "Photo Capture Error"), description: t('canvasContextError', "Could not get canvas context."), variant: "destructive" });
      }
    } else {
      toast({ title: t('photoCaptureErrorTitle', "Photo Capture Error"), description: t('cameraNotReadyError', "Camera not ready or permission denied."), variant: "destructive" });
    }
  };

  const removePhotoFromSession = (indexToRemove: number) => {
    setCapturedPhotosInSession(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAddSessionPhotosToBatch = () => {
    setPhotoPreviews(prev => [...prev, ...capturedPhotosInSession]);
    setCapturedPhotosInSession([]);
    setIsCustomCameraOpen(false);
  };

  const handleCancelCustomCamera = () => {
    setCapturedPhotosInSession([]);
    setIsCustomCameraOpen(false);
  };
  
  const removePhotoFromPreviews = (indexToRemove: number) => { 
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
    if (currentStep === 'name' && assetName.trim()){ 
        setCurrentStep('description');
    }
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
                {t('nextAddManagePhotos', 'Next: Add/Manage Photos')} <ArrowRight className="ml-2 h-4 w-4" />
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
                    <div className="grid grid-cols-6 gap-1.5">
                    {photoPreviews.map((src, index) => (
                        <div key={`desc-preview-${index}-${src.substring(0,20)}`} className="relative group">
                          <img src={src} alt={t('previewPhotoAlt', `Preview ${index + 1}`, {number: index + 1})} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
                          <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              onClick={() => removePhotoFromPreviews(index)}
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
      <canvas ref={canvasRef} className="hidden"></canvas> 
      <Link href={backLinkHref} className="text-sm text-primary hover:underline flex items-center mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        {backLinkText}
      </Link>
      
       {renderStepContent()}

      <Dialog open={isPhotoModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            if (currentStep === 'name' && assetName.trim()) {
                setCurrentStep('description');
            }
          }
          setIsPhotoModalOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-headline">
                {isEditMode ? t('editAssetPhotosTitle', 'Edit Photos for') : t('step2Of3ManagePhotos', 'Step 2 of 3: Manage Photos for')} "{assetName}"
            </DialogTitle>
            <DialogDescription>{t('manageAssetPhotosDesc', "Take new photos with the custom camera, upload from gallery, or remove existing photos.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-grow overflow-y-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCustomCameraOpen(true)}
                className="w-full sm:w-auto">
                <Camera className="mr-2 h-4 w-4" /> {t('takePhotosCustomCamera', 'Take Photos (Camera)')}
              </Button>
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

            <div className="space-y-2 mt-4">
              <Label>{t('currentPhotoBatch', 'Current Photo Batch')} ({photoPreviews.length})</Label>
              {photoPreviews.length > 0 ? (
                <ScrollArea className="max-h-[300px] pr-3">
                  <div className="grid grid-cols-6 gap-1.5">
                    {photoPreviews.map((src, index) => (
                      <div key={`batch-${index}-${src.substring(0,20)}`} className="relative group">
                        <img src={src} alt={t('previewBatchPhotoAlt', `Batch Preview ${index + 1}`, { number: index + 1 })} data-ai-hint="asset photo batch" className="rounded-md object-cover aspect-square" />
                         <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            onClick={() => removePhotoFromPreviews(index)}
                            title={t('removePhotoTitle', "Remove photo")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t('noPhotosInBatch', 'No photos in the current batch yet.')}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-end space-x-2 pt-4 border-t">
             <Button variant="outline" onClick={handlePhotosSubmittedOrSkipped} className="flex-1 sm:flex-auto">
                {currentStep === 'name' ? t('confirmAndContinueToDesc', 'Confirm & Continue to Description') : t('doneWithPhotos', 'Done with Photos')}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Camera UI Dialog */}
      <Dialog open={isCustomCameraOpen} onOpenChange={setIsCustomCameraOpen}>
        <DialogContent className="p-0 m-0 w-full h-full max-w-full max-h-full sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:max-w-4xl sm:max-h-[90vh] sm:rounded-lg overflow-hidden flex flex-col bg-black text-white">
          <DialogHeader>
            <DialogTitle className="sr-only">{t('customCameraViewTitle', 'Custom Camera View')}</DialogTitle>
          </DialogHeader>
          <div className="relative flex-grow w-full h-full flex items-center justify-center">
            {hasCameraPermission === false && (
              <Alert variant="destructive" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 max-w-md z-20">
                <AlertTitle>{t('cameraAccessDeniedTitle', 'Camera Access Denied')}</AlertTitle>
                <AlertDescription>{t('cameraAccessDeniedEnableSettings', 'Please enable camera permissions in your browser settings and refresh.')}</AlertDescription>
              </Alert>
            )}
             {hasCameraPermission === null && (
                 <div className="flex flex-col items-center text-center p-4 z-10">
                    <CircleDotDashed className="w-16 h-16 animate-spin mb-4 text-gray-400" />
                    <p className="text-lg text-gray-300">{t('initializingCamera', 'Initializing Camera...')}</p>
                    <p className="text-sm text-gray-500">{t('allowCameraAccessPrompt', 'Please allow camera access when prompted.')}</p>
                 </div>
             )}
            <video 
              ref={videoRef} 
              className={`w-full h-full object-cover ${hasCameraPermission ? 'opacity-100' : 'opacity-30'}`} 
              autoPlay 
              muted 
              playsInline 
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 z-10">
              {capturedPhotosInSession.length > 0 && (
                <ScrollArea className="w-full mb-3 max-h-24 whitespace-nowrap">
                  <div className="flex space-x-2 pb-2">
                    {capturedPhotosInSession.map((src, index) => (
                      <div key={`session-preview-${index}`} className="relative h-16 w-16 shrink-0">
                        <img src={src} alt={t('sessionPhotoPreviewAlt', `Session Preview ${index + 1}`, {number: index + 1})} data-ai-hint="session photo" className="h-full w-full object-cover rounded-md" />
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute -top-1 -right-1 h-5 w-5"
                          onClick={() => removePhotoFromSession(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <div className="flex items-center justify-around">
                <Button variant="ghost" onClick={handleCancelCustomCamera} className="text-white hover:bg-white/20">
                  {t('cancel', 'Cancel')}
                </Button>
                <Button 
                  onClick={handleCapturePhotoFromStream} 
                  disabled={!hasCameraPermission || mediaStream === null}
                  className="w-16 h-16 rounded-full bg-white text-black hover:bg-gray-200 focus:ring-4 focus:ring-white/50 flex items-center justify-center p-0"
                  aria-label={t('capturePhoto', 'Capture Photo')}
                >
                  <Camera className="w-8 h-8" />
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleAddSessionPhotosToBatch} 
                  disabled={capturedPhotosInSession.length === 0}
                  className="text-white hover:bg-white/20"
                >
                   {t('doneWithSession', 'Done')} ({capturedPhotosInSession.length})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    

    