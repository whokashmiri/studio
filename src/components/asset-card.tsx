
"use client";
import type { Asset } from '@/data/mock-data';
import React from 'react'; // Import React for React.memo
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, ImageOff, MoreVertical, Expand, FileArchive, Loader2, CloudOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from '@/contexts/language-context';
import Image from 'next/image'; 
import { cn } from '@/lib/utils';

interface AssetCardProps {
  asset: Asset;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
  onPreviewAsset: (asset: Asset) => void;
  displayMode?: 'grid' | 'list';
}

export const AssetCard = React.memo(function AssetCard({ asset, onEditAsset, onDeleteAsset, onPreviewAsset, displayMode = 'grid' }: AssetCardProps) {
  const { t } = useLanguage();
  const primaryPhoto = asset.photos && asset.photos.length > 0 ? asset.photos[0] : null;
  const isUploading = !!asset.isUploading;
  const isOffline = !!asset.isOffline;

  if (displayMode === 'grid') {
    const mainAction = () => {
      if (isUploading) return;
      if (primaryPhoto) {
        onPreviewAsset(asset);
      } else {
        onEditAsset(asset);
      }
    };

    return (
      <Card
        className={cn(
            "group relative flex flex-col overflow-hidden rounded-lg hover:shadow-lg transition-shadow duration-200 bg-card/50 p-1",
            (isUploading || isOffline) ? "cursor-wait" : "cursor-pointer"
        )}
        onClick={mainAction}
        title={asset.name}
      >
        {isUploading && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}
        {isOffline && !isUploading && (
          <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-background/60 rounded-full">
            <CloudOff className="h-4 w-4 text-muted-foreground" title="Saved locally, pending sync"/>
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
                disabled={isUploading || isOffline}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('assetActions', 'Asset actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {primaryPhoto && (
                <DropdownMenuItem onClick={() => onPreviewAsset(asset)}>
                  <Expand className="mr-2 h-4 w-4" />
                  {t('viewImage', 'View Image')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEditAsset(asset)}>
                <Edit3 className="mr-2 h-4 w-4" />
                {t('editAssetButton', 'Edit Asset')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteAsset(asset)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
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
      </Card>
    );
  }

  // --- LIST MODE LOGIC ---
  return (
      <Card 
        className={cn(
            "group relative flex flex-row items-center justify-between p-3 hover:shadow-md transition-shadow w-full border-b last:border-b-0 rounded-none first:rounded-t-md last:rounded-b-md",
            (isUploading || isOffline) && "opacity-60"
        )}
        title={asset.name}
      >
        {isUploading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )}
        <div 
          className="flex items-center gap-3 flex-grow min-w-0"
          onClick={() => (isUploading || isOffline) ? null : (primaryPhoto ? onPreviewAsset(asset) : onEditAsset(asset))}
        >
          {isOffline && !isUploading && (
            <CloudOff className="h-5 w-5 text-muted-foreground shrink-0" title="Saved locally, pending sync"/>
          )}
          <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted">
            {primaryPhoto ? (
              <Image
                src={primaryPhoto}
                alt={t('assetPhotoAlt', `Photo of ${asset.name}`, { assetName: asset.name })}
                fill
                className="object-cover"
                data-ai-hint="asset photo"
              />
            ) : (
              <FileArchive className="w-6 h-6 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
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
                disabled={isUploading || isOffline}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('assetActions', 'Asset actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {primaryPhoto && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if(primaryPhoto) onPreviewAsset(asset);}}>
                  <Expand className="mr-2 h-4 w-4" />
                  {t('viewImage', 'View Image')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEditAsset(asset)}>
                <Edit3 className="mr-2 h-4 w-4" />
                {t('editAssetButton', 'Edit Asset')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteAsset(asset)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteAssetButton', 'Delete Asset')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
  );
});
