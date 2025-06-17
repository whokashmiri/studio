
"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import * as FirestoreService from '@/lib/firestore-service';
import type { AssetWithContext } from '@/lib/firestore-service';
import { Loader2, ShieldAlert, FileText, Edit, Home, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export default function ReviewAllAssetsPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [allCompanyAssets, setAllCompanyAssets] = useState<AssetWithContext[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const loadAllAssets = useCallback(async () => {
    if (currentUser && currentUser.role === 'Admin' && currentUser.companyId) {
      setPageLoading(true);
      try {
        const assets = await FirestoreService.getAllAssetsForCompany(currentUser.companyId);
        setAllCompanyAssets(assets);
      } catch (error) {
        console.error("Error loading all company assets:", error);
        // Optionally set an error state or show a toast
      } finally {
        setPageLoading(false);
      }
    } else if (!authLoading) {
      setPageLoading(false); // Not loading if no user or not admin
    }
  }, [currentUser, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || currentUser.role !== 'Admin') {
        router.push('/'); // Redirect if not admin or not logged in
      } else {
        loadAllAssets();
      }
    }
  }, [authLoading, currentUser, router, loadAllAssets]);

  if (authLoading || pageLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {authLoading ? t('loadingUserSession', 'Loading user session...') : t('loadingAdminData', 'Loading all company assets...')}
        </p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">{t('accessDeniedTitle', 'Access Denied')}</h1>
        <p className="text-muted-foreground">{t('accessDeniedAdminDesc', 'You do not have permission to view this page.')}</p>
        <Button onClick={() => router.push('/')} className="mt-4">
          <Home className="mr-2 h-4 w-4" /> {t('backToDashboard', 'Back to Dashboard')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <CardHeader className="px-0 pt-0 flex-grow">
          <CardTitle className="text-2xl sm:text-3xl font-bold font-headline text-primary">
            {t('reviewAllAssetsPageTitle', 'All Company Assets')}
          </CardTitle>
          <CardDescription>
            {t('reviewAllAssetsPageDesc', 'Review and manage all assets across all projects in {companyName}.', { companyName: currentUser.companyName })}
          </CardDescription>
        </CardHeader>
        <Link href="/admin/dashboard" passHref legacyBehavior>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToAdminDashboard', 'Back to Admin Dashboard')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {allCompanyAssets.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {t('assetsFoundCount', '{count} assets found.', { count: allCompanyAssets.length })}
              </p>
              <ScrollArea className="max-h-[calc(100vh-20rem)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('assetNameTableTitle', 'Asset Name')}</TableHead>
                      <TableHead>{t('projectNameTableTitle', 'Project')}</TableHead>
                      <TableHead>{t('folderNameTableTitle', 'Folder')}</TableHead>
                      <TableHead>{t('created', 'Created')}</TableHead>
                      <TableHead className="text-right">{t('actionsTableTitle', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCompanyAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {asset.name}
                        </TableCell>
                        <TableCell>{asset.projectName}</TableCell>
                        <TableCell>{asset.folderName || t('projectRoot', 'Project Root')}</TableCell>
                        <TableCell>{format(new Date(asset.createdAt), 'PPp')}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/project/${asset.projectId}/new-asset?assetId=${asset.id}${asset.folderId ? `&folderId=${asset.folderId}` : ''}`} passHref legacyBehavior>
                            <Button variant="ghost" size="sm">
                              <Edit className="mr-2 h-4 w-4" />
                              {t('viewEditAssetButton', 'View/Edit')}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-10">{t('noAssetsFoundCompany', 'No assets found for this company.')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
