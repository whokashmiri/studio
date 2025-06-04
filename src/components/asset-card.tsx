
"use client";
import type { Asset } from '@/data/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ImageOff } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import Image from 'next/image'; // Using next/image for optimization

interface AssetCardProps {
  asset: Asset;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
}

export function AssetCard({ asset, onEditAsset, onDeleteAsset }: AssetCardProps) {
  const { t } = useLanguage();
  const primaryPhoto = asset.photos && asset.photos.length > 0 ? asset.photos[0] : null;

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 group">
      <CardHeader className="p-3 pb-1.5 relative">
        <CardTitle className="text-base font-headline leading-tight group-hover:text-primary transition-colors truncate">
          {asset.name}
        </CardTitle>
        {asset.summary && (
            <CardDescription className="text-xs line-clamp-1 pt-0.5">
                {asset.summary}
            </CardDescription>
        )}
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
            size="sm" 
            className="flex-1"
            onClick={() => onEditAsset(asset)}
            title={t('editAssetButton', 'Edit Asset')}
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            {t('edit', 'Edit')}
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className="flex-1"
            onClick={() => onDeleteAsset(asset)}
            title={t('deleteAssetButton', 'Delete Asset')}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t('delete', 'Delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
