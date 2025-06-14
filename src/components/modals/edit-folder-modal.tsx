
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Folder } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: Folder | null;
  onFolderUpdated: (updatedFolder: Folder) => void;
}

export function EditFolderModal({ isOpen, onClose, folder, onFolderUpdated }: EditFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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

    setIsSaving(true);

    const folderUpdateData: Partial<Folder> = {
      name: folderName,
    };

    const success = await FirestoreService.updateFolder(folder.id, folderUpdateData);
    setIsSaving(false);
    
    if (success) {
      onFolderUpdated({ ...folder, name: folderName }); // Optimistically update with new name
      onClose(); 
      toast({
        title: t('folderUpdatedTitle', "Folder Updated"),
        description: t('folderUpdatedDesc', `Folder "${folderName}" has been successfully updated.`, { folderName: folderName }),
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update folder.",
        variant: "destructive",
      });
    }
  };

  if (!folder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent 
        className={cn(
          "sm:max-w-md",
          isSaving && "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700"
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-headline">{t('editFolderModalTitle', 'Edit Folder Name')}</DialogTitle>
          <DialogDescription>
            {t('editFolderDescContextual', 'Update the name for folder: {folderName}', { folderName: folder.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 pt-4 pb-0 flex-grow overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="edit-folder-name">
              {t('folderName', 'Folder Name')}
            </Label>
            <Input
              id="edit-folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={t('folderNamePlaceholder', "e.g., Inspection Area 1")}
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !folderName.trim()}>
            {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
            {isSaving ? t('saving', 'Saving...') : t('updateFolderButton', 'Update Folder')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
