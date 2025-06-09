
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Project, AuthenticatedUser, MockStoredUser } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';

const MOCK_USERS_KEY = 'mockUsers';

interface AssignProjectUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectUpdated: (updatedProject: Project) => void;
  currentCompanyId: string | null;
}

export function AssignProjectUsersModal({ isOpen, onClose, project, onProjectUpdated, currentCompanyId }: AssignProjectUsersModalProps) {
  const [assignedInspectorId, setAssignedInspectorId] = useState<string | undefined>(undefined);
  const [assignedValuatorId, setAssignedValuatorId] = useState<string | undefined>(undefined);
  const [inspectors, setInspectors] = useState<AuthenticatedUser[]>([]);
  const [valuators, setValuators] = useState<AuthenticatedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (project) {
      setAssignedInspectorId(project.assignedInspectorId || 'none');
      setAssignedValuatorId(project.assignedValuatorId || 'none');
    }
    if (currentCompanyId) {
      const storedUsersJson = localStorage.getItem(MOCK_USERS_KEY);
      const allUsers: MockStoredUser[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];
      const companyUsers = allUsers.filter(u => u.companyId === currentCompanyId);
      setInspectors(companyUsers.filter(u => u.role === 'Inspector'));
      setValuators(companyUsers.filter(u => u.role === 'Valuation'));
    }
  }, [project, currentCompanyId, isOpen]);

  const handleSave = async () => {
    if (!project) return;
    setIsLoading(true);

    const updatedProject: Project = {
      ...project,
      assignedInspectorId: assignedInspectorId === 'none' ? undefined : assignedInspectorId,
      assignedValuatorId: assignedValuatorId === 'none' ? undefined : assignedValuatorId,
      lastAccessed: new Date().toISOString(),
    };

    LocalStorageService.updateProject(updatedProject);
    onProjectUpdated(updatedProject);
    setIsLoading(false);
    onClose();

    toast({
      title: t('assignmentsUpdatedTitle', "Assignments Updated"),
      description: t('assignmentsUpdatedDesc', `Assignments for project "${updatedProject.name}" have been updated.`, { projectName: updatedProject.name }),
    });
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => {
      if (!openState) onClose();
    }}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('assignUsersToProjectTitle', 'Assign Users to Project:')} {project.name}</DialogTitle>
          <DialogDescription>
            {t('assignUsersModalDesc', 'Select an inspector and/or a valuator for this project.')}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4 pb-0 flex-grow overflow-y-auto space-y-4">
          {/* Assign Inspector */}
          <div className="space-y-2">
            <Label htmlFor="assign-inspector">{t('assignInspector', 'Assign Inspector')}</Label>
            <Select
              value={assignedInspectorId}
              onValueChange={setAssignedInspectorId}
              disabled={isLoading}
            >
              <SelectTrigger id="assign-inspector">
                <SelectValue placeholder={t('selectInspectorPlaceholder', 'Select an Inspector')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('unassign', 'Unassign')}</SelectItem>
                {inspectors.map(inspector => (
                  <SelectItem key={inspector.id} value={inspector.id}>
                    {inspector.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assign Valuator */}
          <div className="space-y-2">
            <Label htmlFor="assign-valuator">{t('assignValuator', 'Assign Valuator')}</Label>
            <Select
              value={assignedValuatorId}
              onValueChange={setAssignedValuatorId}
              disabled={isLoading}
            >
              <SelectTrigger id="assign-valuator">
                <SelectValue placeholder={t('selectValuatorPlaceholder', 'Select a Valuator')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('unassign', 'Unassign')}</SelectItem>
                {valuators.map(valuator => (
                  <SelectItem key={valuator.id} value={valuator.id}>
                    {valuator.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex flex-row justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t('saving', 'Saving...') : t('saveAssignmentsButton', 'Save Assignments')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
