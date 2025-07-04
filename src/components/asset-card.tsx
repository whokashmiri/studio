
"use client";
import type { Asset } from '@/data/mock-data';
import React from 'react'; // Import React for React.memo
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, ImageOff, MoreVertical, Expand } from 'lucide-react';
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
  onPreviewImage: (imageUrl: string) => void; // New prop for image preview
}

export const AssetCard = React.memo(function AssetCard({ asset, onEditAsset, onDeleteAsset, onPreviewImage }: AssetCardProps) {
  const { t } = useLanguage();
  const primaryPhoto = asset.photos && asset.photos.length > 0 ? asset.photos[0] : null;

  const getDescriptionText = () => {
    if (asset.textDescription && asset.voiceDescription) {
      const baseText = asset.textDescription.length > 30 ? `${asset.textDescription.substring(0, 30)}...` : asset.textDescription;
      return t('textAndVoiceDescShort', '{text} (voice available)', { text: baseText });
    }
    if (asset.textDescription) return asset.textDescription;
    if (asset.voiceDescription) return t('voiceDescriptionOnly', 'Voice description available');
    return t('noDescriptionAvailable', 'No description available.');
  }

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation if card is wrapped in Link
    e.stopPropagation();
    if (primaryPhoto) {
      onPreviewImage(primaryPhoto);
    }
  };

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 group">
      <CardHeader className="p-3 pb-1.5 flex flex-row justify-between items-start gap-2">
        <div className="flex-grow min-w-0">
          <CardTitle className="text-base font-headline leading-tight group-hover:text-primary transition-colors truncate" title={asset.name}>
            {asset.name}
          </CardTitle>
          <CardDescription className="text-xs line-clamp-1 pt-0.5" title={getDescriptionText()}>
              {getDescriptionText()}
          </CardDescription>
        </div>
        <div className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()} 
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('assetActions', 'Asset actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {primaryPhoto && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if(primaryPhoto) onPreviewImage(primaryPhoto);}}>
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
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-grow flex flex-col justify-between">
        <div 
          className={cn("aspect-square w-full relative mb-2 rounded-md overflow-hidden bg-muted", primaryPhoto && "cursor-pointer")}
          onClick={primaryPhoto ? handleImageClick : undefined}
          title={primaryPhoto ? t('clickToViewImage', 'Click to view full image') : undefined}
        >
          {primaryPhoto ? (
            <>
              <Image
                src={primaryPhoto}
                alt={t('assetPhotoAlt', `Photo of ${asset.name}`, { assetName: asset.name })}
                layout="fill"
                objectFit="cover"
                data-ai-hint="asset photo"
                className="group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Expand className="h-8 w-8 text-white" />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageOff className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

    
