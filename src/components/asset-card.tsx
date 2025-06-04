
"use client";
import type { Asset } from '@/data/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ImageOff } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import Image from 'next/image'; // Using next/image for optimization
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AssetCardProps {
  asset: Asset;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
}

export function AssetCard({ asset, onEditAsset, onDeleteAsset }: AssetCardProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const primaryPhoto = asset.photos && asset.photos.length > 0 ? asset.photos[0] : null;

  const getDescriptionText = () => {
    if (asset.textDescription && asset.voiceDescription) {
      return asset.textDescription.length > 50 ? `${asset.textDescription.substring(0, 50)}... (voice available)` : `${asset.textDescription} (voice available)`;
    }
    if (asset.textDescription) return asset.textDescription;
    if (asset.voiceDescription) return t('voiceDescriptionOnly', 'Voice description available');
    return t('noDescriptionAvailable', 'No description available.');
  }

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 group">
      <CardHeader className="p-3 pb-1.5 relative">
        <CardTitle className="text-base font-headline leading-tight group-hover:text-primary transition-colors truncate">
          {asset.name}
        </CardTitle>
        <CardDescription className="text-xs line-clamp-1 pt-0.5">
            {getDescriptionText()}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-grow flex flex-col justify-between">
        <div className="aspect-video w-full relative mb-2 rounded-md overflow-hidden bg-muted">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto}
              alt={t('assetPhotoAlt', `Photo of ${asset.name}`, { assetName: asset.name })}
              layout="fill"
              objectFit="cover"
              data-ai-hint="asset photo"
              className="group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageOff className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-auto">
          <Button
            variant="outline"
            size={isMobile ? "icon" : "sm"}
            className={cn(!isMobile && "flex-1")}
            onClick={() => onEditAsset(asset)}
            title={t('editAssetButton', 'Edit Asset')}
          >
            <Edit className={cn(isMobile ? "h-4 w-4" : "mr-1.5 h-3.5 w-3.5")} />
            {!isMobile && t('edit', 'Edit')}
          </Button>
          <Button
            variant="destructive"
            size={isMobile ? "icon" : "sm"}
            className={cn(!isMobile && "flex-1")}
            onClick={() => onDeleteAsset(asset)}
            title={t('deleteAssetButton', 'Delete Asset')}
          >
            <Trash2 className={cn(isMobile ? "h-4 w-4" : "mr-1.5 h-3.5 w-3.5")} />
            {!isMobile && t('delete', 'Delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
