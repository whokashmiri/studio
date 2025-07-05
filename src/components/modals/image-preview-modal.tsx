
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '../ui/button';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { Asset } from '@/data/mock-data';
import { useState, useEffect } from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
}

export function ImagePreviewModal({ isOpen, onClose, asset }: ImagePreviewModalProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [asset]);


  if (!asset || !asset.photos || asset.photos.length === 0) {
    return null;
  }
  
  const photos = asset.photos;
  const currentPhotoUrl = photos[currentIndex];


  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };


  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
      <DialogContent className="sm:max-w-3xl p-2 sm:p-4" variant="fullscreen">
        <DialogHeader className="absolute top-2 right-2 z-10 flex flex-row items-center">
           <DialogTitle className="sr-only">{t('imagePreviewTitle', 'Image Preview')}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white bg-black/50 hover:bg-black/70 h-10 w-10 rounded-full">
            <X className="h-6 w-6" />
            <span className="sr-only">{t('close', 'Close')}</span>
          </Button>
        </DialogHeader>
        <div className="relative w-full h-full flex items-center justify-center bg-black/90 group">
          <Image
            key={currentPhotoUrl}
            src={currentPhotoUrl}
            alt={t('fullSizePreviewAlt', 'Full-size asset image preview')}
            layout="intrinsic"
            width={1200} 
            height={800} 
            objectFit="contain"
            className="max-w-full max-h-full rounded-md"
            data-ai-hint="asset photo full"
          />
           {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                  onClick={handlePrevPhoto}
                  aria-label="Previous image"
                >
                  <ArrowLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                  onClick={handleNextPhoto}
                  aria-label="Next image"
                >
                  <ArrowRight className="h-8 w-8" />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-medium rounded-full px-3 py-1.5 pointer-events-none">
                  {currentIndex + 1} / {photos.length}
                </div>
              </>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
