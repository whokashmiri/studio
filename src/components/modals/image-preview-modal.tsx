
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '../ui/button';
import { ArrowLeft, ArrowRight, X, UploadCloud, Loader2 } from 'lucide-react';
import type { Asset } from '@/data/mock-data';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onMediaDropped?: (files: File[]) => Promise<boolean>; // Returns true on success
  isUploading?: boolean;
}

type MediaItem = {
  type: 'image' | 'video';
  url: string;
};

export function ImagePreviewModal({ isOpen, onClose, asset, onMediaDropped, isUploading }: ImagePreviewModalProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const mediaItems: MediaItem[] = useMemo(() => {
    if (!asset) return [];
    const photos = (asset.photos || []).map(url => ({ type: 'image' as const, url }));
    const videos = (asset.videos || []).map(url => ({ type: 'video' as const, url }));
    return [...photos, ...videos];
  }, [asset]);

  useEffect(() => {
    // Reset index when asset changes, but not on media updates for the same asset
    setCurrentIndex(0);
  }, [asset?.id]);

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
  };

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + mediaItems.length) % mediaItems.length);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMediaDropped) {
      setIsDragOver(true);
    }
  }, [onMediaDropped]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!onMediaDropped) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      const success = await onMediaDropped(imageFiles);
      // The parent component will handle toast notifications and state updates.
      // The `isUploading` prop will show the loader.
    }
  }, [onMediaDropped]);


  if (!asset) {
    return null;
  }
  
  const currentMedia = mediaItems[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
      <DialogContent 
        className="sm:max-w-3xl p-2 sm:p-4" 
        variant="fullscreen"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DialogHeader className="absolute top-2 right-2 z-20 flex flex-row items-center">
           <DialogTitle className="sr-only">{t('imagePreviewTitle', 'Media Preview')}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white bg-black/50 hover:bg-black/70 h-10 w-10 rounded-full">
            <X className="h-6 w-6" />
            <span className="sr-only">{t('close', 'Close')}</span>
          </Button>
        </DialogHeader>

        <div className="relative w-full h-full flex items-center justify-center bg-black/90 group transition-colors">
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <p className="mt-4 text-lg font-medium text-primary">Processing images...</p>
            </div>
          )}
          {isDragOver && (
              <div className="absolute inset-2 border-4 border-dashed border-primary bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none rounded-lg">
                  <UploadCloud className="h-24 w-24 text-primary animate-pulse" />
                  <p className="mt-4 text-xl font-bold text-primary">Drop to add photos</p>
              </div>
          )}

          {currentMedia ? (
            currentMedia.type === 'image' ? (
              <Image
                key={currentMedia.url}
                src={currentMedia.url}
                alt={t('fullSizePreviewAlt', 'Full-size asset media preview')}
                layout="intrinsic"
                width={1200} 
                height={800} 
                objectFit="contain"
                className="max-w-full max-h-full rounded-md"
                data-ai-hint="asset photo full"
              />
            ) : (
               <video
                  key={currentMedia.url}
                  src={currentMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-md"
               />
            )
          ) : (
             <div className="text-center text-white">
                <p>No media available for this asset.</p>
             </div>
          )}

           {mediaItems.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 z-10"
                  onClick={handlePrevMedia}
                  aria-label="Previous media"
                >
                  <ArrowLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 z-10"
                  onClick={handleNextMedia}
                  aria-label="Next media"
                >
                  <ArrowRight className="h-8 w-8" />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-medium rounded-full px-3 py-1.5 pointer-events-none z-10">
                  {currentIndex + 1} / {mediaItems.length}
                </div>
              </>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

