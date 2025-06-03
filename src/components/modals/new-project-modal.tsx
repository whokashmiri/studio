
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Project } from '@/data/mock-data';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';

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

  const handleSave = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Project Name Required",
        description: "Please enter a name for the project.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const now = new Date().toISOString();
    const newProject: Project = {
      id: `proj_${Date.now()}`, // Simple unique ID
      name: projectName,
      companyId: companyId,
      status: 'recent', // Set status to 'recent'
      createdAt: now,
      lastAccessed: now, // Set lastAccessed time
      description: `Newly created project: ${projectName}`,
    };

    onProjectCreated(newProject);
    setIsLoading(false);
    setProjectName('');
    onClose();
    toast({
      title: "Project Created",
      description: `Project "${newProject.name}" has been successfully created.`,
    });
    // Redirect to the new project page
    router.push(`/project/${newProject.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('createNewProject', 'Create New Project')}</DialogTitle>
          <DialogDescription>
            Enter a name for your new inspection project. You can organize assets and folders within it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project-name" className="text-right">
              {t('projectName', 'Project Name')}
            </Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Spring Mall Inspection"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !projectName.trim()}>
            {isLoading ? "Saving..." : t('save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
