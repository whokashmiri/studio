
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Folder } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: Folder | null;
  onFolderUpdated: (updatedFolder: Folder) => void;
}

export function EditFolderModal({ isOpen, onClose, folder, onFolderUpdated }: EditFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (folder) {
      setFolderName(folder.name);
    }
  }, [folder]);

  const handleSave = async () => {
    if (!folder) return;
    if (!folderName.trim()) {
      toast({
        title: t('folderNameRequiredTitle', "Folder Name Required"),
        description: t('folderNameRequiredDesc', "Please enter a name for the folder."),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const updatedFolder: Folder = {
      ...folder,
      name: folderName,
    };

    LocalStorageService.updateFolder(updatedFolder);
    
    onFolderUpdated(updatedFolder);
    setIsLoading(false);
    onClose(); 
    
    toast({
      title: t('folderUpdatedTitle', "Folder Updated"),
      description: t('folderUpdatedDesc', `Folder "${updatedFolder.name}" has been successfully updated.`, { folderName: updatedFolder.name }),
    });
  };

  if (!folder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('editFolderModalTitle', 'Edit Folder Name')}</DialogTitle>
          <DialogDescription>
            {t('editFolderDesc', 'Update the name for your folder.')} "{folder.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-folder-name">
              {t('folderName', 'Folder Name')}
            </Label>
            <Input
              id="edit-folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={t('folderNamePlaceholder', "e.g., Inspection Area 1")}
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !folderName.trim()}>
            {isLoading ? t('saving', 'Saving...') : t('updateFolderButton', 'Update Folder')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
