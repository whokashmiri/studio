
"use client";
import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, ImageUp, Save, ArrowRight, X, Edit3, CheckCircle, CircleDotDashed, PackagePlus, Trash2, Mic, BrainCircuit, Info, Loader2 } from 'lucide-react';
import type { Project, Asset, ProjectStatus, Folder } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { processImageForSaving } from '@/lib/image-handler-service';
import { useAuth } from '@/contexts/auth-context';

type AssetCreationStep = 'photos_and_name' | 'descriptions';
const CAMERA_PERMISSION_GRANTED_KEY = 'assetInspectorProCameraPermissionGrantedV1';

export default function NewAssetPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const projectId = params.projectId as string;
  const folderId = searchParams.get('folderId') || null;
  const assetIdToEdit = searchParams.get('assetId');

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentStep, setCurrentStep] = useState<AssetCreationStep>('photos_and_name');
  const [project, setProject] = useState<Project | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [assetName, setAssetName] = useState('');
  const [assetVoiceDescription, setAssetVoiceDescription] = useState('');
  const [assetTextDescription, setAssetTextDescription] = useState('');
  
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]); 
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false); 
  
  const [isCustomCameraOpen, setIsCustomCameraOpen] = useState(false);
  const [capturedPhotosInSession, setCapturedPhotosInSession] = useState<string[]>([]);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null); 

  const [isListening, setIsListening] = useState(false);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);


  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();

  const loadProjectAndAsset = useCallback(async () => {
    setIsLoadingPage(true);
    if (projectId) {
      try {
        const foundProject = await FirestoreService.getProjectById(projectId);
        setProject(foundProject || null);

        if (!foundProject) {
          toast({ title: t('projectNotFound', "Project Not Found"), variant: "destructive" });
          router.push('/');
          return;
        }

        if (folderId) {
          const allFolders = await FirestoreService.getFolders(projectId);
          const foundFolder = allFolders.find(f => f.id === folderId);
          setCurrentFolder(foundFolder || null);
        } else {
          setCurrentFolder(null);
        }

        if (assetIdToEdit) {
          const foundAsset = await FirestoreService.getAssetById(assetIdToEdit);
          if (foundAsset && foundAsset.projectId === projectId) {
            setIsEditMode(true);
            setAssetName(foundAsset.name);
            setAssetVoiceDescription(foundAsset.voiceDescription || '');
            setAssetTextDescription(foundAsset.textDescription || '');
            setPhotoPreviews(foundAsset.photos || []); 
            setCurrentStep('descriptions'); 
          } else {
            toast({ title: t('assetNotFound', "Asset Not Found"), variant: "destructive" });
            router.push(`/project/${projectId}${folderId ? `?folderId=${folderId}` : ''}`);
          }
        }
      } catch (error) {
        console.error("Error loading project/asset:", error);
        toast({ title: "Error", description: "Failed to load data.", variant: "destructive"});
        router.push('/');
      } finally {
        setIsLoadingPage(false);
      }
    }
  }, [projectId, assetIdToEdit, router, toast, t, folderId]);

  useEffect(() => {
    loadProjectAndAsset();
  }, [loadProjectAndAsset]);

 useEffect(() => {
    let streamInstance: MediaStream | null = null;
    const getCameraStream = async () => {
      if (isCustomCameraOpen) {
        setHasCameraPermission(null); 
        try {
          streamInstance = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          setMediaStream(streamInstance);
          setHasCameraPermission(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem(CAMERA_PERMISSION_GRANTED_KEY, 'true');
          }
          if (videoRef.current) {
            videoRef.current.srcObject = streamInstance;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          if (typeof window !== 'undefined') {
            localStorage.setItem(CAMERA_PERMISSION_GRANTED_KEY, 'false');
          }
        }
      }
    };
    
    if (isCustomCameraOpen) {
        getCameraStream();
    }
    
    return () => { 
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setMediaStream(null);
    };
  }, [isCustomCameraOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechRecognitionAvailable(true);
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      speechRecognitionRef.current = new SpeechRecognitionAPI();
      const recognition = speechRecognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setAssetVoiceDescription(prev => prev ? `${prev} ${transcript}`.trim() : transcript);
        setIsListening(false);
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error, event.message);
        let errorMessage = event.message || event.error;
        if (event.error === 'no-speech') errorMessage = t('speechErrorNoSpeech', 'No speech detected. Please try again.');
        else if (event.error === 'audio-capture') errorMessage = t('speechErrorAudioCapture', 'Audio capture failed. Check microphone permissions.');
        else if (event.error === 'not-allowed') errorMessage = t('speechErrorNotAllowed', 'Microphone access denied. Please allow microphone access.');
        toast({ title: t('speechErrorTitle', 'Speech Recognition Error'), description: errorMessage, variant: 'destructive' });
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setSpeechRecognitionAvailable(false);
    }
  }, [toast, language, t]);

  useEffect(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    }
  }, [language]);


  const handlePhotoUploadFromGallery = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setIsProcessingPhotos(true);
      const newFiles = Array.from(event.target.files);
      if (newFiles.length === 0) {
        setIsProcessingPhotos(false);
        return;
      }
      const processedDataUris: string[] = [];
      try {
        for (const file of newFiles) {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = (loadEvent) => {
              if (loadEvent.target?.result) resolve(loadEvent.target.result as string);
              else reject(new Error('Failed to read file.'));
            };
            reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
            reader.readAsDataURL(file);
          });
          const processedUrl = await processImageForSaving(dataUrl);
          if (processedUrl) {
            processedDataUris.push(processedUrl);
          } else {
            toast({ title: "Image Processing Error", description: `Failed to process ${file.name}.`, variant: "destructive" });
          }
        }
        setPhotoPreviews(prev => [...prev, ...processedDataUris]);
        if (!isPhotoModalOpen) setIsPhotoModalOpen(true);
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "An error occurred processing gallery photos.", variant: "destructive" });
      } finally {
        setIsProcessingPhotos(false);
      }
    }
    if (event.target) event.target.value = '';
  }, [toast, isPhotoModalOpen]);

  const handleCapturePhotoFromStream = () => {
    if (videoRef.current && canvasRef.current && hasCameraPermission && mediaStream) {
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
    }
  };

  const removePhotoFromSession = (indexToRemove: number) => {
    setCapturedPhotosInSession(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAddSessionPhotosToBatch = useCallback(async () => {
    if (capturedPhotosInSession.length === 0) return;
    setIsProcessingPhotos(true);
    const newProcessedDataUris: string[] = [];
    try {
      for (const photoDataUrl of capturedPhotosInSession) {
        const processedUrl = await processImageForSaving(photoDataUrl);
        if (processedUrl) {
          newProcessedDataUris.push(processedUrl);
        } else {
          toast({ title: "Image Processing Error", description: "A photo from session failed to process.", variant: "destructive" });
        }
      }
      setPhotoPreviews(prev => [...prev, ...newProcessedDataUris]);
      setCapturedPhotosInSession([]);
      setIsCustomCameraOpen(false);
      if (!isPhotoModalOpen && photoPreviews.length + newProcessedDataUris.length > 0) {
        setIsPhotoModalOpen(true);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process session photos.", variant: "destructive" });
    } finally {
      setIsProcessingPhotos(false);
    }
  }, [capturedPhotosInSession, toast, isPhotoModalOpen, photoPreviews.length]);

  const handleCancelCustomCamera = () => {
    setCapturedPhotosInSession([]);
    setIsCustomCameraOpen(false);
  };
  
  const removePhotoFromPreviews = (indexToRemove: number) => { 
    setPhotoPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleNextToDescriptions = () => {
    if (photoPreviews.length === 0) {
      toast({ title: t('photosRequiredTitle', "Photos Required"), description: t('photosRequiredDesc', "Please add at least one photo for the asset."), variant: "destructive" });
      return;
    }
    if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), description: t('assetNameRequiredDesc', "Please enter a name for the asset."), variant: "destructive" });
      return;
    }
    setCurrentStep('descriptions');
    setIsPhotoModalOpen(false);
  };

  const toggleListening = () => {
    if (!speechRecognitionRef.current || !speechRecognitionAvailable) {
      toast({ title: t('speechFeatureNotAvailableTitle', 'Feature Not Available'), description: t('speechFeatureNotAvailableDesc', 'Speech recognition is not supported or enabled in your browser.'), variant: 'destructive' });
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        console.error("Error starting speech recognition:", e);
        toast({ title: t('speechErrorTitle', 'Could not start speech recognition'), description: e.message || t('speechStartErrorDesc', 'Please ensure microphone permissions are granted.'), variant: 'destructive' });
        setIsListening(false);
      }
    }
  };

  const handleSaveAsset = async () => {
    if (!project) {
      toast({ title: t('projectContextLost', "Project context lost"), variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: t('error', 'Error'), description: t('userNotAuthenticatedError', "User not authenticated. Cannot save asset."), variant: "destructive" });
      return;
    }
     if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), variant: "destructive" });
      setCurrentStep('photos_and_name'); 
      return;
    }
    if (photoPreviews.length === 0 && !isEditMode) { 
      toast({ title: t('photosRequiredTitle', "Photos Required"), description: t('photosRequiredDesc', "Please add at least one photo for the asset."), variant: "destructive" });
      setCurrentStep('photos_and_name');
      return;
    }

    await FirestoreService.updateProject(project.id, {
      status: 'recent' as ProjectStatus,
    });
    
    const assetDataPayload: Partial<Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>> = {
      name: assetName,
      projectId: project.id,
      folderId: folderId,
      photos: photoPreviews,
    };

    if (assetVoiceDescription.trim()) {
      assetDataPayload.voiceDescription = assetVoiceDescription.trim();
    }
    if (assetTextDescription.trim()) {
      assetDataPayload.textDescription = assetTextDescription.trim();
    }
    
    let success = false;
    let savedAssetName = assetName;

    if (isEditMode && assetIdToEdit) {
      const updateData: Partial<Asset> = { ...assetDataPayload };
      const originalAsset = await FirestoreService.getAssetById(assetIdToEdit);
      if (originalAsset) updateData.createdAt = originalAsset.createdAt; 
      
      success = await FirestoreService.updateAsset(assetIdToEdit, updateData);
    } else {
      const dataForCreation = {
        ...assetDataPayload,
        userId: currentUser.id
      };
      const newAsset = await FirestoreService.addAsset(dataForCreation as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>);
      if (newAsset) {
        success = true;
        savedAssetName = newAsset.name;
      }
    }
    
    if (success) {
        toast({ 
            title: isEditMode ? t('assetUpdatedTitle', "Asset Updated") : t('assetSavedTitle', "Asset Saved"), 
            description: isEditMode ? 
                t('assetUpdatedDesc', `Asset "${savedAssetName}" has been updated.`, { assetName: savedAssetName }) :
                t('assetSavedDesc', `Asset "${savedAssetName}" has been saved.`, { assetName: savedAssetName })
        });
        router.push(`/project/${project.id}${folderId ? `?folderId=${folderId}` : ''}`);
    } else {
        toast({ title: "Error", description: isEditMode ? "Failed to update asset." : "Failed to save asset.", variant: "destructive" });
    }
  };

  if (isLoadingPage || !project && !assetIdToEdit) { 
    return (
        <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground mt-4">
                {t('loadingProjectContext', 'Loading project context...')}
            </p>
        </div>
    );
  }
  if (!project) { 
     return <div className="container mx-auto p-4 text-center">{t('projectNotFound', 'Project Not Found')}</div>;
  }


  const pageTitle = isEditMode ? t('editAssetTitle', "Edit Asset") : t('newAsset', 'Create New Asset');
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 'photos_and_name':
        return (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-headline">{pageTitle} {t('forProject', 'for')} {project.name}</CardTitle>
              {currentFolder && <CardDescription>{t('inFolder', 'In folder:')} {currentFolder.name}</CardDescription>}
              <CardDescription>{t('stepPhotosAndNameTitle', 'Step 1: Photos & Asset Name')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>{t('addPhotosSectionTitle', 'Add Photos')}</Label>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                    <Button variant="outline" onClick={() => setIsCustomCameraOpen(true)} className="flex-1" disabled={isProcessingPhotos}>
                        <Camera className="mr-2 h-4 w-4" /> {t('takePhotosCustomCamera', 'Take Photos (Camera)')}
                    </Button>
                    <Button variant="outline" onClick={() => galleryInputRef.current?.click()} className="flex-1" disabled={isProcessingPhotos}>
                        {isProcessingPhotos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                        {isProcessingPhotos ? t('saving', 'Processing...') : t('uploadFromGallery', 'Upload from Gallery')}
                    </Button>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        id="gallery-input-main"
                        ref={galleryInputRef}
                        className="hidden"
                        onChange={handlePhotoUploadFromGallery}
                        disabled={isProcessingPhotos}
                    />
                </div>
                {photoPreviews.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>{t('photosAdded', 'Photos Added')} ({photoPreviews.length})</Label>
                      <Button variant="outline" size="sm" onClick={() => setIsPhotoModalOpen(true)} disabled={isProcessingPhotos}>
                         <Edit3 className="mr-2 h-4 w-4" /> {t('managePhotosButton', 'Manage Photos')}
                      </Button>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {photoPreviews.slice(0, 6).map((src, index) => ( 
                          <div key={`main-preview-${index}-${src.substring(0,20)}`} className="relative group">
                            <img src={src} alt={t('previewPhotoAlt', `Preview ${index + 1}`, {number: index + 1})} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
                          </div>
                      ))}
                    </div>
                    {photoPreviews.length > 6 && <p className="text-xs text-muted-foreground text-center mt-1">{t('morePhotosInModal', `+${photoPreviews.length - 6} more. Click "Manage Photos" to see all.`, {count: photoPreviews.length - 6})}</p>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-name">{t('assetName', 'Asset Name')}</Label>
                <Input
                  id="asset-name"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder={t('assetNamePlaceholder', "e.g., Main Entrance Column")}
                  disabled={isProcessingPhotos}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleNextToDescriptions} disabled={photoPreviews.length === 0 || !assetName.trim() || isProcessingPhotos}>
                {t('nextStepDescriptions', 'Next: Add Descriptions')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
      case 'descriptions':
        return (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
               <CardTitle className="text-xl sm:text-2xl font-headline">
                {isEditMode ? t('editAssetDetailsTitle', 'Edit Details for:') : t('addDetailsForAssetTitle', 'Add Details for:')} <span className="text-primary">{assetName}</span>
               </CardTitle>
              <CardDescription>{t('stepDescriptionsTitle', 'Step 2: Descriptions')}</CardDescription>
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
                    <div className="flex justify-between items-center">
                      <Label>{t('photosAdded', 'Photos Added')} ({photoPreviews.length})</Label>
                       <Button variant="outline" size="sm" onClick={() => setIsPhotoModalOpen(true)}>
                          <Edit3 className="mr-2 h-4 w-4" /> {t('managePhotosButton', 'Manage Photos')}
                       </Button>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {photoPreviews.map((src, index) => (
                          <div key={`desc-preview-${index}-${src.substring(0,20)}`} className="relative group">
                            <img src={src} alt={t('previewPhotoAlt', `Preview ${index + 1}`, {number: index + 1})} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
                          </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="asset-voice-description">{t('voiceDescriptionLabel', 'Voice Description')}</Label>
                  {speechRecognitionAvailable ? (
                    <Button onClick={toggleListening} variant="outline" className="w-full sm:w-auto">
                      <Mic className={`mr-2 h-4 w-4 ${isListening ? 'animate-pulse text-destructive' : ''}`} />
                      {isListening ? t('listening', 'Listening...') : t('recordVoiceDescriptionButton', 'Record Voice Description')}
                    </Button>
                  ) : (
                     <Alert variant="default">
                        <Info className="h-4 w-4" />
                        <AlertTitle>{t('speechFeatureNotAvailableTitle', 'Speech Recognition Not Available')}</AlertTitle>
                        <AlertDescription>{t('speechFeatureNotAvailableDesc', 'Your browser does not support speech recognition.')}</AlertDescription>
                     </Alert>
                  )}
                  {assetVoiceDescription && (
                    <Textarea
                      id="asset-voice-description-display"
                      value={assetVoiceDescription}
                      readOnly
                      rows={3}
                      className="mt-2 bg-muted/50"
                      placeholder={t('voiceTranscriptPlaceholder', 'Voice transcript will appear here...')}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset-text-description">{t('textDescriptionLabel', 'Written Description')}</Label>
                  <Textarea
                    id="asset-text-description"
                    value={assetTextDescription}
                    onChange={(e) => setAssetTextDescription(e.target.value)}
                    placeholder={t('textDescriptionPlaceholder', 'Type detailed written description here...')}
                    rows={5}
                    className="resize-y"
                  />
                </div>
            </CardContent>
            <CardFooter className="flex flex-row justify-between items-center gap-2 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep('photos_and_name')}>
                {t('backToPhotosName', 'Back to Photos & Name')}
              </Button>
              <Button onClick={handleSaveAsset} size="lg">
                {isEditMode ? t('updateAssetButton', "Update Asset") : t('saveAssetButton', 'Save Asset')}
              </Button>
            </CardFooter>
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

      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-headline">
                {t('managePhotosModalTitle', 'Manage Photos for Asset:')} <span className="text-primary">{assetName || t('unnamedAsset', 'Unnamed Asset')}</span>
            </DialogTitle>
            <DialogDescription>{t('managePhotosModalDesc', "Add more photos using your camera or gallery, or remove existing ones from the batch.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-grow overflow-y-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => { setIsCustomCameraOpen(true); setIsPhotoModalOpen(false); }} 
                className="w-full sm:w-auto"
                disabled={isProcessingPhotos}>
                <Camera className="mr-2 h-4 w-4" /> {t('takePhotosCustomCamera', 'Take Photos (Camera)')}
              </Button>
              <Button variant="outline" onClick={() => galleryInputRef.current?.click()} className="w-full sm:w-auto" disabled={isProcessingPhotos}>
                {isProcessingPhotos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                {isProcessingPhotos ? t('saving', 'Processing...') : t('uploadFromGallery', 'Upload from Gallery')}
              </Button>
               <input 
                  type="file"
                  accept="image/*"
                  multiple
                  id="gallery-input-modal" 
                  ref={galleryInputRef} 
                  className="hidden"
                  onChange={handlePhotoUploadFromGallery}
                  disabled={isProcessingPhotos}
                />
            </div>

            <div className="space-y-2 mt-4">
              <Label>{t('currentPhotoBatch', 'Current Photo Batch')} ({photoPreviews.length})</Label>
              {photoPreviews.length > 0 ? (
                <ScrollArea className="h-[300px] pr-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                    {photoPreviews.map((src, index) => (
                      <div key={`batch-${index}-${src.substring(0,20)}`} className="relative group">
                        <img src={src} alt={t('previewBatchPhotoAlt', `Batch Preview ${index + 1}`, { number: index + 1 })} data-ai-hint="asset photo batch" className="rounded-md object-cover aspect-square" />
                         <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            onClick={() => removePhotoFromPreviews(index)}
                            title={t('removePhotoTitle', "Remove photo")}
                            disabled={isProcessingPhotos}
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
             <Button variant="outline" onClick={() => setIsPhotoModalOpen(false)}>
                {t('doneWithPhotos', 'Done with Photos')}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomCameraOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            // Logic for when camera is closed
          }
          setIsCustomCameraOpen(isOpen);
        }}>
         <DialogContent variant="fullscreen" className="bg-black text-white">
           <DialogTitle className="sr-only">{t('customCameraDialogTitle', 'Camera')}</DialogTitle>
            <div className="flex-1 relative bg-neutral-900 overflow-hidden"> 
              <video 
                ref={videoRef} 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hasCameraPermission === true ? 'opacity-100' : 'opacity-0'}`} 
                autoPlay 
                muted 
                playsInline 
              />
              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
                    <Alert variant="destructive" className="bg-white/5 text-white border-red-500/30 max-w-md backdrop-blur-sm">
                        <AlertTitle>{t('cameraAccessDeniedTitle', 'Camera Access Denied')}</AlertTitle>
                        <AlertDescription>{t('cameraAccessDeniedEnableSettings', 'Please enable camera permissions in your browser settings and refresh.')}</AlertDescription>
                    </Alert>
                </div>
              )}
              {hasCameraPermission === null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10 text-center">
                      <CircleDotDashed className="w-12 h-12 sm:w-16 sm:h-16 animate-spin mb-3 sm:mb-4 text-neutral-400" />
                      <p className="text-base sm:text-lg text-neutral-300">{t('initializingCamera', 'Initializing Camera...')}</p>
                      <p className="text-xs sm:text-sm text-neutral-500">{t('allowCameraAccessPrompt', 'Please allow camera access when prompted.')}</p>
                  </div>
              )}
            </div>

            <div className="py-3 px-4 sm:py-5 sm:px-6 bg-black/80 backdrop-blur-sm z-20">
              {isProcessingPhotos && (
                <div className="absolute inset-x-0 top-0 flex justify-center pt-2">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              {capturedPhotosInSession.length > 0 && (
                <ScrollArea className="w-full mb-3 sm:mb-4 max-h-[70px] sm:max-h-[80px] whitespace-nowrap">
                  <div className="flex space-x-2 pb-1">
                    {capturedPhotosInSession.map((src, index) => (
                      <div key={`session-preview-${index}`} className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-md overflow-hidden border-2 border-neutral-600">
                        <img src={src} alt={t('sessionPhotoPreviewAlt', `Session Preview ${index + 1}`, {number: index + 1})} data-ai-hint="session photo" className="h-full w-full object-cover" />
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute -top-1 -right-1 h-5 w-5 bg-black/60 hover:bg-red-600/80 border-none p-0"
                          onClick={() => removePhotoFromSession(index)}
                          aria-label={t('removePhotoTitle', "Remove photo")}
                          disabled={isProcessingPhotos}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={handleCancelCustomCamera} className="text-white hover:bg-white/10 py-2 px-3 sm:py-3 sm:px-4 text-sm sm:text-base" disabled={isProcessingPhotos}>
                  {t('cancel', 'Cancel')}
                </Button>
                <Button 
                  onClick={handleCapturePhotoFromStream} 
                  disabled={!hasCameraPermission || mediaStream === null || isProcessingPhotos}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-black hover:bg-neutral-200 focus:ring-4 focus:ring-white/50 flex items-center justify-center p-0 border-2 border-neutral-700 shadow-xl disabled:bg-neutral-600 disabled:opacity-70"
                  aria-label={t('capturePhoto', 'Capture Photo')}
                >
                  <Camera className="w-7 h-7 sm:w-9 sm:h-9" />
                </Button>
                <Button 
                  variant={capturedPhotosInSession.length > 0 ? "default" : "ghost"}
                  onClick={handleAddSessionPhotosToBatch} 
                  disabled={capturedPhotosInSession.length === 0 || isProcessingPhotos}
                  className={`py-2 px-3 sm:py-3 sm:px-4 text-sm sm:text-base transition-colors duration-150 ${capturedPhotosInSession.length > 0 ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'text-white hover:bg-white/10'}`}
                >
                   {isProcessingPhotos ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null }
                   {isProcessingPhotos ? t('saving', 'Processing...') : t('doneWithSessionAddPhotos', 'Add ({count})', { count: capturedPhotosInSession.length })}
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
