
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Project } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectUpdated: (updatedProject: Project) => void;
}

export function EditProjectModal({ isOpen, onClose, project, onProjectUpdated }: EditProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (project) {
      setProjectName(project.name);
      setProjectDescription(project.description || '');
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

    setIsLoading(true);

    const updatedProject: Project = {
      ...project,
      name: projectName,
      description: projectDescription,
      isFavorite: isFavorite,
      lastAccessed: new Date().toISOString(), // Update lastAccessed on edit
    };

    LocalStorageService.updateProject(updatedProject);
    
    onProjectUpdated(updatedProject);
    setIsLoading(false);
    onClose(); 
    
    toast({
      title: t('projectUpdatedTitle', "Project Updated"),
      description: t('projectUpdatedDesc', `Project "${updatedProject.name}" has been successfully updated.`, { projectName: updatedProject.name }),
    });
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
        <div className="grid gap-4 py-4 flex-grow overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="edit-project-name">
              {t('projectName', 'Project Name')}
            </Label>
            <Input
              id="edit-project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t('projectNamePlaceholder', "e.g., Spring Mall Inspection")}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-project-description">
              {t('projectDescription', 'Project Description')}
            </Label>
            <Textarea
              id="edit-project-description"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder={t('projectDescriptionPlaceholder', "Enter a brief description of the project.")}
              rows={3}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="edit-project-favorite"
              checked={isFavorite}
              onCheckedChange={setIsFavorite}
              disabled={isLoading}
            />
            <Label htmlFor="edit-project-favorite" className="cursor-pointer">
              {t('markAsFavorite', 'Mark as Favorite')}
            </Label>
          </div>
        </div>
        <DialogFooter className="flex flex-row justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !projectName.trim()}>
            {isLoading ? t('saving', 'Saving...') : t('updateProject', 'Update Project')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

