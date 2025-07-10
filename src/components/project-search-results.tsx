
"use client";
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Loader2, FileArchive, Eye } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import type { Asset, Folder, Project } from '@/data/mock-data';
import { cn } from '@/lib/utils';
import * as FirestoreService from '@/lib/firestore-service';
import type { DocumentData } from 'firebase/firestore';
import { useLanguage } from '@/contexts/language-context';

interface ProjectSearchResultsProps {
  project: Project;
  searchTerm: string;
  onEditAsset: (asset: Asset) => void;
  onPreviewAsset: (asset: Asset) => void;
  loadingAssetId: string | null;
  foldersMap: Map<string, Folder>;
}

export function ProjectSearchResults({ project, searchTerm, onEditAsset, onPreviewAsset, loadingAssetId, foldersMap }: ProjectSearchResultsProps) {
  const { t } = useLanguage();
  const [searchedAssets, setSearchedAssets] = useState<Asset[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(true);
  const [lastSearchedDoc, setLastSearchedDoc] = useState<DocumentData | null>(null);
  const searchLoaderRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const getFolderPath = useCallback((folderId: string | null): Array<{ id: string | null; name: string, type: 'project' | 'folder'}> => {
    const path: Array<{ id: string | null; name: string, type: 'project' | 'folder' }> = [];
    if (!project) return path;

    let current: Folder | undefined | null = folderId ? foldersMap.get(folderId) : null;
    if (current && current.projectId !== project.id) current = null; 

    while (current) {
      path.unshift({ id: current.id, name: current.name, type: 'folder' });
      const parentCand = current.parentId ? foldersMap.get(current.parentId) : null;
      current = (parentCand && parentCand.projectId === project.id) ? parentCand : null;
    }
    path.unshift({ id: null, name: project.name, type: 'project' });
    return path;
  }, [foldersMap, project]);

  const handleSearch = useCallback(async (term: string, loadMore = false) => {
    if (!project) return;
    
    setIsSearchLoading(true);

    const { assets: newAssets, lastDoc } = await FirestoreService.searchAssets(
        project.id,
        term,
        10,
        loadMore ? lastSearchedDoc : null
    );

    if (loadMore) {
        setSearchedAssets(prev => [...prev, ...newAssets]);
    } else {
        setSearchedAssets(newAssets);
    }
    
    setLastSearchedDoc(lastDoc);
    setHasMoreSearchResults(lastDoc !== null);
    setIsSearchLoading(false);

  }, [project, lastSearchedDoc]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term) {
        setSearchedAssets([]);
        setLastSearchedDoc(null);
        setHasMoreSearchResults(true);
        handleSearch(term);
    } else {
        setSearchedAssets([]);
    }
  }, [searchTerm, handleSearch]);

  // Infinite scroll for search results
  useEffect(() => {
    if (!searchLoaderRef.current || !hasMoreSearchResults || isSearchLoading) return;

    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting) {
                handleSearch(searchTerm.trim(), true);
            }
        },
        { root: scrollAreaRef.current, rootMargin: '0px', threshold: 1.0 }
    );

    const currentLoader = searchLoaderRef.current;
    if (currentLoader) {
        observer.observe(currentLoader);
    }

    return () => {
        if (currentLoader) {
            observer.unobserve(currentLoader);
        }
    };
  }, [isSearchLoading, hasMoreSearchResults, searchTerm, handleSearch]);

  return (
    <ScrollArea className="h-full pr-3" viewportRef={scrollAreaRef}>
      {(isSearchLoading && searchedAssets.length === 0) && (
          <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )}
      
      {searchedAssets.length > 0 && (
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground/90">
                  {t('searchResultsTitle', 'Search Results')}
              </h3>
              <div className="flex flex-col border rounded-md">
                  {searchedAssets.map(asset => {
                      const path = getFolderPath(asset.folderId);
                      const pathString = path.map(p => p.name).join(' > ');
                      const isLoading = loadingAssetId === asset.id;
                      const hasMedia = (asset.photos && asset.photos.length > 0) || (asset.videos && asset.videos.length > 0);

                      return (
                          <Card 
                              key={asset.id} 
                              className={cn(
                                  "group relative flex flex-row items-center justify-between p-3 hover:shadow-md transition-shadow w-full border-b last:border-b-0 rounded-none first:rounded-t-md last:rounded-b-md",
                                  isLoading ? "cursor-wait" : "cursor-pointer"
                              )}
                              onClick={() => !isLoading && onEditAsset(asset)}
                          >
                              {isLoading && (
                                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
                                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                  </div>
                              )}
                              <div className={cn("flex items-center gap-3 flex-grow min-w-0", isLoading && "opacity-50")}>
                                  <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                      {asset.photos && asset.photos.length > 0 ? (
                                          <Image src={asset.photos[0]} alt={asset.name} fill className="object-cover" />
                                      ) : (
                                          <FileArchive className="w-6 h-6 text-muted-foreground" />
                                      )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <CardTitle className="text-sm sm:text-base font-medium truncate group-hover:text-primary transition-colors">
                                          {asset.name}
                                      </CardTitle>
                                      
                                      <CardDescription className="text-xs text-muted-foreground truncate" title={pathString}>
                                          {pathString}
                                      </CardDescription>
                                      
                                  </div>
                              </div>
                              <div className={cn("shrink-0 pl-2", isLoading && "opacity-50")}>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => { e.stopPropagation(); onPreviewAsset(asset); }} 
                                    disabled={isLoading || !hasMedia}
                                    title={t('viewImage', 'Preview')}
                                  >
                                      <Eye className="h-4 w-4" />
                                      <span className="sr-only">{t('viewImage', 'Preview')}</span>
                                  </Button>
                              </div>
                          </Card>
                      )
                  })}
              </div>
          </div>
      )}
      
      {(!isSearchLoading && searchedAssets.length === 0 && searchTerm.trim()) && (
           <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                 {t('noSearchResults', 'No assets found matching your search.')}
              </p>
          </div>
      )}

      <div ref={searchLoaderRef} className="h-14 mt-4 flex items-center justify-center col-span-full">
          {isSearchLoading && searchedAssets.length > 0 && (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
          )}
          {!hasMoreSearchResults && searchedAssets.length > 0 && (
              <p className="text-sm text-muted-foreground">{t('noMoreAssets', 'End of list.')}</p>
          )}
      </div>
    </ScrollArea>
  );
}
