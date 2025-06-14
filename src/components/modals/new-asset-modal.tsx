
"use client";
import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, ImageUp, Save, ArrowRight, X, Edit3, CircleDotDashed, Mic, Info, Loader2, Volume2, PauseCircle, PlayCircle } from 'lucide-react';
import type { Project, Asset, ProjectStatus, Folder as FolderType } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { processImageForSaving } from '@/lib/image-handler-service'; 

type AssetCreationStep = 'photos_capture' | 'name_input' | 'descriptions';
const CAMERA_PERMISSION_GRANTED_KEY = 'assetInspectorProCameraPermissionGrantedV1Modal';

interface NewAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    parentFolder: FolderType | null;
    onAssetCreated: () => void;
}

export function NewAssetModal({ isOpen, onClose, project, parentFolder, onAssetCreated }: NewAssetModalProps) {
  const [currentStep, setCurrentStep] = useState<AssetCreationStep>('photos_capture');
  
  const [assetName, setAssetName] = useState('');
  const [assetVoiceDescription, setAssetVoiceDescription] = useState(''); 
  const [recordedAudioDataUrl, setRecordedAudioDataUrl] = useState<string | null>(null); 
  const [assetTextDescription, setAssetTextDescription] = useState('');
  
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]); 
  
  const [isManagePhotosBatchModalOpen, setIsManagePhotosBatchModalOpen] = useState(false); 
  const [isCustomCameraOpen, setIsCustomCameraOpen] = useState(false);

  const [capturedPhotosInSession, setCapturedPhotosInSession] = useState<string[]>([]); 
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null); // General stream for camera/mic

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null); 
  const galleryInputModalRef = useRef<HTMLInputElement>(null);
  
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false); 

  const { toast } = useToast();
  const { t, language } = useLanguage();

  const resetModalState = useCallback(() => {
    setCurrentStep('photos_capture');
    setAssetName('');
    setAssetVoiceDescription('');
    setRecordedAudioDataUrl(null);
    setAssetTextDescription('');
    setPhotoPreviews([]);
    setCapturedPhotosInSession([]);
    setIsManagePhotosBatchModalOpen(false);
    setIsCustomCameraOpen(false);
    setIsSavingAsset(false);
    setIsProcessingPhotos(false);
    
    if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
    }
    setIsAudioPlaying(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) { 
        speechRecognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleModalClose = useCallback(() => {
    resetModalState();
    if (mediaStream) { // Stop the general media stream
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
    }
    onClose();
  }, [resetModalState, onClose, mediaStream]);

  useEffect(() => {
    if (isOpen) {
      resetModalState();
    }
  }, [isOpen, project, parentFolder, resetModalState]);

  // Effect for Camera/Video stream (for photo capture step or custom camera modal)
  useEffect(() => {
    let streamInstanceForEffect: MediaStream | null = null;
    const getCameraStreamForEffect = async () => {
      if (isCustomCameraOpen) { // Only get camera stream when custom camera is open
        const storedPermission = typeof window !== 'undefined' ? localStorage.getItem(CAMERA_PERMISSION_GRANTED_KEY) : null;
        if (storedPermission === 'true') setHasCameraPermission(true);
        else if (storedPermission === 'false') setHasCameraPermission(false);
        else setHasCameraPermission(null);
        
        try {
          // Request video-only stream for camera preview
          streamInstanceForEffect = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          setMediaStream(prevStream => {
            if (prevStream && prevStream.id !== streamInstanceForEffect?.id) {
                 prevStream.getTracks().forEach(track => track.stop());
            }
            return streamInstanceForEffect;
          });
          setHasCameraPermission(true);
          if (typeof window !== 'undefined') localStorage.setItem(CAMERA_PERMISSION_GRANTED_KEY, 'true');
          if (videoRef.current && streamInstanceForEffect) {
            videoRef.current.srcObject = streamInstanceForEffect;
          }
        } catch (error) {
          console.error('ModalEffect: Error accessing camera devices:', error);
          setHasCameraPermission(false);
          if (typeof window !== 'undefined') localStorage.setItem(CAMERA_PERMISSION_GRANTED_KEY, 'false');
        }
      } else { // If custom camera is not open, ensure its stream is stopped
         if (mediaStream && mediaStream.getVideoTracks().length > 0 && !isRecording) { // Check if it's a video stream and not recording audio
             mediaStream.getTracks().forEach(track => track.stop());
             setMediaStream(null);
        }
      }
    };
    
    getCameraStreamForEffect();
    
    return () => { 
      if (streamInstanceForEffect && (!mediaStream || streamInstanceForEffect.id !== mediaStream.id) && !isRecording ) {
        streamInstanceForEffect.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCustomCameraOpen]); // Removed isRecording from here to avoid stopping audio stream prematurely


  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechRecognitionAvailable(true);
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      speechRecognitionRef.current = new SpeechRecognitionAPI();
      const recognition = speechRecognitionRef.current;
      recognition.continuous = true; 
      recognition.interimResults = true; 

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
             setAssetVoiceDescription(prev => (prev + ' ' + finalTranscript).trim());
        }
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error, event.message);
        let errorMessage = event.message || event.error;
        if (event.error === 'no-speech') errorMessage = t('speechErrorNoSpeech', 'No speech detected. Please try again.');
        else if (event.error === 'audio-capture') errorMessage = t('speechErrorAudioCapture', 'Audio capture failed. Check microphone permissions.');
        else if (event.error === 'not-allowed') errorMessage = t('speechErrorNotAllowed', 'Microphone access denied. Please allow microphone access.');
        toast({ title: t('speechErrorTitle', 'Speech Recognition Error'), description: errorMessage, variant: 'destructive' });
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false); // Ensure recording state is reset
        }
      };
    } else {
      setSpeechRecognitionAvailable(false);
    }
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    };
  }, [toast, t, isRecording]); // isRecording dependency is important here

  useEffect(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    }
  }, [language]);

  const handlePhotoUploadFromGallery = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setIsProcessingPhotos(true);
      const newFiles = Array.from(event.target.files);
      const processedDataUris: string[] = [];
      
      if (newFiles.length === 0) {
        setIsProcessingPhotos(false);
        return;
      }

      try {
        for (const file of newFiles) {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = (loadEvent) => {
              if (loadEvent.target?.result) {
                resolve(loadEvent.target.result as string);
              } else {
                reject(new Error('Failed to read file.'));
              }
            };
            reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
            reader.readAsDataURL(file);
          });
          
          const processedUrl = await processImageForSaving(dataUrl);
          if (processedUrl) {
            processedDataUris.push(processedUrl);
          } else {
            toast({ title: "Image Processing Error", description: `Failed to process ${file.name}.`, variant: "destructive"});
          }
        }
        setPhotoPreviews(prev => [...prev, ...processedDataUris].slice(0, 10)); 
      } catch (error: any) {
         toast({ title: "Error", description: error.message || "An error occurred processing gallery photos.", variant: "destructive"});
      } finally {
        setIsProcessingPhotos(false);
      }
    }
    if (event.target) event.target.value = ''; 
  }, [toast, t]);

  const handleCapturePhotoFromStream = useCallback(() => {
    if (videoRef.current && canvasRef.current && hasCameraPermission && mediaStream && mediaStream.getVideoTracks().length > 0) {
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
  }, [hasCameraPermission, mediaStream, t, toast]);

  const removePhotoFromSession = useCallback((indexToRemove: number) => {
    setCapturedPhotosInSession(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

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
          toast({ title: "Image Processing Error", description: "A photo from session failed to process.", variant: "destructive"});
        }
      }
      setPhotoPreviews(prev => [...prev, ...newProcessedDataUris].slice(0, 10));
      setCapturedPhotosInSession([]);
      setIsCustomCameraOpen(false); 
    } catch (error) {
       toast({ title: "Error", description: "Failed to process session photos.", variant: "destructive"});
    } finally {
      setIsProcessingPhotos(false);
    }
  }, [capturedPhotosInSession, toast, t]);
  
  const handleCancelCustomCamera = useCallback(() => {
    setCapturedPhotosInSession([]);
    setIsCustomCameraOpen(false);
    // Camera stream (video only) cleanup is handled by the isCustomCameraOpen useEffect
  }, []);
  
  const removePhotoFromPreviews = useCallback((indexToRemove: number) => { 
    setPhotoPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const handleNextFromPhotos = useCallback(() => {
    if (photoPreviews.length === 0) { 
      toast({ title: t('photosRequiredTitle', "Photos Required"), description: t('photosRequiredDesc', "Please add at least one photo for the asset."), variant: "destructive" });
      return;
    }
    setCurrentStep('name_input');
    setIsManagePhotosBatchModalOpen(false); 
  }, [photoPreviews.length, toast, t]);

  const handleNextFromNameInput = useCallback(async () => {
    if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), description: t('assetNameRequiredDesc', "Please enter a name for the asset."), variant: "destructive" });
      return;
    }
    // No need to pre-fetch audio stream here; toggleRecording will handle it.
    setCurrentStep('descriptions');
  }, [assetName, toast, t]);

  const handleBackToPhotos = useCallback(() => setCurrentStep('photos_capture'), []);
  const handleBackToNameInput = useCallback(() => setCurrentStep('name_input'), []);

  const startRecordingWithStream = useCallback((streamForRecording: MediaStream) => {
    if (!streamForRecording || !streamForRecording.active || streamForRecording.getAudioTracks().length === 0 || !streamForRecording.getAudioTracks().some(track => track.enabled && track.readyState === 'live')) {
        toast({ title: t('speechErrorAudioCapture', 'Audio capture failed. Check microphone permissions.'), description: "The audio stream is not active or valid.", variant: "destructive" });
        setIsRecording(false);
        if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
        return;
    }

    audioChunksRef.current = [];
    try {
        const recorder = new MediaRecorder(streamForRecording, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
        };
        recorder.onstop = () => {
            if (audioChunksRef.current.length === 0) {
               setRecordedAudioDataUrl(null); 
               return;
            }
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => { setRecordedAudioDataUrl(reader.result as string); };
            audioChunksRef.current = []; // Clear for next recording
        };
        recorder.onerror = (event: Event) => {
            const mediaRecorderError = event as unknown as { error?: DOMException };
            console.error('MediaRecorder.onerror event:', mediaRecorderError.error || event);
            toast({ title: "Recording Error", description: `MediaRecorder failed: ${mediaRecorderError.error?.name || 'Unknown error'}.`, variant: "destructive" });
            setIsRecording(false);
            if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
        };

        recorder.start();
        // setIsRecording(true) is set in toggleRecording after startRecordingWithStream is called successfully
        
        if (speechRecognitionRef.current && speechRecognitionAvailable) {
            try {
                speechRecognitionRef.current.start();
            } catch (e: any) {
                console.error("Error starting speech recognition:", e);
                toast({ title: t('speechErrorTitle', 'Could not start speech recognition'), description: e.message || t('speechStartErrorDesc', 'Ensure microphone permissions.'), variant: 'warning' });
                // Don't stop media recorder here, let it continue if it started
            }
        }
    } catch (e: any) {
        console.error("Error initializing or starting MediaRecorder instance:", e);
        toast({ title: "Recording Setup Error", description: `Could not initialize/start MediaRecorder: ${e.message}. Check console.`, variant: "destructive" });
        setIsRecording(false); 
        if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
        // If streamForRecording was created in toggleRecording, it should be stopped
        streamForRecording.getTracks().forEach(track => track.stop());
        if (mediaStream?.id === streamForRecording.id) setMediaStream(null);
    }
  }, [toast, t, speechRecognitionAvailable, speechRecognitionRef, mediaStream]);


  const toggleRecording = useCallback(async () => {
    if (isSavingAsset) return;
    
    if (audioPlayerRef.current && isAudioPlaying) { 
        audioPlayerRef.current.pause(); // Stop playback if any
        setIsAudioPlaying(false);
    }

    if (isRecording) { // Stop current recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
        }
        setIsRecording(false);
        // mediaStream used for audio recording will be stopped by its own effect if modal closes or by next recording start
    } else { // Start new recording
        setRecordedAudioDataUrl(null); 
        setAssetVoiceDescription(''); 

        try {
            // Always get a fresh audio-only stream
            const newAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            // Stop any previous stream (camera or old audio) before setting the new one
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            setMediaStream(newAudioStream); // Set as the current general stream (for cleanup)
            
            startRecordingWithStream(newAudioStream); // Pass the fresh stream directly
            setIsRecording(true); // Set recording state after successfully initiating startRecordingWithStream
        
        } catch (err) {
            console.error("Error getting dedicated audio stream for recording:", err);
            const typedError = err as Error;
            let desc = typedError.message || t('speechErrorAudioCapture', 'Audio capture failed. Check microphone permissions.');
            if (typedError.name === 'NotAllowedError' || typedError.name === 'PermissionDeniedError') {
                desc = t('speechErrorNotAllowed', 'Microphone access denied. Please allow microphone access.');
            }
            toast({ title: t('speechErrorAudioCapture', 'Audio capture failed. Check microphone permissions.'), description: desc, variant: "destructive" });
            setIsRecording(false);
            if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
        }
    }
  }, [
    isRecording, isSavingAsset, mediaStream, t, toast, isAudioPlaying, 
    startRecordingWithStream, speechRecognitionRef, setMediaStream
]);


  const handlePlayRecordedAudio = useCallback(() => {
    if (recordedAudioDataUrl && audioPlayerRef.current) {
        if (isAudioPlaying) {
            audioPlayerRef.current.pause();
            setIsAudioPlaying(false);
        } else {
            if (isRecording) { // Stop recording if trying to play
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
                if (speechRecognitionRef.current) {
                    speechRecognitionRef.current.stop();
                }
                setIsRecording(false);
            }
            audioPlayerRef.current.src = recordedAudioDataUrl;
            audioPlayerRef.current.play().catch(e => {
                console.error("Error playing audio:", e);
                toast({title: "Playback Error", description: "Could not play audio.", variant: "destructive"});
                setIsAudioPlaying(false);
            });
        }
    }
  }, [recordedAudioDataUrl, isAudioPlaying, isRecording, toast, speechRecognitionRef]); 

  useEffect(() => {
    const player = audioPlayerRef.current;
    if (player) {
        const onPlay = () => setIsAudioPlaying(true);
        const onPause = () => setIsAudioPlaying(false);
        const onEnded = () => setIsAudioPlaying(false);
        player.addEventListener('play', onPlay);
        player.addEventListener('pause', onPause);
        player.addEventListener('ended', onEnded);
        return () => {
            player.removeEventListener('play', onPlay);
            player.removeEventListener('pause', onPause);
            player.removeEventListener('ended', onEnded);
        };
    }
  }, []);

  const removeUndefinedProps = (obj: Record<string, any>): Record<string, any> => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => {
      if (newObj[key] === undefined || newObj[key] === null) { 
        delete newObj[key];
      }
    });
    return newObj;
  };
  
  const handleSaveAsset = useCallback(async () => {
    if (!project) {
      toast({ title: t('projectContextLost', "Project context lost"), variant: "destructive" });
      return;
    }
     if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), variant: "destructive" });
      setCurrentStep('name_input'); 
      return;
    }
    if (photoPreviews.length === 0) { 
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
          folderId: parentFolder ? parentFolder.id : null,
          photos: photoPreviews,
        };

        if (assetVoiceDescription.trim()) {
          assetDataPayload.voiceDescription = assetVoiceDescription.trim();
        }
        if (recordedAudioDataUrl) {
            assetDataPayload.recordedAudioDataUrl = recordedAudioDataUrl;
        }
        if (assetTextDescription.trim()) {
          assetDataPayload.textDescription = assetTextDescription.trim();
        }
        
        const newAsset = await FirestoreService.addAsset(removeUndefinedProps(assetDataPayload) as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>);
        
        if (newAsset) {
            toast({ 
                title: t('assetSavedTitle', "Asset Saved"), 
                description: t('assetSavedDesc', `Asset "${newAsset.name}" has been saved.`, { assetName: newAsset.name })
            });
            onAssetCreated(); 
            handleModalClose(); 
        } else {
            toast({ title: "Error", description: "Failed to save asset.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error saving asset:", error);
        toast({ title: "Error", description: "An unexpected error occurred while saving the asset.", variant: "destructive" });
    } finally {
        setIsSavingAsset(false);
    }
  }, [project, assetName, photoPreviews, parentFolder, assetVoiceDescription, recordedAudioDataUrl, assetTextDescription, t, toast, handleModalClose, onAssetCreated]);
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 'photos_capture':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-headline">
                {t('stepPhotosCaptureTitleModal', 'Step 1: Capture Photos')}
              </DialogTitle>
              <DialogDescription>{t('addPhotosForAssetTitle', 'Add Photos for:')} <span className="font-medium text-primary">{assetName || t('unnamedAsset', 'Unnamed Asset')}</span> ({t('forProject', 'for')} {project.name})</DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto py-4 space-y-6">
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Button variant="outline" onClick={() => setIsCustomCameraOpen(true)} className="flex-1" disabled={isSavingAsset || isProcessingPhotos}>
                      <Camera className="mr-2 h-4 w-4" /> {t('takePhotosCustomCamera', 'Take Photos (Camera)')}
                  </Button>
                  <Button variant="outline" onClick={() => galleryInputRef.current?.click()} className="flex-1" disabled={isSavingAsset || isProcessingPhotos}>
                      {isProcessingPhotos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                      {isProcessingPhotos ? t('saving', 'Processing...') : t('uploadFromGallery', 'Upload from Gallery')}
                  </Button>
                  <input
                      type="file"
                      accept="image/*"
                      multiple
                      id="gallery-input-main-modal" 
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
                    <Button variant="outline" size="sm" onClick={() => setIsManagePhotosBatchModalOpen(true)} disabled={isSavingAsset || isProcessingPhotos}>
                       <Edit3 className="mr-2 h-4 w-4" /> {t('managePhotosButton', 'Manage Photos')}
                    </Button>
                  </div>
                  <ScrollArea className="h-[200px] pr-2 border rounded-md p-2">
                      <div className="grid grid-cols-8 gap-1.5">
                      {photoPreviews.map((src, index) => ( 
                          <div key={`main-preview-modal-${index}-${src.substring(0,30)}`} className="relative group">
                          <img src={src} alt={t('previewPhotoAlt', `Preview ${index + 1}`, {number: index + 1})} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
                          </div>
                      ))}
                      </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={handleModalClose} disabled={isSavingAsset || isProcessingPhotos}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button onClick={handleNextFromPhotos} disabled={isSavingAsset || isProcessingPhotos || photoPreviews.length === 0}>
                {t('nextStepAssetName', 'Next: Asset Name')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        );
      case 'name_input':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-headline">{t('stepNameInputTitleModal', 'Step 2: Asset Name')}</DialogTitle>
               <DialogDescription>{t('provideNameForAsset', 'Provide a name for your asset.')}</DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto py-4 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="asset-name-modal-comp">{t('assetName', 'Asset Name')}</Label>
                <Input
                  id="asset-name-modal-comp"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder={t('assetNamePlaceholder', "e.g., Main Entrance Column")}
                  disabled={isSavingAsset}
                />
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBackToPhotos} disabled={isSavingAsset}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToPhotoCapture', 'Back')}
              </Button>
              <Button onClick={handleNextFromNameInput} disabled={!assetName.trim() || isSavingAsset}>
                {t('nextStepDescriptions', 'Next: Add Descriptions')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        );
      case 'descriptions':
        return (
          <>
            <DialogHeader>
               <DialogTitle className="text-xl sm:text-2xl font-headline">{t('stepDescriptionsTitleModal', 'Step 3: Descriptions & Save')}</DialogTitle>
               <DialogDescription>{t('addDetailsForAssetTitle', 'Add Details for:')} <span className="font-medium text-primary">{assetName}</span></DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto py-4 space-y-6">
                <audio ref={audioPlayerRef} className="hidden"></audio>
                <div className="space-y-2">
                  <Label htmlFor="asset-voice-description-modal">{t('voiceDescriptionLabel', 'Voice Description')}</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {speechRecognitionAvailable ? ( 
                      <Button onClick={toggleRecording} variant="outline" className="flex-1 min-w-[180px]" disabled={isSavingAsset || isAudioPlaying}>
                        <Mic className={`mr-2 h-4 w-4 ${isRecording ? 'animate-pulse text-destructive' : ''}`} />
                        {isRecording ? t('finishRecording', 'Finish Recording') : t('recordVoiceDescriptionButton', 'Record Voice')}
                      </Button>
                    ) : (
                       <Alert variant="default" className="w-full">
                          <Info className="h-4 w-4" />
                          <AlertTitle>{t('speechFeatureNotAvailableTitle', 'Voice Recording Not Available')}</AlertTitle>
                          <AlertDescription>{t('speechFeatureNotAvailableDesc', 'Your browser may not support voice recording or microphone access is denied.')}</AlertDescription>
                       </Alert>
                    )}
                    {recordedAudioDataUrl && (
                       <Button onClick={handlePlayRecordedAudio} variant="outline" className="flex-1 min-w-[120px]" disabled={isSavingAsset || isRecording}>
                         {isAudioPlaying ? <PauseCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                         {isAudioPlaying ? t('pauseAudio', 'Pause') : t('playVoiceDescriptionButton', 'Listen')}
                       </Button>
                    )}
                  </div>
                  {assetVoiceDescription.trim() && ( 
                    <Textarea
                      id="asset-voice-description-display-modal"
                      value={assetVoiceDescription}
                      readOnly
                      rows={3}
                      className="mt-2 bg-muted/50"
                      placeholder={t('voiceTranscriptPlaceholder', 'Voice transcript will appear here...')}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset-text-description-modal">{t('textDescriptionLabel', 'Written Description')}</Label>
                  <Textarea
                    id="asset-text-description-modal"
                    value={assetTextDescription}
                    onChange={(e) => setAssetTextDescription(e.target.value)}
                    placeholder={t('textDescriptionPlaceholder', 'Type detailed written description here...')}
                    rows={assetVoiceDescription.trim() || recordedAudioDataUrl ? 3 : 5}
                    className="resize-y"
                    disabled={isSavingAsset}
                  />
                </div>
            </div>
            <DialogFooter className="flex flex-row justify-end items-center gap-2 pt-4">
              <Button variant="outline" onClick={handleBackToNameInput} disabled={isSavingAsset}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToAssetNameModal', 'Back')}
              </Button>
              <Button onClick={handleSaveAsset} size="lg" disabled={isSavingAsset || photoPreviews.length === 0 || !assetName.trim()}>
                {isSavingAsset && <Loader2 className="mr-2 h-4 w-4 animate-spin" /> }
                {isSavingAsset ? t('saving', 'Saving...') : t('saveAssetButton', 'Save Asset')}
              </Button>
            </DialogFooter>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden"></canvas> 

      <Dialog open={isOpen} onOpenChange={(openState) => { 
          if (!openState) {
            handleModalClose(); 
          }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col" hideCloseButton={isRecording}>
          {renderStepContent()}
        </DialogContent>
      </Dialog>

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
                disabled={isProcessingPhotos || isSavingAsset}>
                <Camera className="mr-2 h-4 w-4" /> {t('takePhotosCustomCamera', 'Take Photos (Camera)')}
              </Button>
              <Button variant="outline" onClick={() => galleryInputModalRef.current?.click()} className="w-full sm:w-auto" disabled={isProcessingPhotos || isSavingAsset}>
                {isProcessingPhotos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                {isProcessingPhotos ? t('saving', 'Processing...') : t('uploadFromGallery', 'Upload from Gallery')}
              </Button>
               <input 
                  type="file"
                  accept="image/*"
                  multiple
                  id="gallery-input-batch-modal" 
                  ref={galleryInputModalRef} 
                  className="hidden"
                  onChange={handlePhotoUploadFromGallery}
                  disabled={isProcessingPhotos || isSavingAsset}
                />
            </div>

            <div className="space-y-2 mt-4">
              <Label>{t('currentPhotoBatch', 'Current Photo Batch')} ({photoPreviews.length})</Label>
              {photoPreviews.length > 0 ? (
                <ScrollArea className="h-[300px] pr-3">
                  <div className="grid grid-cols-6 gap-1.5">
                    {photoPreviews.map((src, index) => (
                      <div key={`batch-modal-${index}-${src.substring(0,30)}`} className="relative group">
                        <img src={src} alt={t('previewBatchPhotoAlt', `Batch Preview ${index + 1}`, { number: index + 1 })} data-ai-hint="asset photo batch" className="rounded-md object-cover aspect-square" />
                         <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            onClick={() => removePhotoFromPreviews(index)}
                            title={t('removePhotoTitle', "Remove photo")}
                            disabled={isSavingAsset || isProcessingPhotos}
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

      <Dialog open={isCustomCameraOpen} onOpenChange={(isOpenState) => {
          if (!isOpenState) { 
             handleCancelCustomCamera(); 
          }
          setIsCustomCameraOpen(isOpenState);
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
              {capturedPhotosInSession.length > 0 && !isProcessingPhotos && (
                <ScrollArea className="w-full mb-3 sm:mb-4 max-h-[70px] sm:max-h-[80px] whitespace-nowrap">
                  <div className="flex space-x-2 pb-1">
                    {capturedPhotosInSession.map((src, index) => (
                      <div key={`session-preview-modal-${index}`} className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-md overflow-hidden border-2 border-neutral-600">
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
                <Button variant="ghost" onClick={handleCancelCustomCamera} className="text-white hover:bg-white/10 py-2 px-3 sm:py-3 sm:px-4 text-sm sm:text-base"  disabled={isProcessingPhotos}>
                  {t('cancel', 'Cancel')}
                </Button>
                <Button 
                  onClick={handleCapturePhotoFromStream} 
                  disabled={!hasCameraPermission || mediaStream === null || !mediaStream.active || mediaStream.getVideoTracks().length === 0 || isProcessingPhotos}
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
                   {isProcessingPhotos && capturedPhotosInSession.length > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null }
                   {isProcessingPhotos && capturedPhotosInSession.length > 0 ? t('saving', 'Processing...') : t('doneWithSessionAddPhotos', 'Add ({count})', { count: capturedPhotosInSession.length })}
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

