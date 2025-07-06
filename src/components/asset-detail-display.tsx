
"use client";
import type { Asset } from '@/data/mock-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useLanguage } from '@/contexts/language-context';
import { PlayCircle, PauseCircle, Text, Edit, ImageOff, Volume2, ArrowLeft, ArrowRight, Video } from 'lucide-react';
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';

interface AssetDetailDisplayProps {
  asset: Asset;
  onBack: () => void;
}

type MediaItem = {
  type: 'image' | 'video';
  url: string;
};

export function AssetDetailDisplay({ asset, onBack }: AssetDetailDisplayProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const mediaItems: MediaItem[] = useMemo(() => [
    ...(asset.photos || []).map(url => ({ type: 'image' as const, url })),
    ...(asset.videos || []).map(url => ({ type: 'video' as const, url }))
  ], [asset.photos, asset.videos]);
  
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const currentMedia = mediaItems.length > 0 ? mediaItems[currentMediaIndex] : null;

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  // Reset index when asset changes
  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [asset.id]);

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
  };

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prevIndex) => (prevIndex - 1 + mediaItems.length) % mediaItems.length);
  };

  const handlePlayRecordedAudio = useCallback(() => {
    if (asset.recordedAudioDataUrl && audioPlayerRef.current) {
      if (isAudioPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.src = asset.recordedAudioDataUrl;
        audioPlayerRef.current.play().catch(e => {
          console.error("Error playing audio:", e);
        });
      }
    }
  }, [asset.recordedAudioDataUrl, isAudioPlaying]);

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
        if (player) { 
            player.pause();
            player.src = '';
        }
      };
    }
  }, []);

  useEffect(() => {
    if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsAudioPlaying(false);
        if (asset.recordedAudioDataUrl) {
            // New audio source available
        } else {
            audioPlayerRef.current.src = '';
        }
    }
  }, [asset]);


  const handleGoToEditPage = () => {
    const editUrl = `/project/${asset.projectId}/new-asset?assetId=${asset.id}${asset.folderId ? `&folderId=${asset.folderId}` : ''}`;
    router.push(editUrl);
  };

  return (
    <Card className="w-full shadow-xl">
      <audio ref={audioPlayerRef} className="hidden"></audio>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex-grow">
            <CardTitle className="text-2xl font-bold font-headline text-primary">{asset.name}</CardTitle>
            <CardDescription>
              {t('assetDetailsForReview', 'Asset Details (Review Mode)')}
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
             <Button variant="outline" onClick={handleGoToEditPage} className="w-full sm:w-auto">
                <Edit className="mr-2 h-4 w-4" />
                {t('goToEditPageButton', 'Edit Asset')}
            </Button>
            <Button onClick={onBack} variant="default" className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToProjectView', 'Back to Project View')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentMedia ? (
          <div className="relative w-full max-w-2xl mx-auto aspect-[4/3] rounded-lg overflow-hidden bg-muted border shadow-inner group">
             {currentMedia.type === 'image' ? (
              <Image
                key={currentMedia.url}
                src={currentMedia.url}
                alt={t('assetPhotoAlt', `Photo of ${asset.name}`, { assetName: asset.name })}
                fill
                className="object-contain p-1"
                data-ai-hint="asset photo detail"
              />
            ) : (
              <video
                key={currentMedia.url}
                src={currentMedia.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
            {mediaItems.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                  onClick={handlePrevMedia}
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                  onClick={handleNextMedia}
                >
                  <ArrowRight className="h-6 w-6" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-medium rounded-full px-2.5 py-1 pointer-events-none">
                  {currentMediaIndex + 1} / {mediaItems.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 md:h-96 rounded-lg border bg-muted text-muted-foreground shadow-inner">
            <ImageOff className="w-24 h-24" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="space-y-3 p-4 border rounded-lg bg-card/60">
            <h3 className="text-lg font-semibold flex items-center text-foreground/90">
              <Text className="mr-2 h-5 w-5 text-accent" />
              {t('textDescriptionLabel', 'Written Description')}
            </h3>
            {asset.textDescription ? (
              <ScrollArea className="h-36 max-h-48 p-0.5">
                <p className="text-sm text-foreground whitespace-pre-wrap p-3 border rounded-md bg-background">
                  {asset.textDescription}
                </p>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground italic p-3 border rounded-md bg-background">{t('noTextDescriptionProvided', 'No written description provided.')}</p>
            )}
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-card/60">
            <h3 className="text-lg font-semibold flex items-center text-foreground/90">
              <Volume2 className="mr-2 h-5 w-5 text-accent" />
              {t('voiceDescriptionLabel', 'Voice Description')}
            </h3>
            {asset.recordedAudioDataUrl && (
              <Button onClick={handlePlayRecordedAudio} variant="outline" className="w-full justify-start gap-2">
                {isAudioPlaying ? <PauseCircle /> : <PlayCircle />}
                {isAudioPlaying ? t('pauseAudio', 'Pause Recorded Audio') : t('playVoiceDescriptionButton', 'Play Recorded Audio')}
              </Button>
            )}
            {asset.voiceDescription ? (
              <ScrollArea className="h-36 max-h-48 p-0.5">
              <p className="text-sm text-foreground whitespace-pre-wrap p-3 border rounded-md bg-background">
                {asset.voiceDescription} 
              </p>
              </ScrollArea>
            ) : (
               (!asset.recordedAudioDataUrl) && <p className="text-sm text-muted-foreground italic p-3 border rounded-md bg-background">{t('noVoiceTranscriptProvided', 'No voice transcript provided.')}</p>
            )}
             {!asset.recordedAudioDataUrl && !asset.voiceDescription && (
                 <p className="text-sm text-muted-foreground italic p-3 border rounded-md bg-background">{t('noVoiceContentAvailable', 'No voice content (audio or transcript) available.')}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
