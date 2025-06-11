
"use client";
import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Keep Card for potential future use if modals are removed
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, ImageUp, Save, ArrowRight, X, Edit3, CheckCircle, CircleDotDashed, PackagePlus, Trash2, Mic, BrainCircuit, Info, Loader2 } from 'lucide-react';
import type { Project, Asset, ProjectStatus, Folder } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';

type AssetCreationStep = 'photos_capture' | 'name_input' | 'descriptions';
const CAMERA_PERMISSION_GRANTED_KEY = 'assetInspectorProCameraPermissionGrantedV1';

export default function NewAssetPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const projectId = params.projectId as string;
  const folderId = searchParams.get('folderId') || null;
  const assetIdToEdit = searchParams.get('assetId');

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentStep, setCurrentStep] = useState<AssetCreationStep>('photos_capture'); // Default to photos
  const [project, setProject] = useState<Project | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [assetName, setAssetName] = useState('');
  const [assetVoiceDescription, setAssetVoiceDescription] = useState('');
  const [assetTextDescription, setAssetTextDescription] = useState('');
  
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]); 
  
  // Main step modal states
  const [isPhotosCaptureModalOpen, setIsPhotosCaptureModalOpen] = useState(false);
  const [isNameInputModalOpen, setIsNameInputModalOpen] = useState(false);
  const [isDescriptionsModalOpen, setIsDescriptionsModalOpen] = useState(false);

  // Sub-modals for photo capture step
  const [isManagePhotosBatchModalOpen, setIsManagePhotosBatchModalOpen] = useState(false); 
  const [isCustomCameraOpen, setIsCustomCameraOpen] = useState(false);

  const [capturedPhotosInSession, setCapturedPhotosInSession] = useState<string[]>([]);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null); 
  const galleryInputModalRef = useRef<HTMLInputElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [isProcessingGalleryPhotos, setIsProcessingGalleryPhotos] = useState(false);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  const backLinkHref = `/project/${projectId}${currentFolder ? `?folderId=${currentFolder.id}` : ''}`;
  const backLinkText = project ? `${t('backTo', 'Back to')} ${project.name}` : t('backToProject', 'Back to Project');

  const handleCancelAllAndExit = useCallback(() => {
    // Clear all states and navigate back
    setAssetName('');
    setPhotoPreviews([]);
    setAssetVoiceDescription('');
    setAssetTextDescription('');
    setIsEditMode(false);
    // Close all modals
    setIsPhotosCaptureModalOpen(false);
    setIsNameInputModalOpen(false);
    setIsDescriptionsModalOpen(false);
    setIsCustomCameraOpen(false);
    setIsManagePhotosBatchModalOpen(false);
    router.push(backLinkHref);
  }, [router, backLinkHref, projectId, currentFolder]);

  const loadProjectAndAsset = useCallback(async () => {
    setIsLoadingPage(true);
    if (projectId) {
      try {
        const foundProject = await FirestoreService.getProjectById(projectId);
        setProject(foundProject || null);

        if (!foundProject) {
          toast({ title: t('projectNotFound', "Project Not Found"), variant: "destructive" });
          handleCancelAllAndExit(); 
          return;
        }

        if (folderId) {
          const foundFolder = await FirestoreService.getFolderById(folderId);
          if (foundFolder && foundFolder.projectId === projectId) {
            setCurrentFolder(foundFolder);
          } else {
            setCurrentFolder(null);
            if (folderId) { 
                 toast({ title: t('folderNotFoundOrInvalid', "Folder not found or invalid for this project"), variant: "warning" });
            }
          }
        } else {
          setCurrentFolder(null);
        }

        if (assetIdToEdit) {
          const foundAsset = await FirestoreService.getAssetById(assetIdToEdit);
          if (foundAsset && foundAsset.projectId === projectId) {
            if (foundAsset.folderId && (!folderId || folderId !== foundAsset.folderId)) {
                if(foundAsset.folderId) {
                    const assetActualFolder = await FirestoreService.getFolderById(foundAsset.folderId);
                    if (assetActualFolder && assetActualFolder.projectId === projectId) {
                        setCurrentFolder(assetActualFolder);
                    }
                }
            }
            setIsEditMode(true);
            setAssetName(foundAsset.name);
            setAssetVoiceDescription(foundAsset.voiceDescription || '');
            setAssetTextDescription(foundAsset.textDescription || '');
            setPhotoPreviews(foundAsset.photos || []); 
            setCurrentStep('descriptions'); 
          } else {
            toast({ title: t('assetNotFound', "Asset Not Found"), variant: "destructive" });
            handleCancelAllAndExit();
          }
        } else {
          setCurrentStep('photos_capture'); 
        }
      } catch (error) {
        console.error("Error loading project/asset:", error);
        toast({ title: "Error", description: "Failed to load data.", variant: "destructive"});
        handleCancelAllAndExit();
      } finally {
        setIsLoadingPage(false);
      }
    } else { 
        handleCancelAllAndExit();
    }
  }, [projectId, assetIdToEdit, folderId, toast, t, handleCancelAllAndExit]);


  useEffect(() => {
    loadProjectAndAsset();
  }, [loadProjectAndAsset]);

  // Effect to control which modal is open based on currentStep
  useEffect(() => {
    if (isLoadingPage) return;

    // Always close all first to ensure only one is open
    setIsPhotosCaptureModalOpen(false);
    setIsNameInputModalOpen(false);
    setIsDescriptionsModalOpen(false);

    if (currentStep === 'photos_capture') {
      setIsPhotosCaptureModalOpen(true);
    } else if (currentStep === 'name_input') {
      setIsNameInputModalOpen(true);
    } else if (currentStep === 'descriptions') {
      setIsDescriptionsModalOpen(true);
    }
  }, [currentStep, isLoadingPage]);


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


  const handlePhotoUploadFromGallery = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setIsProcessingGalleryPhotos(true);
      const newFiles = Array.from(event.target.files);
      const newPhotoUrls: string[] = [];
      let filesProcessed = 0;
      
      if (newFiles.length === 0) {
        setIsProcessingGalleryPhotos(false);
        return;
      }

      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          if (loadEvent.target?.result) {
             newPhotoUrls.push(loadEvent.target.result as string);
          }
          filesProcessed++;
          if (filesProcessed === newFiles.length) {
            setPhotoPreviews(prev => [...prev, ...newPhotoUrls].slice(0, 10)); 
            if (!isManagePhotosBatchModalOpen && currentStep === 'photos_capture') setIsManagePhotosBatchModalOpen(true); 
            setIsProcessingGalleryPhotos(false);
          }
        };
        reader.onerror = () => {
            filesProcessed++;
            toast({ title: "Error", description: `Failed to read file ${file.name}`, variant: "destructive"});
            if (filesProcessed === newFiles.length) {
                setIsProcessingGalleryPhotos(false);
            }
        };
        reader.readAsDataURL(file);
      });
    }
    event.target.value = ''; 
  };

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

  const handleAddSessionPhotosToBatch = () => {
    setPhotoPreviews(prev => [...prev, ...capturedPhotosInSession].slice(0, 10)); 
    setCapturedPhotosInSession([]);
    setIsCustomCameraOpen(false);
    setIsManagePhotosBatchModalOpen(false); 
  };

  const handleCancelCustomCamera = () => {
    setCapturedPhotosInSession([]);
    setIsCustomCameraOpen(false);
    if (currentStep === 'photos_capture') { 
        setIsManagePhotosBatchModalOpen(true);
    }
  };
  
  const removePhotoFromPreviews = (indexToRemove: number) => { 
    setPhotoPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Navigation handlers
  const handleNextFromPhotos = () => {
    if (photoPreviews.length === 0 && !isEditMode) { 
      toast({ title: t('photosRequiredTitle', "Photos Required"), description: t('photosRequiredDesc', "Please add at least one photo for the asset."), variant: "destructive" });
      return;
    }
    setCurrentStep('name_input');
  };

  const handleNextFromNameInput = () => {
    if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), description: t('assetNameRequiredDesc', "Please enter a name for the asset."), variant: "destructive" });
      return;
    }
    setCurrentStep('descriptions');
  };

  const handleBackToPhotos = () => setCurrentStep('photos_capture');
  const handleBackToNameInput = () => setCurrentStep('name_input');

  const toggleListening = () => {
    if (!speechRecognitionRef.current || !speechRecognitionAvailable) {
      toast({ title: t('speechFeatureNotAvailableTitle', 'Feature Not Available'), description: t('speechFeatureNotAvailableDesc', 'Speech recognition is not supported or enabled in your browser.'), variant: 'destructive' });
      return;
    }
    if (isSavingAsset) return; 

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
     if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), variant: "destructive" });
      setCurrentStep('name_input'); 
      return;
    }
    if (photoPreviews.length === 0 && !isEditMode) { 
      toast({ title: t('photosRequiredTitle', "Photos Required"), description: t('photosRequiredDesc', "Please add at least one photo for the asset."), variant: "destructive" });
      setCurrentStep('photos_capture');
      return;
    }

    setIsSavingAsset(true);
    try {
        await FirestoreService.updateProject(project.id, {
          status: 'recent' as ProjectStatus,
        });
        
        const assetDataPayload: Partial<Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>> = {
          name: assetName,
          projectId: project.id,
          folderId: currentFolder ? currentFolder.id : null,
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
          
          success = await FirestoreService.updateAsset(assetIdToEdit, removeUndefinedProps(updateData));
        } else {
          const newAsset = await FirestoreService.addAsset(removeUndefinedProps(assetDataPayload) as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>);
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
            handleCancelAllAndExit(); 
        } else {
            toast({ title: "Error", description: isEditMode ? "Failed to update asset." : "Failed to save asset.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error saving asset:", error);
        toast({ title: "Error", description: "An unexpected error occurred while saving the asset.", variant: "destructive" });
    } finally {
        setIsSavingAsset(false);
    }
  };

  // Helper to remove undefined properties from an object before saving to Firestore
  const removeUndefinedProps = (obj: Record<string, any>): Record<string, any> => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => {
      if (newObj[key] === undefined) {
        delete newObj[key];
      }
    });
    return newObj;
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
     return (
        <div className="container mx-auto p-4 text-center">
           <p>{t('projectNotFound', 'Project Not Found')}</p>
           <Button onClick={() => router.push('/')} className="mt-4">{t('backToDashboard', 'Back to Dashboard')}</Button>
        </div>
     );
  }

  const pageMainTitle = isEditMode ? t('editAssetTitle', "Edit Asset") : t('newAsset', 'Create New Asset');
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <canvas ref={canvasRef} className="hidden"></canvas> 
      <Link href={backLinkHref} className="text-sm text-primary hover:underline flex items-center mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        {backLinkText}
      </Link>
      <h1 className="text-2xl font-bold text-center">{pageMainTitle}</h1>
      {project && <p className="text-center text-muted-foreground">{t('forProject', 'for')} {project.name}</p>}
      {currentFolder && <p className="text-center text-muted-foreground">{t('inFolder', 'In folder:')} {currentFolder.name}</p>}


      {/* Photos Capture Modal */}
      <Dialog open={isPhotosCaptureModalOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCancelAllAndExit(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col" hideCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-headline">
              {t('stepPhotosCaptureTitleModal', 'Step 1: Capture Photos')}
            </DialogTitle>
            <DialogDescription>{t('addPhotosForAssetTitle', 'Add Photos for:')} <span className="font-medium text-primary">{assetName || t('unnamedAsset', 'Unnamed Asset')}</span></DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 space-y-6">
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Button variant="outline" onClick={() => setIsCustomCameraOpen(true)} className="flex-1" disabled={isSavingAsset || isProcessingGalleryPhotos}>
                    <Camera className="mr-2 h-4 w-4" /> {t('takePhotosCustomCamera', 'Take Photos (Camera)')}
                </Button>
                <Button variant="outline" onClick={() => galleryInputRef.current?.click()} className="flex-1" disabled={isSavingAsset || isProcessingGalleryPhotos}>
                    {isProcessingGalleryPhotos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                    {isProcessingGalleryPhotos ? t('saving', 'Processing...') : t('uploadFromGallery', 'Upload from Gallery')}
                </Button>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    id="gallery-input-main" 
                    ref={galleryInputRef}
                    className="hidden"
                    onChange={handlePhotoUploadFromGallery}
                    disabled={isProcessingGalleryPhotos}
                />
            </div>
            {photoPreviews.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <Label>{t('photosAdded', 'Photos Added')} ({photoPreviews.length})</Label>
                  <Button variant="outline" size="sm" onClick={() => setIsManagePhotosBatchModalOpen(true)} disabled={isSavingAsset}>
                     <Edit3 className="mr-2 h-4 w-4" /> {t('managePhotosButton', 'Manage Photos')}
                  </Button>
                </div>
                <ScrollArea className="h-[200px] pr-2 border rounded-md p-2">
                    <div className="grid grid-cols-8 gap-1.5">
                    {photoPreviews.map((src, index) => ( 
                        <div key={`main-preview-${index}-${src.substring(0,20)}`} className="relative group">
                        <img src={src} alt={t('previewPhotoAlt', `Preview ${index + 1}`, {number: index + 1})} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
                        </div>
                    ))}
                    </div>
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={handleCancelAllAndExit} disabled={isSavingAsset}>
              {t('cancelAssetCreation', 'Cancel Asset Creation')}
            </Button>
            <Button onClick={handleNextFromPhotos} disabled={isSavingAsset || (photoPreviews.length === 0 && !isEditMode) }>
              {t('nextStepAssetName', 'Next: Asset Name')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Name Input Modal */}
      <Dialog open={isNameInputModalOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCancelAllAndExit(); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col" hideCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-headline">{t('stepNameInputTitleModal', 'Step 2: Asset Name')}</DialogTitle>
             <DialogDescription>{t('provideNameForAsset', 'Provide a name for your asset.')}</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="asset-name-modal">{t('assetName', 'Asset Name')}</Label>
              <Input
                id="asset-name-modal"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder={t('assetNamePlaceholder', "e.g., Main Entrance Column")}
                disabled={isSavingAsset}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBackToPhotos} disabled={isSavingAsset}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToPhotoCapture', 'Back to Photos')}
            </Button>
            <Button onClick={handleNextFromNameInput} disabled={!assetName.trim() || isSavingAsset}>
              {t('nextStepDescriptions', 'Next: Add Descriptions')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Descriptions Modal */}
      <Dialog open={isDescriptionsModalOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCancelAllAndExit(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col" hideCloseButton={true}>
          <DialogHeader>
             <DialogTitle className="text-xl sm:text-2xl font-headline">{t('stepDescriptionsTitleModal', 'Step 3: Descriptions & Save')}</DialogTitle>
             <DialogDescription>{isEditMode ? t('editAssetDetailsTitle', 'Edit Details for:') : t('addDetailsForAssetTitle', 'Add Details for:')} <span className="font-medium text-primary">{assetName}</span></DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="asset-voice-description">{t('voiceDescriptionLabel', 'Voice Description')}</Label>
                {speechRecognitionAvailable ? (
                  <Button onClick={toggleListening} variant="outline" className="w-full sm:w-auto" disabled={isSavingAsset || isListening}>
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
                  disabled={isSavingAsset}
                />
              </div>
          </div>
          <DialogFooter className="flex justify-between items-center gap-2 pt-4">
            <Button variant="outline" onClick={handleBackToNameInput} disabled={isSavingAsset}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToAssetNameModal', 'Back to Asset Name')}
            </Button>
            <Button onClick={handleSaveAsset} size="lg" disabled={isSavingAsset || (!isEditMode && photoPreviews.length === 0) || !assetName.trim()}>
              {isSavingAsset && <Loader2 className="mr-2 h-4 w-4 animate-spin" /> }
              {isSavingAsset ? t('saving', 'Saving...') : (isEditMode ? t('updateAssetButton', "Update Asset") : t('saveAssetButton', 'Save Asset'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Photos Batch Modal (Sub-modal for Photos step, or from Descriptions step) */}
      <Dialog open={isManagePhotosBatchModalOpen} onOpenChange={setIsManagePhotosBatchModalOpen}>
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
                onClick={() => { setIsCustomCameraOpen(true); setIsManagePhotosBatchModalOpen(false); }} 
                className="w-full sm:w-auto"
                disabled={isProcessingGalleryPhotos || isSavingAsset}>
                <Camera className="mr-2 h-4 w-4" /> {t('takePhotosCustomCamera', 'Take Photos (Camera)')}
              </Button>
              <Button variant="outline" onClick={() => galleryInputModalRef.current?.click()} className="w-full sm:w-auto" disabled={isProcessingGalleryPhotos || isSavingAsset}>
                {isProcessingGalleryPhotos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                {isProcessingGalleryPhotos ? t('saving', 'Processing...') : t('uploadFromGallery', 'Upload from Gallery')}
              </Button>
               <input 
                  type="file"
                  accept="image/*"
                  multiple
                  id="gallery-input-modal" 
                  ref={galleryInputModalRef} 
                  className="hidden"
                  onChange={handlePhotoUploadFromGallery}
                  disabled={isProcessingGalleryPhotos || isSavingAsset}
                />
            </div>

            <div className="space-y-2 mt-4">
              <Label>{t('currentPhotoBatch', 'Current Photo Batch')} ({photoPreviews.length})</Label>
              {photoPreviews.length > 0 ? (
                <ScrollArea className="h-[300px] pr-3">
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
                            disabled={isSavingAsset}
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
        </DialogContent>
      </Dialog>

      {/* Custom Camera Modal (Sub-modal) */}
      <Dialog open={isCustomCameraOpen} onOpenChange={(isOpen) => {
          if (!isOpen && mediaStream) { 
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
            if (videoRef.current) videoRef.current.srcObject = null;
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
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={handleCancelCustomCamera} className="text-white hover:bg-white/10 py-2 px-3 sm:py-3 sm:px-4 text-sm sm:text-base">
                  {t('cancel', 'Cancel')}
                </Button>
                <Button 
                  onClick={handleCapturePhotoFromStream} 
                  disabled={!hasCameraPermission || mediaStream === null}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-black hover:bg-neutral-200 focus:ring-4 focus:ring-white/50 flex items-center justify-center p-0 border-2 border-neutral-700 shadow-xl disabled:bg-neutral-600 disabled:opacity-70"
                  aria-label={t('capturePhoto', 'Capture Photo')}
                >
                  <Camera className="w-7 h-7 sm:w-9 sm:h-9" />
                </Button>
                <Button 
                  variant={capturedPhotosInSession.length > 0 ? "default" : "ghost"}
                  onClick={handleAddSessionPhotosToBatch} 
                  disabled={capturedPhotosInSession.length === 0}
                  className={`py-2 px-3 sm:py-3 sm:px-4 text-sm sm:text-base transition-colors duration-150 ${capturedPhotosInSession.length > 0 ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'text-white hover:bg-white/10'}`}
                >
                   {t('doneWithSessionAddPhotos', 'Add ({count})', { count: capturedPhotosInSession.length })}
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper to add hideCloseButton to DialogContent props if not already there
declare module "@radix-ui/react-dialog" {
  interface DialogContentProps {
    hideCloseButton?: boolean;
  }
}
// In DialogContent component definition in ui/dialog.tsx, use this prop:
// {variant === 'default' && !hideCloseButton && (
//   <DialogPrimitive.Close ...>
//     <X className="h-6 w-6" />
//     <span className="sr-only">Close</span>
//   </DialogPrimitive.Close>
// )}
// This requires updating the ui/dialog.tsx file. I will do it as part of this change.


    
