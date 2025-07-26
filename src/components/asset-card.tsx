
"use client";
import type { Asset } from '@/data/mock-data';
import React from 'react'; // Import React for React.memo
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, ImageOff, MoreVertical, Expand, FileArchive, Loader2, CloudOff, Video, Edit2, Copy, Scissors, HardDriveDownload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from '@/contexts/language-context';
import { useClipboard } from '@/contexts/clipboard-context';
import Image from 'next/image'; 
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

interface AssetCardProps {
  asset: Asset;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
  onPreviewAsset: (asset: Asset) => void;
  onDownloadAsset: (asset: Asset) => void;
  displayMode?: 'grid' | 'list';
  isDeleting?: boolean;
  isLoading?: boolean;
  isDownloading?: boolean;
  isOnline?: boolean;
}

export const AssetCard = React.memo(function AssetCard({ 
  asset, 
  onEditAsset, 
  onDeleteAsset, 
  onPreviewAsset, 
  onDownloadAsset, 
  displayMode = 'grid', 
  isDeleting = false, 
  isLoading = false,
  isDownloading = false, 
  isOnline = true 
}: AssetCardProps) {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { setClipboard, isItemCut } = useClipboard();
  const isAdmin = currentUser?.role === 'Admin';
  
  const primaryPhoto = asset.photos && asset.photos.length > 0 ? asset.photos[0] : null;
  const hasVideo = asset.videos && asset.videos.length > 0;
  const hasMedia = primaryPhoto || hasVideo;
  const isUploading = !!asset.isUploading;
  const isOffline = !!asset.isOffline;
  const isOfflineUpdate = !!asset.isOfflineUpdate;
  const isCut = isItemCut(asset.id);
  const cardIsDisabled = isUploading || isDeleting || isLoading || isDownloading;

  const mainAction = () => {
    if (cardIsDisabled) return;
    onEditAsset(asset);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClipboard({ itemId: asset.id, itemType: 'asset', operation: 'copy', sourceProjectId: asset.projectId });
  };
  
  const handleCut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClipboard({ itemId: asset.id, itemType: 'asset', operation: 'cut', sourceProjectId: asset.projectId });
  };
  
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(hasMedia) onDownloadAsset(asset);
  }

  if (displayMode === 'grid') {
    return (
      <Card
        className={cn(
            "group relative flex flex-col overflow-hidden rounded-lg hover:shadow-lg transition-shadow duration-200 bg-card/50 p-1",
            cardIsDisabled ? "cursor-wait" : "cursor-pointer",
            isCut && "opacity-60"
        )}
        onClick={mainAction}
        title={asset.name}
      >
        {(isUploading || isLoading || isDownloading) && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}
        <div className={cn('flex flex-col flex-grow', cardIsDisabled && 'opacity-50 pointer-events-none')}>
            {(isOffline || isOfflineUpdate) && (
              <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-background/60 rounded-full flex items-center gap-1">
                {isOffline && <CloudOff className="h-4 w-4 text-muted-foreground" title="Saved locally, pending sync"/>}
                {isOfflineUpdate && !isOffline && <Edit2 className="h-4 w-4 text-accent" title="Changes pending sync"/>}
              </div>
            )}
            {hasVideo && (
              <div className="absolute bottom-1.5 left-1.5 z-10 p-1 bg-background/60 rounded-full">
                <Video className="h-4 w-4 text-muted-foreground" title="Contains video"/>
              </div>
            )}
            <div className="absolute top-1 right-1 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                    disabled={cardIsDisabled}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">{t('assetActions', 'Asset actions')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreviewAsset(asset); }}>
                      <Expand className="mr-2 h-4 w-4" />
                      {t('viewImage', 'Preview Media')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditAsset(asset); }}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    {t('editAssetButton', 'Edit Asset')}
                  </DropdownMenuItem>
                   {isAdmin && isOnline && (
                     <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleCopy}>
                            <Copy className="mr-2 h-4 w-4" />
                            {t('copy', 'Copy')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCut}>
                            <Scissors className="mr-2 h-4 w-4" />
                            {t('cut', 'Cut')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownload} disabled={!hasMedia}>
                            <HardDriveDownload className="mr-2 h-4 w-4" />
                            {t('downloadProject', 'Download')}
                        </DropdownMenuItem>
                     </>
                   )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset); }}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    disabled={isDeleting || !isOnline}
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    {t('deleteAssetButton', 'Delete Asset')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="relative w-full aspect-square bg-muted group-hover:opacity-90 transition-opacity">
              {primaryPhoto ? (
                <Image
                  src={primaryPhoto}
                  alt={t('assetPhotoAlt', `Photo of ${asset.name}`, { assetName: asset.name })}
                  fill
                  className="object-cover rounded-md p-1"
                  data-ai-hint="asset photo"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <FileArchive className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="pt-0.5 text-center">
                <CardTitle className="text-sm font-medium w-full break-words">
                    {asset.name}
                </CardTitle>
            </div>
        </div>
      </Card>
    );
  }

  // --- LIST MODE LOGIC ---
  return (
      <Card 
        className={cn(
            "group relative flex flex-row items-center justify-between p-3 hover:shadow-md transition-shadow w-full border-b last:border-b-0 rounded-none first:rounded-t-md last:rounded-b-md",
            isCut && "opacity-60"
        )}
        title={asset.name}
        onClick={mainAction}
      >
        {(isUploading || isLoading) && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )}
        <div className={cn("flex items-center gap-3 flex-grow min-w-0", cardIsDisabled && "opacity-50 pointer-events-none")}>
          {(isOffline || isOfflineUpdate) && (
             <div className="flex items-center gap-1">
                {isOffline && <CloudOff className="h-5 w-5 text-muted-foreground shrink-0" title="Saved locally, pending sync"/>}
                {isOfflineUpdate && !isOffline && <Edit2 className="h-5 w-5 text-accent shrink-0" title="Changes pending sync"/>}
              </div>
          )}
          <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
            {primaryPhoto ? (
              <Image
                src={primaryPhoto}
                alt={t('assetPhotoAlt', `Photo of ${asset.name}`, { assetName: asset.name })}
                fill
                className="object-cover"
                data-ai-hint="asset photo"
              />
            ) : (
              <FileArchive className="w-6 h-6 text-muted-foreground" />
            )}
            {hasVideo && !primaryPhoto && (
                 <Video className="w-6 h-6 text-muted-foreground" />
            )}
             {hasVideo && primaryPhoto && (
                 <div className="absolute bottom-0.5 right-0.5 z-10 p-0.5 bg-background/60 rounded-full">
                    <Video className="h-3 w-3 text-white"/>
                </div>
            )}
          </div>
          <div className="flex-grow min-w-0">
            <CardTitle className="text-sm sm:text-base font-medium truncate group-hover:text-primary transition-colors">
              {asset.name}
            </CardTitle>
          </div>
        </div>

        <div className="shrink-0 ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()} 
                disabled={cardIsDisabled}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('assetActions', 'Asset actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreviewAsset(asset);}}>
                  <Expand className="mr-2 h-4 w-4" />
                  {t('viewImage', 'Preview Media')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditAsset(asset); }}>
                <Edit3 className="mr-2 h-4 w-4" />
                {t('editAssetButton', 'Edit Asset')}
              </DropdownMenuItem>
               {isAdmin && isOnline && (
                 <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="mr-2 h-4 w-4" />
                        {t('copy', 'Copy')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCut}>
                        <Scissors className="mr-2 h-4 w-4" />
                        {t('cut', 'Cut')}
                    </DropdownMenuItem>
                 </>
               )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset); }}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                disabled={isDeleting || !isOnline}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {t('deleteAssetButton', 'Delete Asset')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
  );
});

    