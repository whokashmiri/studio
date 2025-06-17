
"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import * as FirestoreService from '@/lib/firestore-service';
import type { Project, Folder as FolderType, Asset } from '@/data/mock-data';
import { Loader2, ShieldAlert, Briefcase, FolderIcon, FileText, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AccessibleData {
  projects: Project[];
  folders: FolderType[];
  assets: Asset[];
}

export default function MyDataPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [accessibleData, setAccessibleData] = useState<AccessibleData>({ projects: [], folders: [], assets: [] });
  const [pageLoading, setPageLoading] = useState(true);

  const loadAccessibleData = useCallback(async () => {
    if (currentUser?.id && currentUser?.companyId) {
      setPageLoading(true);
      try {
        const data = await FirestoreService.getUserAccessibleData(currentUser.id, currentUser.companyId);
        setAccessibleData(data);
      } catch (error) {
        console.error("Error loading accessible data:", error);
        // Optionally set an error state or show a toast
      } finally {
        setPageLoading(false);
      }
    } else if (!authLoading) {
        setPageLoading(false); // Not loading if no user or company to load for
    }
  }, [currentUser, authLoading]);

  useEffect(() => {
    if (!authLoading) {
        if (currentUser) {
            loadAccessibleData();
        } else {
            // Redirect or show message if user not logged in, handled by auth check below
            setPageLoading(false);
        }
    }
  }, [authLoading, currentUser, loadAccessibleData]);

  if (authLoading || pageLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {authLoading ? t('loadingUserSession', 'Loading user session...') : t('loading', 'Loading your data...')}
        </p>
      </div>
    );
  }

  if (!currentUser) {
    // This should ideally be handled by a redirect in a route guard or AuthProvider
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">{t('accessDeniedTitle', 'Access Denied')}</h1>
        <p className="text-muted-foreground">{t('pleaseLoginToView', 'Please log in to view this page.')}</p>
      </div>
    );
  }
  
  const { projects, folders, assets } = accessibleData;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl sm:text-3xl font-bold font-headline text-primary">
          {t('myDataOverviewTitle', 'My Data Overview')}
        </CardTitle>
        <CardDescription>
          {t('myDataOverviewDesc', 'View all projects, folders, and assets accessible to you.')}
        </CardDescription>
      </CardHeader>

      {projects.length === 0 && !pageLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">{t('noDataAccessible', 'You do not have access to any projects, folders, or assets at the moment.')}</p>
          </CardContent>
        </Card>
      )}

      <Accordion type="multiple" className="w-full space-y-4">
        {projects.map(project => {
          const projectTopLevelFolders = folders.filter(f => f.projectId === project.id && !f.parentId);
          const projectRootAssets = assets.filter(a => a.projectId === project.id && !a.folderId);

          return (
            <AccordionItem value={project.id} key={project.id} className="border bg-card rounded-lg shadow-sm">
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <span className="text-lg font-medium text-card-foreground">{project.name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <div className="space-y-3">
                    <Link href={`/project/${project.id}`} passHref legacyBehavior>
                        <Button variant="outline" size="sm" className="mb-2">
                            {t('viewProjectButton', 'View Project Details')} <ExternalLink className="ml-2 h-3.5 w-3.5"/>
                        </Button>
                    </Link>

                  {projectTopLevelFolders.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1.5">{t('foldersSectionTitle', 'Top-Level Folders')}</h4>
                      <ul className="space-y-1.5 pl-1">
                        {projectTopLevelFolders.map(folder => {
                          const folderAssets = assets.filter(a => a.folderId === folder.id);
                          return (
                            <li key={folder.id} className="p-2 border rounded-md bg-muted/30 hover:bg-muted/50">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <FolderIcon className="h-4 w-4 text-accent" />
                                    <span className="font-medium text-sm">{folder.name}</span>
                                </div>
                                <Link href={`/project/${project.id}?folderId=${folder.id}`} passHref legacyBehavior>
                                  <Button variant="ghost" size="sm" className="text-xs h-auto py-0.5 px-1.5">
                                    {t('viewFolderButton', 'View')} <ExternalLink className="ml-1 h-3 w-3"/>
                                  </Button>
                                </Link>
                              </div>
                              {folderAssets.length > 0 && (
                                <ul className="pl-5 mt-1 space-y-0.5">
                                  {folderAssets.map(asset => (
                                    <li key={asset.id} className="text-xs flex justify-between items-center">
                                        <div className="flex items-center gap-1.5">
                                            <FileText className="h-3 w-3 text-secondary-foreground" />
                                            <span>{asset.name}</span>
                                        </div>
                                      <Link href={`/project/${project.id}/new-asset?assetId=${asset.id}&folderId=${folder.id}`} passHref legacyBehavior>
                                        <Button variant="link" size="sm" className="text-xs h-auto py-0 px-1">
                                            {t('viewAssetButton', 'View/Edit')}
                                        </Button>
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                               {folderAssets.length === 0 && (
                                <p className="pl-5 mt-1 text-xs text-muted-foreground">{t('noAssetsInFolder', 'No assets in this folder.')}</p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {projectRootAssets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mt-3 mb-1.5">{t('assetsSectionTitle', 'Root Assets')}</h4>
                      <ul className="space-y-1 pl-1">
                        {projectRootAssets.map(asset => (
                          <li key={asset.id} className="text-xs flex justify-between items-center p-1.5 border rounded-md bg-muted/30 hover:bg-muted/50">
                             <div className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-secondary-foreground" />
                                <span className="text-sm">{asset.name}</span>
                            </div>
                            <Link href={`/project/${project.id}/new-asset?assetId=${asset.id}`} passHref legacyBehavior>
                              <Button variant="link" size="sm" className="text-xs h-auto py-0 px-1">
                                {t('viewAssetButton', 'View/Edit')}
                              </Button>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {projectTopLevelFolders.length === 0 && projectRootAssets.length === 0 && (
                     <p className="text-sm text-muted-foreground py-2">{t('noFoldersOrRootAssets', 'No top-level folders or root assets in this project.')}</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
