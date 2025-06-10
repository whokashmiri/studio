
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Project } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Loader2 } from 'lucide-react';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectUpdated: (updatedProject: Project) => void;
}

export function EditProjectModal({ isOpen, onClose, project, onProjectUpdated }: EditProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (project) {
      setProjectName(project.name);
      setIsFavorite(project.isFavorite || false);
    }
  }, [project]);

  const handleSave = async () => {
    if (!project) return;
    if (!projectName.trim()) {
      toast({
        title: t('projectNameRequiredTitle', "Project Name Required"),
        description: t('projectNameRequiredDesc', "Please enter a name for the project."),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const projectUpdateData: Partial<Project> = {
      name: projectName,
      isFavorite: isFavorite,
      // description will not be updated here, assuming it's handled elsewhere or not editable in this modal
      // lastAccessed will be updated by serverTimestamp in FirestoreService
    };

    const success = await FirestoreService.updateProject(project.id, projectUpdateData);
    
    setIsSaving(false);

    if (success) {
      // Fetch the updated project to get server-generated timestamps
      const updatedProjectWithTimestamps = await FirestoreService.getProjectById(project.id);
      if (updatedProjectWithTimestamps) {
        onProjectUpdated(updatedProjectWithTimestamps);
      } else {
        // Fallback if fetch fails, use client-side optimistic update
        onProjectUpdated({ ...project, ...projectUpdateData, lastAccessed: new Date().toISOString() });
      }
      onClose(); 
      toast({
        title: t('projectUpdatedTitle', "Project Updated"),
        description: t('projectUpdatedDesc', `Project "${projectName}" has been successfully updated.`, { projectName: projectName }),
      });
    } else {
       toast({
        title: "Error",
        description: "Failed to update project.",
        variant: "destructive",
      });
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('editProjectTitle', 'Edit Project')}</DialogTitle>
          <DialogDescription>
            {t('editProjectDesc', 'Update the details for your project.')}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4 pb-0 flex-grow overflow-y-auto space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-project-name">
              {t('projectName', 'Project Name')}
            </Label>
            <Input
              id="edit-project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t('projectNamePlaceholder', "e.g., Spring Mall Inspection")}
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="edit-project-favorite"
              checked={isFavorite}
              onCheckedChange={setIsFavorite}
              disabled={isSaving}
            />
            <Label htmlFor="edit-project-favorite" className="cursor-pointer">
              {t('markAsFavorite', 'Mark as Favorite')}
            </Label>
          </div>
        </div>
        <DialogFooter className="flex flex-row justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !projectName.trim()}>
            {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
            {isSaving ? t('saving', 'Saving...') : t('updateProject', 'Update Project')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
