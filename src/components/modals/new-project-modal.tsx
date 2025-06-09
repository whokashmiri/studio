
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Project, ProjectStatus, UserRole } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
  companyId: string;
}

export function NewProjectModal({ isOpen, onClose, onProjectCreated, companyId }: NewProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { currentUser } = useAuth(); // Get currentUser from AuthContext

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

    setIsLoading(true);
    
    const now = new Date().toISOString();
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: projectName,
      companyId: companyId,
      status: 'new' as ProjectStatus, // All new projects start as 'new'
      createdAt: now,
      lastAccessed: now,
      description: '',
      isFavorite: false,
      createdByUserId: currentUser.id,
      createdByUserRole: currentUser.role,
      assignedInspectorIds: [],
      assignedValuatorIds: [],
    };

    if (currentUser.role === 'Inspector') {
      newProject.assignedInspectorIds = [currentUser.id]; // Auto-assign to the creating inspector
    }

    LocalStorageService.addProject(newProject);
    
    onProjectCreated(newProject); 
    setIsLoading(false);
    setProjectName('');
    onClose(); 
    
    toast({
      title: t('projectCreatedTitle', "Project Created"),
      description: t('projectCreatedDesc', `Project "${newProject.name}" has been successfully created.`, { projectName: newProject.name }),
    });
    router.push(`/project/${newProject.id}`);
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
            disabled={isLoading}
          />
        </div>
        <DialogFooter className="flex flex-row justify-end space-x-2">
          <Button variant="outline" onClick={() => { onClose(); setProjectName('');}} disabled={isLoading}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !projectName.trim()}>
            {isLoading ? t('saving', 'Saving...') : t('save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
