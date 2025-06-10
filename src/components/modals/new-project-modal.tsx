
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Project, ProjectStatus, UserRole } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context'; 
import { Loader2 } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
  companyId: string;
}

export function NewProjectModal({ isOpen, onClose, onProjectCreated, companyId }: NewProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { currentUser } = useAuth();

  const handleSave = async () => {
    if (!projectName.trim()) {
      toast({
        title: t('projectNameRequiredTitle', "Project Name Required"),
        description: t('projectNameRequiredDesc', "Please enter a name for the project."),
        variant: "destructive",
      });
      return;
    }
    if (!currentUser) {
      toast({
        title: t('error', "Error"),
        description: t('userNotAuthenticatedError', "User not authenticated. Cannot create project."),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    const newProjectData: Omit<Project, 'id' | 'createdAt' | 'lastAccessed'> = {
      name: projectName,
      companyId: companyId,
      status: 'new' as ProjectStatus,
      description: '',
      isFavorite: false,
      createdByUserId: currentUser.id,
      createdByUserRole: currentUser.role,
      assignedInspectorIds: [],
      assignedValuatorIds: [],
    };

    if (currentUser.role === 'Inspector') {
      newProjectData.assignedInspectorIds = [currentUser.id];
    }

    const createdProject = await FirestoreService.addProject(newProjectData);
    
    setIsSaving(false);

    if (createdProject) {
      onProjectCreated(createdProject); 
      setProjectName('');
      onClose(); 
      
      toast({
        title: t('projectCreatedTitle', "Project Created"),
        description: t('projectCreatedDesc', `Project "${createdProject.name}" has been successfully created.`, { projectName: createdProject.name }),
      });
      router.push(`/project/${createdProject.id}`);
    } else {
      toast({
        title: "Error",
        description: "Failed to create project.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setProjectName(''); 
      }
    }}>
      <DialogContent className="w-full max-h-[90vh] flex flex-col p-4 sm:p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('createNewProject', 'Create New Project')}</DialogTitle>
          <DialogDescription>
            {t('createNewProjectDesc', 'Enter a name for your new inspection project.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 items-center gap-2 flex-grow overflow-y-auto">
          <Input
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="col-span-2"
            type="text"
            placeholder={t('projectNamePlaceholder', "e.g., Spring Mall Inspection")}
            disabled={isSaving}
          />
        </div>
        <DialogFooter className="flex flex-row justify-end space-x-2">
          <Button variant="outline" onClick={() => { onClose(); setProjectName('');}} disabled={isSaving}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !projectName.trim()}>
            {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
            {isSaving ? t('saving', 'Saving...') : t('save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
