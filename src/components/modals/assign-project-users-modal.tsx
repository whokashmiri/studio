
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [selectedInspectorIds, setSelectedInspectorIds] = useState<Set<string>>(new Set());
  const [selectedValuatorIds, setSelectedValuatorIds] = useState<Set<string>>(new Set());
  const [inspectors, setInspectors] = useState<AuthenticatedUser[]>([]);
  const [valuators, setValuators] = useState<AuthenticatedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (project) {
      setSelectedInspectorIds(new Set(project.assignedInspectorIds || []));
      setSelectedValuatorIds(new Set(project.assignedValuatorIds || []));
    } else {
      setSelectedInspectorIds(new Set());
      setSelectedValuatorIds(new Set());
    }

    if (currentCompanyId) {
      const storedUsersJson = localStorage.getItem(MOCK_USERS_KEY);
      const allUsers: MockStoredUser[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];
      const companyUsers = allUsers.filter(u => u.companyId === currentCompanyId);
      setInspectors(companyUsers.filter(u => u.role === 'Inspector'));
      setValuators(companyUsers.filter(u => u.role === 'Valuation'));
    }
  }, [project, currentCompanyId, isOpen]);

  const handleInspectorChange = (inspectorId: string, checked: boolean) => {
    setSelectedInspectorIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(inspectorId);
      } else {
        newSet.delete(inspectorId);
      }
      return newSet;
    });
  };

  const handleValuatorChange = (valuatorId: string, checked: boolean) => {
    setSelectedValuatorIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(valuatorId);
      } else {
        newSet.delete(valuatorId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!project) return;
    setIsLoading(true);

    const updatedProject: Project = {
      ...project,
      assignedInspectorIds: Array.from(selectedInspectorIds),
      assignedValuatorIds: Array.from(selectedValuatorIds),
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
          {/* Assign Inspectors */}
          <div className="space-y-2">
            <Label>{t('assignInspectorsLabel', 'Assign Inspectors')}</Label>
            {inspectors.length > 0 ? (
              <ScrollArea className="h-[120px] border rounded-md p-2">
                <div className="space-y-2">
                  {inspectors.map(inspector => (
                    <div key={inspector.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`inspector-${inspector.id}`}
                        checked={selectedInspectorIds.has(inspector.id)}
                        onCheckedChange={(checked) => handleInspectorChange(inspector.id, !!checked)}
                        disabled={isLoading}
                      />
                      <Label htmlFor={`inspector-${inspector.id}`} className="font-normal text-sm">
                        {inspector.email}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noInspectorsFoundInCompany', 'No inspectors found in this company.')}</p>
            )}
          </div>

          {/* Assign Valuators */}
          <div className="space-y-2">
            <Label>{t('assignValuatorsLabel', 'Assign Valuators')}</Label>
            {valuators.length > 0 ? (
              <ScrollArea className="h-[120px] border rounded-md p-2">
                <div className="space-y-2">
                  {valuators.map(valuator => (
                    <div key={valuator.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`valuator-${valuator.id}`}
                        checked={selectedValuatorIds.has(valuator.id)}
                        onCheckedChange={(checked) => handleValuatorChange(valuator.id, !!checked)}
                        disabled={isLoading}
                      />
                      <Label htmlFor={`valuator-${valuator.id}`} className="font-normal text-sm">
                        {valuator.email}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noValuatorsFoundInCompany', 'No valuators found in this company.')}</p>
            )}
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
