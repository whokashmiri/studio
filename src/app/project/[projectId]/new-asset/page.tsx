
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
import { ArrowLeft, Camera, ImageUp, Save, ArrowRight, X, Edit3, AlertTriangle, Video, VideoOff } from 'lucide-react';
import type { Project, Asset, ProjectStatus } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null); 
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);


  const loadProject = useCallback(() => {
    if (projectId) {
      const allProjects = LocalStorageService.getProjects();
      const foundProject = allProjects.find(p => p.id === projectId);
      setProject(foundProject || null);
      if (!foundProject) {
        toast({ title: t('projectNotFound', "Project Not Found"), variant: "destructive" });
        router.push('/');
      }
    }
  }, [projectId, router, toast, t]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);
  
  const startCameraStream = useCallback(async () => {
    if (isCameraActive || isCameraStarting) return;
    setIsCameraStarting(true);
    setHasCameraPermission(null); 

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(err => {
          console.error("Error playing video stream:", err);
          throw err; 
        });
      }
      setHasCameraPermission(true);
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setIsCameraActive(false);
      let errorTitle = t('cameraErrorTitle', 'Camera Error');
      let errorDesc = t('cameraErrorDesc', 'Could not access the camera.');
      if ((error as Error).name === 'NotAllowedError' || (error as Error).name === 'PermissionDeniedError') {
        errorTitle = t('cameraAccessDeniedTitle', 'Camera Access Denied');
        errorDesc = t('cameraAccessDeniedDesc', 'Please enable camera permissions in your browser settings.');
      } else if ((error as Error).name === 'NotFoundError' || (error as Error).name === 'DevicesNotFoundError') {
         errorTitle = t('cameraNotFoundTitle', 'Camera Not Found');
         errorDesc = t('cameraNotFoundDesc', 'No camera was found. Please ensure a camera is connected and enabled.');
      }
      toast({
        variant: 'destructive',
        title: errorTitle,
        description: errorDesc,
      });
    } finally {
      setIsCameraStarting(false);
    }
  }, [isCameraActive, isCameraStarting, toast, t]);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const handleCapturePhoto = useCallback(async () => {
    if (!videoRef.current || !streamRef.current || photos.length >= MAX_PHOTOS || isCapturingPhoto) return;
    setIsCapturingPhoto(true);

    const video = videoRef.current;
    const tempCanvas = canvasRef.current || document.createElement('canvas');
    if (!canvasRef.current) { 
        tempCanvas.style.display = 'none';
        document.body.appendChild(tempCanvas);
    }
    
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const context = tempCanvas.getContext('2d');
    context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    try {
        const blob = await new Promise<Blob | null>((resolve) => tempCanvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setPhotos(prev => [...prev, file].slice(0, MAX_PHOTOS));
            const newPreviewUrl = URL.createObjectURL(file);
            setPhotoPreviews(prev => [...prev, newPreviewUrl].slice(0, MAX_PHOTOS));
        } else {
            throw new Error("Canvas toBlob returned null");
        }
    } catch (error) {
        console.error("Error capturing photo: ", error);
        toast({ title: t('photoCaptureErrorTitle', "Photo Capture Error"), description: t('photoCaptureErrorDesc', "Could not capture photo."), variant: "destructive" });
    } finally {
        if (!canvasRef.current && tempCanvas.parentNode) { 
            document.body.removeChild(tempCanvas);
        }
        setIsCapturingPhoto(false);
    }
  }, [photos.length, isCapturingPhoto, toast, t]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    stopCameraStream(); 
    setShowCameraPreview(false);

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
      
      const newPreviews = combinedFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prevPreviews => {
          prevPreviews.forEach(url => URL.revokeObjectURL(url)); 
          return newPreviews;
      });
    }
    event.target.value = '';
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
    stopCameraStream(); 
    setIsPhotoModalOpen(false);
    setShowCameraPreview(false); 
    setCurrentStep('description');
  };

  const handleSaveAsset = (description: string, summary?: string) => {
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
    setProject(updatedProjectData); // Update local project state
    
    const newAsset: Asset = {
      id: `asset_${Date.now()}`,
      name: assetName,
      projectId: project.id,
      folderId: folderId,
      photos: photoPreviews, 
      description: description,
      summary: summary,
      createdAt: new Date().toISOString(),
    };
    
    LocalStorageService.addAsset(newAsset); 

    toast({ title: t('assetSavedTitle', "Asset Saved"), description: t('assetSavedDesc', `Asset "${assetName}" has been saved.`, { assetName: assetName }) });
    router.push(`/project/${project.id}${folderId ? `?folderId=${folderId}` : ''}`);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [stopCameraStream, photoPreviews]);

  useEffect(() => {
    if (!isPhotoModalOpen) {
        stopCameraStream();
        setShowCameraPreview(false);
    }
  }, [isPhotoModalOpen, stopCameraStream]);


  if (!project) {
    return <div className="container mx-auto p-4 text-center">{t('loadingProjectContext', 'Loading project context...')}</div>;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-headline">{t('newAsset', 'Create New Asset')} {t('forProject', 'for')} {project.name}</CardTitle>
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
              <CardTitle className="text-xl sm:text-2xl font-headline">{t('addDescriptionFor', 'Add Description for:')} <span className="text-primary">{assetName}</span></CardTitle>
              <CardDescription>{t('step3Of3', 'Step 3 of 3:')} {t('provideDetailsPrompt', 'Provide detailed information about the asset.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {photoPreviews.length > 0 && (
                <div className="space-y-2">
                    <Label>{t('photosAdded', 'Photos Added')} ({photoPreviews.length}/{MAX_PHOTOS})</Label>
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
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {renderStepContent()}

      <Dialog open={isPhotoModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { 
            handlePhotosSubmittedOrSkipped(); 
            if (currentStep === 'name' && assetName.trim()){ 
                 setCurrentStep('description');
            }
          } else {
            setIsPhotoModalOpen(true);
          }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('step2Of3', 'Step 2 of 3:')} {t('addPhotosFor', 'Add Photos for')} "{assetName}"</DialogTitle>
            <DialogDescription>{t('takeOrUploadPhotosPrompt', `You can take new photos or upload from your gallery. Max {MAX_PHOTOS} photos.`, {MAX_PHOTOS: MAX_PHOTOS})}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col sm:flex-row gap-2">
            <Button 
                variant="outline" 
                onClick={() => {
                  setShowCameraPreview(true); 
                  if (!isCameraActive && hasCameraPermission !== false) { 
                    startCameraStream(); 
                  }
                }} 
                className="w-full sm:w-auto" 
                disabled={photos.length >= MAX_PHOTOS}>
                <Camera className="mr-2 h-4 w-4" /> {t('takePhotos', 'Take Photos')}
              </Button>
              
              <Button variant="outline" onClick={() => {
                  stopCameraStream(); 
                  setShowCameraPreview(false); 
                  document.getElementById('gallery-input-modal')?.click()
                }} className="w-full sm:w-auto" disabled={photos.length >= MAX_PHOTOS}>
                <ImageUp className="mr-2 h-4 w-4" /> {t('uploadFromGallery', 'Upload from Gallery')}
              </Button>
              <input type="file" accept="image/*" multiple id="gallery-input-modal" className="hidden" onChange={handlePhotoUpload} />
            </div>

            {showCameraPreview && (
              <div className="space-y-2 pt-4">
                <div className="relative">
                  <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                  {(!isCameraActive || (hasCameraPermission === false && videoRef.current?.srcObject === null)) && ( 
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 rounded-md p-4 text-center">
                        {hasCameraPermission === false ? ( 
                           <>
                              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                              <p className="font-semibold">{t('cameraAccessDeniedTitle', 'Camera Access Denied')}</p>
                              <p className="text-sm text-muted-foreground">{t('cameraAccessDeniedDesc', 'Please enable camera permissions in your browser settings.')}</p>
                           </>
                        ): ( 
                           <Button onClick={startCameraStream} variant="outline" size="lg" disabled={isCameraStarting}>
                              <Video className="mr-2 h-5 w-5" /> {isCameraStarting ? t('startingCamera', 'Starting...') : t('startCamera', 'Start Camera')}
                           </Button>
                        )}
                     </div>
                  )}
                </div>

                {hasCameraPermission !== false && isCameraActive && ( 
                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <Button onClick={handleCapturePhoto} disabled={photos.length >= MAX_PHOTOS || isCapturingPhoto} className="flex-1">
                      <Camera className="mr-2 h-4 w-4" /> 
                      {isCapturingPhoto ? t('capturingPhoto', 'Capturing...') : t('capturePhoto', 'Capture Photo')} ({photos.length}/{MAX_PHOTOS})
                    </Button>
                    <Button onClick={stopCameraStream} variant="outline" className="sm:flex-none">
                      <VideoOff className="mr-2 h-4 w-4" /> {t('stopCamera', 'Stop Camera')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {photos.length >= MAX_PHOTOS && !showCameraPreview && ( 
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
             {photoPreviews.length === 0 && !showCameraPreview && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('noPhotosAddedYet', 'No photos added yet.')}</p>
             )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={handlePhotosSubmittedOrSkipped} className="w-full sm:w-auto">
              {photoPreviews.length > 0 ? t('nextStepDescription', 'Next: Description') : t('skipPhotosAndNext', 'Skip Photos & Next')}
            </Button>
            <Button onClick={handlePhotosSubmittedOrSkipped} disabled={photos.length === 0 && photoPreviews.length === 0 && !isCameraActive} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> {t('savePhotosAndContinue', 'Save Photos & Continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
