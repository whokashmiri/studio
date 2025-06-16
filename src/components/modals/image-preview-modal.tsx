
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl }: ImagePreviewModalProps) {
  const { t } = useLanguage();

  if (!imageUrl) return null;

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
        <div className="relative w-full h-full flex items-center justify-center bg-black/90">
          <Image
            src={imageUrl}
            alt={t('fullSizePreviewAlt', 'Full-size asset image preview')}
            layout="intrinsic"
            width={1200} 
            height={800} 
            objectFit="contain"
            className="max-w-full max-h-full rounded-md"
            data-ai-hint="asset photo full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
