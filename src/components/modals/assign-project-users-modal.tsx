
"use client";
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Project, AuthenticatedUser } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Loader2 } from 'lucide-react';


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
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchUsers = async () => {
      if (currentCompanyId && isOpen) {
        setIsLoadingUsers(true);
        try {
          const companyUsers = await FirestoreService.getAllUsersByCompany(currentCompanyId);
          setInspectors(companyUsers.filter(u => u.role === 'Inspector'));
          setValuators(companyUsers.filter(u => u.role === 'Valuation'));
        } catch (error) {
          console.error("Error fetching users for assignment:", error);
          toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
        } finally {
          setIsLoadingUsers(false);
        }
      }
    };

    if (project) {
      setSelectedInspectorIds(new Set(project.assignedInspectorIds || []));
      setSelectedValuatorIds(new Set(project.assignedValuatorIds || []));
    } else {
      setSelectedInspectorIds(new Set());
      setSelectedValuatorIds(new Set());
    }
    fetchUsers();
  }, [project, currentCompanyId, isOpen, toast]);

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
    setIsSaving(true);

    const updatedProjectData: Partial<Project> = {
      assignedInspectorIds: Array.from(selectedInspectorIds),
      assignedValuatorIds: Array.from(selectedValuatorIds),
    };

    const success = await FirestoreService.updateProject(project.id, updatedProjectData);
    
    if (success) {
      const refreshedProject = await FirestoreService.getProjectById(project.id);
      if (refreshedProject) {
        onProjectUpdated(refreshedProject);
      }
      toast({
        title: t('assignmentsUpdatedTitle', "Assignments Updated"),
        description: t('assignmentsUpdatedDesc', `Assignments for project "${project.name}" have been updated.`, { projectName: project.name }),
      });
      onClose();
    } else {
      toast({ title: "Error", description: "Failed to update assignments.", variant: "destructive" });
    }
    setIsSaving(false);
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
            {t('assignUsersModalDesc', 'Select inspectors and/or valuators for this project.')}
          </DialogDescription>
        </DialogHeader>
        {isLoadingUsers ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="pt-4 pb-0 flex-grow overflow-y-auto space-y-4">
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
                          disabled={isSaving}
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
                          disabled={isSaving}
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
        )}
        <DialogFooter className="flex flex-row justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving || isLoadingUsers}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoadingUsers}>
            {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
            {isSaving ? t('saving', 'Saving...') : t('saveAssignmentsButton', 'Save Assignments')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
