
"use client";
import { useState, useEffect, useRef, useCallback, type ChangeEvent, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Camera, ImageUp, Save, ArrowRight, X, Edit3, CircleDotDashed, Mic, Info, Loader2, Volume2, PauseCircle, PlayCircle, Video, Film, Flashlight, FlashlightOff, Upload } from 'lucide-react';
import type { Project, Asset, ProjectStatus, Folder as FolderType } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { uploadMedia } from '@/actions/cloudinary-actions';
import { compressImage } from '@/lib/image-handler-service';

type AssetCreationStep = 'photos_capture' | 'name_input' | 'descriptions';
type CaptureMode = 'photo' | 'video';
const CAMERA_PERMISSION_GRANTED_KEY = 'assetInspectorProCameraPermissionGrantedV1Modal';

interface NewAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    parentFolder: FolderType | null;
    onAssetCreated: (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

// Extracted Dialog Component for Media Management
const MediaManagerDialog: FC<any> = ({
  isOpen,
  onClose,
  assetName,
  isProcessingMedia,
  handleMediaUploadFromGallery,
  photoPreviews,
  videoPreviews,
  removeMediaFromPreviews,
  setIsCustomCameraOpen,
  galleryInputRef,
  project,
  t
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-headline">
            {t('managePhotosModalTitle', 'Manage Media for Asset:')} <span className="text-primary">{assetName || t('unnamedAsset', 'Unnamed Asset')}</span>
          </DialogTitle>
          <DialogDescription>{t('managePhotosModalDesc', "Add more media using your camera or gallery, or remove existing ones from the batch.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-grow overflow-y-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setIsCustomCameraOpen(true); onClose(); }}
              className="w-full sm:w-auto"
              disabled={isProcessingMedia}>
              <Camera className="mr-2 h-4 w-4" /> {t('takePhotosCustomCamera', 'Open Camera')}
            </Button>
            <Button variant="outline" onClick={() => galleryInputRef.current?.click()} className="w-full sm:w-auto" disabled={isProcessingMedia}>
              {isProcessingMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isProcessingMedia ? t('saving', 'Processing...') : t('uploadFromGallery', 'Upload from Gallery')}
            </Button>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              id="gallery-input-batch-modal"
              ref={galleryInputRef}
              className="hidden"
              onChange={handleMediaUploadFromGallery}
              disabled={isProcessingMedia}
            />
          </div>

          <div className="space-y-4 mt-4">
            <Label>{t('currentPhotoBatch', 'Current Photos')} ({photoPreviews.length})</Label>
            {photoPreviews.length > 0 ? (
              <div className="grid grid-cols-10 gap-1.5">
                {photoPreviews.map((src: string, index: number) => (
                  <div key={`batch-photo-${index}-${src.substring(0, 20)}`} className="relative group">
                    <img src={src} alt={t('previewBatchPhotoAlt', `Batch Preview ${index + 1}`, { number: index + 1 })} data-ai-hint="asset photo batch" className="rounded-md object-cover aspect-square" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={() => removeMediaFromPreviews(index, 'photo')}
                      title={t('removePhotoTitle', "Remove photo")}
                      disabled={isProcessingMedia}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t('noPhotosInBatch', 'No photos in the current batch yet.')}</p>
            )}
            <Label>{t('currentVideoBatch', 'Current Videos')} ({videoPreviews.length})</Label>
            {videoPreviews.length > 0 ? (
              <div className="grid grid-cols-10 gap-1.5">
                {videoPreviews.map((src: string, index: number) => (
                  <div key={`batch-video-${index}-${src.substring(0, 20)}`} className="relative group bg-black rounded-md flex items-center justify-center">
                    <video src={src} className="rounded-md object-cover aspect-square" />
                    <Film className="absolute h-6 w-6 text-white/80" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={() => removeMediaFromPreviews(index, 'video')}
                      title={t('removeVideoTitle', "Remove video")}
                      disabled={isProcessingMedia}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t('noVideosInBatch', 'No videos in the current batch yet.')}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Extracted Dialog Component for Custom Camera
const CustomCameraDialog: FC<any> = ({
  isOpen,
  onOpenChange,
  handleCancelCustomCamera,
  captureMode,
  setCaptureMode,
  hasCameraPermission,
  isRecording,
  isFlashOn,
  handleToggleFlash,
  videoRef,
  isProcessingMedia,
  capturedPhotosInSession,
  capturedVideosInSession,
  removeMediaFromSession,
  handleCapturePhotoFromStream,
  handleToggleVideoRecording,
  handleAddSessionMediaToBatch,
  mediaStream,
  zoomState,
  handleZoomChange,
  t
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(openState) => {
      if (!openState) handleCancelCustomCamera();
      onOpenChange(openState);
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
          <div className="absolute top-4 left-4 z-20">
            <Tabs value={captureMode} onValueChange={(v) => setCaptureMode(v as CaptureMode)} className="w-auto">
              <TabsList>
                <TabsTrigger value="photo"><Camera className="mr-2 h-4 w-4" />Photo</TabsTrigger>
                <TabsTrigger value="video"><Video className="mr-2 h-4 w-4" />Video</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Button onClick={handleToggleFlash} variant="ghost" size="icon" className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white" disabled={!hasCameraPermission || captureMode === 'video'}>
            {isFlashOn ? <FlashlightOff /> : <Flashlight />}
          </Button>
          {isRecording && <div className="absolute top-6 right-16 bg-red-500 rounded-full h-4 w-4 animate-pulse z-20"></div>}
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
        
        {zoomState.isSupported && (
            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1 bg-black/40 p-1.5 rounded-full">
                <Button
                    onClick={() => handleZoomChange(0.5)}
                    variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white text-xs data-[active=true]:bg-white/20 data-[supported=false]:text-neutral-500 data-[supported=false]:cursor-not-allowed"
                    data-supported={zoomState.supportedLevels.includes(0.5)}
                    data-active={zoomState.current === 0.5}
                >0.5x</Button>
                <Button
                    onClick={() => handleZoomChange(1)}
                    variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white text-xs data-[active=true]:bg-white/20 data-[supported=false]:text-neutral-500 data-[supported=false]:cursor-not-allowed"
                    data-supported={zoomState.supportedLevels.includes(1)}
                    data-active={zoomState.current === 1}
                >1x</Button>
                <Button
                    onClick={() => handleZoomChange(2)}
                    variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white text-xs data-[active=true]:bg-white/20 data-[supported=false]:text-neutral-500 data-[supported=false]:cursor-not-allowed"
                    data-supported={zoomState.supportedLevels.includes(2)}
                    data-active={zoomState.current === 2}
                >2x</Button>
            </div>
        )}

        <div className="py-3 px-4 sm:py-5 sm:px-6 bg-black/80 backdrop-blur-sm z-20">
          {isProcessingMedia && (
            <div className="absolute inset-x-0 top-0 flex justify-center pt-2">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          {(capturedPhotosInSession.length > 0 || capturedVideosInSession.length > 0) && (
            <ScrollArea className="w-full mb-3 sm:mb-4 max-h-[70px] sm:max-h-[80px] whitespace-nowrap">
              <div className="flex space-x-2 pb-1">
                {capturedPhotosInSession.map((src: string, index: number) => (
                  <div key={`session-preview-photo-${index}`} className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-md overflow-hidden border-2 border-neutral-600">
                    <img src={src} alt={t('sessionPhotoPreviewAlt', `Session Preview ${index + 1}`, { number: index + 1 })} data-ai-hint="session photo" className="h-full w-full object-cover" />
                    <Button
                      variant="destructive" size="icon" className="absolute -top-1 -right-1 h-5 w-5 bg-black/60 hover:bg-red-600/80 border-none p-0"
                      onClick={() => removeMediaFromSession(index, 'photo')} aria-label={t('removePhotoTitle', "Remove photo")} disabled={isProcessingMedia}
                    > <X className="h-3 w-3" /> </Button>
                  </div>
                ))}
                {capturedVideosInSession.map((src: string, index: number) => (
                  <div key={`session-preview-video-${index}`} className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-md overflow-hidden border-2 border-neutral-600 bg-black">
                    <video src={src} className="h-full w-full object-cover" />
                    <Film className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-white/80" />
                    <Button
                      variant="destructive" size="icon" className="absolute -top-1 -right-1 h-5 w-5 bg-black/60 hover:bg-red-600/80 border-none p-0"
                      onClick={() => removeMediaFromSession(index, 'video')} aria-label={t('removeVideoTitle', "Remove video")} disabled={isProcessingMedia}
                    > <X className="h-3 w-3" /> </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleCancelCustomCamera} className="text-white hover:bg-white/10 py-2 px-3 sm:py-3 sm:px-4 text-sm sm:text-base" disabled={isProcessingMedia}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              onClick={captureMode === 'photo' ? handleCapturePhotoFromStream : handleToggleVideoRecording}
              disabled={!hasCameraPermission || mediaStream === null || isProcessingMedia}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full focus:ring-4 focus:ring-white/50 flex items-center justify-center p-0 border-2 border-neutral-700 shadow-xl disabled:bg-neutral-600 disabled:opacity-70 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-white hover:bg-neutral-200'}`}
              aria-label={t('capturePhoto', 'Capture Media')}
            >
              {captureMode === 'photo' ? <Camera className="w-7 h-7 sm:w-9 sm:h-9 text-black" /> : <div className={`h-8 w-8 rounded-md transition-all ${isRecording ? 'bg-white' : 'bg-red-500'}`} />}
            </Button>
            <Button
              variant={(capturedPhotosInSession.length + capturedVideosInSession.length) > 0 ? "default" : "ghost"}
              onClick={handleAddSessionMediaToBatch}
              disabled={(capturedPhotosInSession.length + capturedVideosInSession.length) === 0 || isProcessingMedia || isRecording}
              className={`py-2 px-3 sm:py-3 sm:px-4 text-sm sm:text-base transition-colors duration-150 ${ (capturedPhotosInSession.length + capturedVideosInSession.length) > 0 ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'text-white hover:bg-white/10'}`}
            >
              {isProcessingMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isProcessingMedia ? t('saving', 'Processing...') : t('doneWithSessionAddPhotos', 'Add ({count})', { count: capturedPhotosInSession.length + capturedVideosInSession.length })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export function NewAssetModal({ isOpen, onClose, project, parentFolder, onAssetCreated }: NewAssetModalProps) {
  const [currentStep, setCurrentStep] = useState<AssetCreationStep>('photos_capture');
  
  const [assetName, setAssetName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetVoiceDescription, setAssetVoiceDescription] = useState(''); 
  const [recordedAudioDataUrl, setRecordedAudioDataUrl] = useState<string | null>(null); 
  const [assetTextDescription, setAssetTextDescription] = useState('');
  
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]); 
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  
  const [isManageMediaBatchModalOpen, setIsManageMediaBatchModalOpen] = useState(false); 
  const [isCustomCameraOpen, setIsCustomCameraOpen] = useState(false);

  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [capturedPhotosInSession, setCapturedPhotosInSession] = useState<string[]>([]); 
  const [capturedVideosInSession, setCapturedVideosInSession] = useState<string[]>([]);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isFlashOn, setFlashOn] = useState(false);
  const [zoomState, setZoomState] = useState({ isSupported: false, min: 1, max: 1, current: 1, supportedLevels: [1] });

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null); 

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null); 
  const galleryInputModalRef = useRef<HTMLInputElement>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const [isAudioDescRecording, setIsAudioDescRecording] = useState(false);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isProcessingMedia, setIsProcessingMedia] = useState(false); 

  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();

  const resetModalState = useCallback(() => {
    setCurrentStep('photos_capture');
    setAssetName('');
    setSerialNumber('');
    setAssetVoiceDescription('');
    setRecordedAudioDataUrl(null);
    setAssetTextDescription('');
    setPhotoPreviews([]);
    setVideoPreviews([]);
    setCapturedPhotosInSession([]);
    setCapturedVideosInSession([]);
    setIsManageMediaBatchModalOpen(false);
    setIsCustomCameraOpen(false);
    setIsProcessingMedia(false);
    setCaptureMode('photo');
    setFlashOn(false);
    setIsRecording(false);
    setZoomState({ isSupported: false, min: 1, max: 1, current: 1, supportedLevels: [1] });
    
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
    setIsAudioDescRecording(false);
  }, []);

  const handleModalClose = useCallback(() => {
    resetModalState();
    if (mediaStream) { 
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

  useEffect(() => {
    let streamInstance: MediaStream | null = null;
    const getCameraStream = async () => {
      if (isCustomCameraOpen) {
        setHasCameraPermission(null);
        try {
          streamInstance = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: captureMode === 'video',
          });
          setMediaStream(streamInstance);
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = streamInstance;
          }
           // Check for zoom capabilities
          const videoTrack = streamInstance.getVideoTracks()[0];
          const capabilities = videoTrack.getCapabilities();
          if ('zoom' in capabilities && capabilities.zoom) {
            const { min, max } = capabilities.zoom;
            const supportedLevels = [0.5, 1, 2].filter(level => level >= min && level <= max);
            setZoomState({ isSupported: true, min, max, current: 1, supportedLevels });
          } else {
            setZoomState({ isSupported: false, min: 1, max: 1, current: 1, supportedLevels: [1] });
          }
        } catch (error) {
          console.error('Error opening camera:', error);
          setHasCameraPermission(false);
          setMediaStream(null);
          toast({
            title: t('cameraAccessDeniedTitle', 'Camera Access Denied'),
            description: t('cameraAccessDeniedEnableSettings', 'Please enable camera permissions in your browser settings and refresh.'),
            variant: 'destructive',
          });
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
    };
  }, [isCustomCameraOpen, captureMode, t, toast]);


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
        if (isAudioDescRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
            setIsAudioDescRecording(false); 
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
  }, [toast, t, isAudioDescRecording]); 

  useEffect(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    }
  }, [language]);

  const handleMediaUploadFromGallery = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setIsProcessingMedia(true);
      const newFiles = Array.from(event.target.files);
      if (newFiles.length === 0) {
        setIsProcessingMedia(false);
        return;
      }

      const processingPromises = newFiles.map(file => new Promise<string | null>((resolve) => {
          const isVideo = file.type.startsWith('video/');
          const reader = new FileReader();
          
          reader.onload = async (loadEvent) => {
              if (loadEvent.target?.result) {
                  try {
                      if (isVideo) {
                          resolve(loadEvent.target.result as string);
                      } else {
                          const compressedUrl = await compressImage(file);
                          resolve(compressedUrl);
                      }
                  } catch (compressionError) {
                      console.error("Error processing file:", compressionError);
                      toast({ title: "Processing Error", description: `Could not process ${file.name}.`, variant: "destructive" });
                      resolve(null);
                  }
              } else {
                  resolve(null);
              }
          };
          
          reader.onerror = () => {
              toast({ title: "File Read Error", description: `Could not read ${file.name}.`, variant: "destructive" });
              resolve(null);
          };

          reader.readAsDataURL(file);
      }));
      
      try {
          const results = await Promise.all(processingPromises);
          const dataUriPhotos: string[] = [];
          const dataUriVideos: string[] = [];
          
          newFiles.forEach((file, index) => {
              const resultUrl = results[index];
              if (resultUrl) {
                  if (file.type.startsWith('video/')) {
                      dataUriVideos.push(resultUrl);
                  } else {
                      dataUriPhotos.push(resultUrl);
                  }
              }
          });

          setPhotoPreviews(prev => [...prev, ...dataUriPhotos]);
          setVideoPreviews(prev => [...prev, ...dataUriVideos]);
      } catch (error) {
          toast({ title: "Error", description: "An error occurred during media processing.", variant: "destructive" });
      } finally {
        setIsProcessingMedia(false);
      }
    }
    if (event.target) event.target.value = '';
  }, [toast]); 

  const handleCapturePhotoFromStream = useCallback(() => {
    if (videoRef.current && canvasRef.current && hasCameraPermission && mediaStream && mediaStream.active) {
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

  const handleToggleVideoRecording = useCallback(() => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (mediaStream && mediaStream.active) {
        videoChunksRef.current = [];
        try {
          const options = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? { mimeType: 'video/webm; codecs=vp9' }
            : MediaRecorder.isTypeSupported('video/webm')
            ? { mimeType: 'video/webm' }
            : {};
          mediaRecorderRef.current = new MediaRecorder(mediaStream, options);
        } catch (e) {
          console.error("Failed to create MediaRecorder:", e);
          toast({title: "Recording Error", description: "Could not initialize video recorder for this device.", variant: "destructive"});
          return;
        }
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) videoChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(videoBlob);
          reader.onloadend = () => {
            setCapturedVideosInSession(prev => [...prev, reader.result as string]);
          };
          videoChunksRef.current = [];
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } else {
        toast({title: "Recording Error", description: "Camera stream is not active or available.", variant: "destructive"});
      }
    }
  }, [isRecording, mediaStream, toast]);

  const handleToggleFlash = async () => {
    if (!mediaStream) return;
    const videoTrack = mediaStream.getVideoTracks()[0];
    if (videoTrack && videoTrack.getCapabilities().torch) {
      try {
        await videoTrack.applyConstraints({ advanced: [{ torch: !isFlashOn }] });
        setFlashOn(!isFlashOn);
      } catch (error) {
        toast({ title: "Flash Error", description: "Could not toggle flash.", variant: "destructive" });
        console.error("Failed to toggle flash:", error);
      }
    } else {
      toast({ title: "Flash Not Supported", description: "Your device camera does not support flash control." });
    }
  };
  
  const handleZoomChange = async (zoomValue: number) => {
    if (!mediaStream || !zoomState.supportedLevels.includes(zoomValue)) return;
    const videoTrack = mediaStream.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints({ advanced: [{ zoom: zoomValue }] });
      setZoomState(prev => ({ ...prev, current: zoomValue }));
    } catch (error) {
      console.error('Failed to apply zoom constraints:', error);
      toast({ title: "Zoom Error", description: `Could not set zoom to ${zoomValue}x.`, variant: "destructive" });
    }
  };


  const removeMediaFromSession = useCallback((indexToRemove: number, type: 'photo' | 'video') => {
    if (type === 'photo') {
      setCapturedPhotosInSession(prev => prev.filter((_, index) => index !== indexToRemove));
    } else {
      setCapturedVideosInSession(prev => prev.filter((_, index) => index !== indexToRemove));
    }
  }, []);

  const handleAddSessionMediaToBatch = useCallback(async () => {
    if (capturedPhotosInSession.length === 0 && capturedVideosInSession.length === 0) return;
    
    setIsProcessingMedia(true);
    
    try {
        const photoCompressionPromises = capturedPhotosInSession.map(photoDataUrl =>
            fetch(photoDataUrl).then(res => res.blob()).then(blob => compressImage(blob as File))
        );
        
        const compressedPhotos = await Promise.all(photoCompressionPromises);

        setPhotoPreviews(prev => [...prev, ...compressedPhotos]);
        setVideoPreviews(prev => [...prev, ...capturedVideosInSession]);
        
        setCapturedPhotosInSession([]);
        setCapturedVideosInSession([]);
        setIsCustomCameraOpen(false); 
    } catch (error) {
       toast({ title: "Error", description: "Failed to process session media.", variant: "destructive"});
    } finally {
      setIsProcessingMedia(false);
    }
  }, [capturedPhotosInSession, capturedVideosInSession, toast]);
  
  const handleCancelCustomCamera = useCallback(() => {
    setCapturedPhotosInSession([]);
    setCapturedVideosInSession([]);
    setIsCustomCameraOpen(false);
  }, []);
  
  const removeMediaFromPreviews = useCallback((indexToRemove: number, type: 'photo' | 'video') => { 
    if (type === 'photo') {
      setPhotoPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    } else {
      setVideoPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    }
  }, []);

  const handleNextFromMedia = useCallback(() => {
    setCurrentStep('name_input');
    setIsManageMediaBatchModalOpen(false); 
  }, []);

  const handleNextFromNameInput = useCallback(async () => {
    // Allow navigation to the next step without validation, per user request.
    setCurrentStep('descriptions');
  }, []);

  const handleBackToPhotos = useCallback(() => setCurrentStep('photos_capture'), []);
  const handleBackToNameInput = useCallback(() => setCurrentStep('name_input'), []);

  const startAudioDescRecordingWithStream = useCallback((streamForRecording: MediaStream) => {
    if (!streamForRecording || !streamForRecording.active || !streamForRecording.getAudioTracks().length === 0 || !streamForRecording.getAudioTracks().some(track => track.enabled && track.readyState === 'live')) {
        toast({ title: t('speechErrorAudioCapture', 'Audio capture failed. Check microphone permissions.'), description: "The audio stream is not active or valid.", variant: "destructive" });
        setIsAudioDescRecording(false);
        if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
        return;
    }

    audioChunksRef.current = [];
    try {
        const recorder = new MediaRecorder(streamForRecording, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
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
            audioChunksRef.current = []; 
        };
        recorder.onerror = (event: Event) => {
            const mediaRecorderError = event as unknown as { error?: DOMException };
            console.error('MediaRecorder.onerror event:', mediaRecorderError.error || event);
            toast({ title: "Recording Error", description: `MediaRecorder failed: ${mediaRecorderError.error?.name || 'Unknown error'}. Check console.`, variant: "destructive" });
            setIsAudioDescRecording(false);
            if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
        };

        recorder.start();
        setIsAudioDescRecording(true);
        
        if (speechRecognitionRef.current && speechRecognitionAvailable) {
            try {
                speechRecognitionRef.current.start();
            } catch (e: any) {
                console.error("Error starting speech recognition:", e);
                toast({ title: t('speechErrorTitle', 'Could not start speech recognition'), description: e.message || t('speechStartErrorDesc', 'Ensure microphone permissions.'), variant: 'warning' });
            }
        }
    } catch (e: any) {
        console.error("Error initializing or starting MediaRecorder instance:", e);
        toast({ title: "Recording Setup Error", description: `Could not initialize/start MediaRecorder: ${e.message || 'Unknown error'}. Check console and microphone.`, variant: "destructive" });
        setIsAudioDescRecording(false); 
        if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
    }
  }, [toast, t, speechRecognitionAvailable]);


  const toggleAudioDescRecording = useCallback(async () => {
    
    if (audioPlayerRef.current && isAudioPlaying) { 
        audioPlayerRef.current.pause(); 
        setIsAudioPlaying(false);
    }

    if (isAudioDescRecording) { 
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
        }
        setIsAudioDescRecording(false);
        
        if (mediaStream && mediaStream.getAudioTracks().length > 0 && !isCustomCameraOpen) {
             mediaStream.getTracks().forEach(track => track.stop());
             setMediaStream(null);
        }
    } else { 
        setRecordedAudioDataUrl(null); 
        setAssetVoiceDescription(''); 

        try {
            const newAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            if (mediaStream && mediaStream.id !== newAudioStream.id) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            setMediaStream(newAudioStream); 
            
            startAudioDescRecordingWithStream(newAudioStream); 
        
        } catch (err) {
            console.error("Error getting dedicated audio stream for recording:", err);
            const typedError = err as Error;
            let desc = typedError.message || t('speechErrorAudioCapture', 'Audio capture failed. Check microphone permissions.');
            if (typedError.name === 'NotAllowedError' || typedError.name === 'PermissionDeniedError') {
                desc = t('speechErrorNotAllowed', 'Microphone access denied. Please allow microphone access.');
            }
            toast({ title: t('speechErrorAudioCapture', 'Audio capture failed. Check microphone permissions.'), description: desc, variant: "destructive" });
            setIsAudioDescRecording(false);
            if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
        }
    }
  }, [
    isAudioDescRecording, mediaStream, t, toast, isAudioPlaying, 
    startAudioDescRecordingWithStream, isCustomCameraOpen
]);


  const handlePlayRecordedAudio = useCallback(() => {
    if (recordedAudioDataUrl && audioPlayerRef.current) {
        if (isAudioPlaying) {
            audioPlayerRef.current.pause();
        } else {
            if (isAudioDescRecording) { 
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
                if (speechRecognitionRef.current) {
                    speechRecognitionRef.current.stop();
                }
                setIsAudioDescRecording(false);
            }
            audioPlayerRef.current.src = recordedAudioDataUrl;
            audioPlayerRef.current.play().catch(e => {
                console.error("Error playing audio:", e);
                toast({title: "Playback Error", description: "Could not play audio.", variant: "destructive"});
                setIsAudioPlaying(false);
            });
        }
    }
  }, [recordedAudioDataUrl, isAudioPlaying, isAudioDescRecording, toast]); 

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
  
  const handleSaveAsset = useCallback(() => {
    if (!project || !currentUser) {
      toast({ title: t('error', 'Error'), description: !project ? t('projectContextLost', "Project context lost") : t('userNotAuthenticatedError', "User not authenticated. Cannot save asset."), variant: "destructive" });
      return;
    }
    if (!assetName.trim()) {
      toast({ title: t('assetNameRequiredTitle', "Asset Name Required"), variant: "destructive" });
      setCurrentStep('name_input');
      return;
    }

    const assetDataPayload: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: currentUser.id,
      name: assetName,
      serialNumber: serialNumber.trim() ? parseFloat(serialNumber.trim()) : undefined,
      projectId: project.id,
      folderId: parentFolder ? parentFolder.id : null,
      photos: photoPreviews,
      videos: videoPreviews,
      voiceDescription: assetVoiceDescription.trim() || undefined,
      recordedAudioDataUrl: recordedAudioDataUrl || undefined,
      textDescription: assetTextDescription.trim() || undefined,
    };

    onAssetCreated(assetDataPayload);
    handleModalClose();
  }, [project, currentUser, assetName, serialNumber, photoPreviews, videoPreviews, parentFolder, assetVoiceDescription, recordedAudioDataUrl, assetTextDescription, onAssetCreated, handleModalClose, toast, t]);
  
  const totalMediaCount = photoPreviews.length + videoPreviews.length;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'photos_capture':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-headline">
                {t('stepPhotosCaptureTitleModal', 'Step 1: Capture Media')}
              </DialogTitle>
              <DialogDescription>{t('addPhotosForAssetTitle', 'Add Media for:')} <span className="font-medium text-primary">{assetName || t('unnamedAsset', 'Unnamed Asset')}</span> ({t('forProject', 'for')} {project.name})</DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto py-4 space-y-6">
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Button variant="outline" onClick={() => setIsCustomCameraOpen(true)} className="flex-1" disabled={isProcessingMedia}>
                      <Camera className="mr-2 h-4 w-4" /> {t('takePhotosCustomCamera', 'Open Camera')}
                  </Button>
                  <Button variant="outline" onClick={() => galleryInputRef.current?.click()} className="flex-1" disabled={isProcessingMedia}>
                      {isProcessingMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {isProcessingMedia ? t('saving', 'Processing...') : t('uploadFromGallery', 'Upload from Gallery')}
                  </Button>
                  <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      id="gallery-input-main-modal" 
                      ref={galleryInputRef}
                      className="hidden"
                      onChange={handleMediaUploadFromGallery}
                      disabled={isProcessingMedia}
                  />
              </div>
              {totalMediaCount > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>{t('photosAdded', 'Media Added')} ({totalMediaCount})</Label>
                    <Button variant="outline" size="sm" onClick={() => setIsManageMediaBatchModalOpen(true)} disabled={isProcessingMedia}>
                       <Edit3 className="mr-2 h-4 w-4" /> {t('managePhotosButton', 'Manage Media')}
                    </Button>
                  </div>
                  <ScrollArea className="h-auto max-h-[120px] pr-2 border rounded-md p-2">
                      <div className="grid grid-cols-10 gap-1.5">
                        {photoPreviews.map((src, index) => ( 
                            <div key={`main-preview-modal-photo-${index}-${src.substring(0,30)}`} className="relative group">
                              <img src={src} alt={t('previewPhotoAlt', `Preview ${index + 1}`, {number: index + 1})} data-ai-hint="asset photo" className="rounded-md object-cover aspect-square" />
                            </div>
                        ))}
                        {videoPreviews.map((src, index) => ( 
                          <div key={`main-preview-modal-video-${index}-${src.substring(0,30)}`} className="relative group bg-black rounded-md flex items-center justify-center">
                            <video src={src} className="rounded-md object-cover aspect-square" />
                            <Film className="absolute h-6 w-6 text-white/80" />
                          </div>
                        ))}
                      </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={handleModalClose} disabled={isProcessingMedia}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button onClick={handleNextFromMedia} disabled={isProcessingMedia}>
                {t('next', 'Next')} <ArrowRight className="ml-2 h-4 w-4" />
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
            <div className="flex-grow overflow-y-auto py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset-name-modal-comp">{t('assetName', 'Asset Name')}</Label>
                <Input
                  id="asset-name-modal-comp"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder={t('assetNamePlaceholder', "e.g., Main Entrance Column")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial-number-modal-comp">{t('serialNumberLabel', 'Serial Number')}</Label>
                <Input
                  id="serial-number-modal-comp"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder={t('serialNumberPlaceholder', "e.g., A-123-XYZ")}
                />
              </div>
            </div>
            <DialogFooter className="flex justify-between items-center">
                <Button variant="ghost" onClick={handleModalClose}>{t('cancel', 'Cancel')}</Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleBackToPhotos}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToPhotoCapture', 'Back')}
                    </Button>
                    <Button onClick={handleNextFromNameInput}>
                    {t('next', 'Next')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
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
                      <Button onClick={toggleAudioDescRecording} variant="outline" className="flex-1 min-w-[180px]" disabled={isAudioPlaying}>
                        <Mic className={`mr-2 h-4 w-4 ${isAudioDescRecording ? 'animate-pulse text-destructive' : ''}`} />
                        {isAudioDescRecording ? t('finishRecording', 'Finish Recording') : t('recordVoiceDescriptionButton', 'Record Voice')}
                      </Button>
                    ) : (
                       <Alert variant="default" className="w-full">
                          <Info className="h-4 w-4" />
                          <AlertTitle>{t('speechFeatureNotAvailableTitle', 'Voice Recording Not Available')}</AlertTitle>
                          <AlertDescription>{t('speechFeatureNotAvailableDesc', 'Your browser may not support voice recording or microphone access is denied.')}</AlertDescription>
                       </Alert>
                    )}
                    {recordedAudioDataUrl && (
                       <Button onClick={handlePlayRecordedAudio} variant="outline" className="flex-1 min-w-[120px]" disabled={isAudioDescRecording}>
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
                  />
                </div>
            </div>
            <DialogFooter className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={handleModalClose}>{t('cancel', 'Cancel')}</Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleBackToNameInput}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToAssetNameModal', 'Back')}
                    </Button>
                    <Button onClick={handleSaveAsset} size="lg">
                        {t('saveAssetButton', 'Finish')}
                    </Button>
                </div>
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
        <DialogContent 
          className={cn(
            "sm:max-w-2xl max-h-[85vh] flex flex-col",
            isCustomCameraOpen && "p-0 border-none bg-transparent shadow-none"
          )} 
          hideCloseButton={isAudioDescRecording || isRecording || isCustomCameraOpen}
        >
          {isCustomCameraOpen ? (
             <CustomCameraDialog
                isOpen={isCustomCameraOpen}
                onOpenChange={setIsCustomCameraOpen}
                handleCancelCustomCamera={handleCancelCustomCamera}
                captureMode={captureMode}
                setCaptureMode={setCaptureMode}
                hasCameraPermission={hasCameraPermission}
                isRecording={isRecording}
                isFlashOn={isFlashOn}
                handleToggleFlash={handleToggleFlash}
                videoRef={videoRef}
                mediaStream={mediaStream}
                isProcessingMedia={isProcessingMedia}
                capturedPhotosInSession={capturedPhotosInSession}
                capturedVideosInSession={capturedVideosInSession}
                removeMediaFromSession={removeMediaFromSession}
                handleCapturePhotoFromStream={handleCapturePhotoFromStream}
                handleToggleVideoRecording={handleToggleVideoRecording}
                handleAddSessionMediaToBatch={handleAddSessionMediaToBatch}
                zoomState={zoomState}
                handleZoomChange={handleZoomChange}
                t={t}
            />
          ) : (
            renderStepContent()
          )}
        </DialogContent>
      </Dialog>

      {isManageMediaBatchModalOpen && (
        <MediaManagerDialog
          isOpen={isManageMediaBatchModalOpen}
          onClose={() => setIsManageMediaBatchModalOpen(false)}
          assetName={assetName}
          isProcessingMedia={isProcessingMedia}
          handleMediaUploadFromGallery={handleMediaUploadFromGallery}
          photoPreviews={photoPreviews}
          videoPreviews={videoPreviews}
          removeMediaFromPreviews={removeMediaFromPreviews}
          setIsCustomCameraOpen={setIsCustomCameraOpen}
          galleryInputRef={galleryInputModalRef}
          project={project}
          t={t}
        />
      )}
    </>
  );
}
