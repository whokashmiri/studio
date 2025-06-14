
"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Project, AuthenticatedUser, UserRole, MockStoredUser } from '@/data/mock-data';
import * as FirestoreService from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Loader2, Search, UserPlus, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';


interface AssignProjectUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectUpdated: (updatedProject: Project) => void;
  currentCompanyId: string | null; // Admin's company ID
}

export function AssignProjectUsersModal({ isOpen, onClose, project, onProjectUpdated, currentCompanyId }: AssignProjectUsersModalProps) {
  const { currentUser } = useAuth();
  const [selectedInspectorIds, setSelectedInspectorIds] = useState<Set<string>>(new Set());
  const [selectedValuatorIds, setSelectedValuatorIds] = useState<Set<string>>(new Set());
  
  const [allCompanyUsers, setAllCompanyUsers] = useState<AuthenticatedUser[]>([]);
  const [isLoadingCompanyUsers, setIsLoadingCompanyUsers] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState<AuthenticatedUser[]>([]);
  const [allUsersForSuggestions, setAllUsersForSuggestions] = useState<AuthenticatedUser[]>([]);
  const [isFetchingAllUsers, setIsFetchingAllUsers] = useState(false);

  const [searchedUserResult, setSearchedUserResult] = useState<MockStoredUser | null>(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [noUserFoundMessage, setNoUserFoundMessage] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();

  const inspectors = useMemo(() => allCompanyUsers.filter(u => u.role === 'Inspector'), [allCompanyUsers]);
  const valuators = useMemo(() => allCompanyUsers.filter(u => u.role === 'Valuation'), [allCompanyUsers]);

  const fetchInitialData = useCallback(async () => {
    if (currentCompanyId) {
      setIsLoadingCompanyUsers(true);
      setIsFetchingAllUsers(true);
      try {
        const [companyUsers, allSystemUsers] = await Promise.all([
          FirestoreService.getAllUsersByCompany(currentCompanyId),
          FirestoreService.getAllUsers() // For suggestions
        ]);
        setAllCompanyUsers(companyUsers);
        setAllUsersForSuggestions(allSystemUsers);
      } catch (error) {
        console.error("Error fetching initial user data:", error);
        toast({ title: "Error", description: "Could not load user data.", variant: "destructive" });
      } finally {
        setIsLoadingCompanyUsers(false);
        setIsFetchingAllUsers(false);
      }
    }
  }, [currentCompanyId, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      if (project) {
        setSelectedInspectorIds(new Set(project.assignedInspectorIds || []));
        setSelectedValuatorIds(new Set(project.assignedValuatorIds || []));
      } else {
        setSelectedInspectorIds(new Set());
        setSelectedValuatorIds(new Set());
      }
      setSearchTerm('');
      setSearchedUserResult(null);
      setEmailSuggestions([]);
      setNoUserFoundMessage(null);
    }
  }, [project, isOpen, fetchInitialData]);

  const handleSearchTermChange = (term: string) => {
    setSearchTerm(term);
    setSearchedUserResult(null); // Clear previous exact search result
    setNoUserFoundMessage(null);
    if (term.trim() === '') {
      setEmailSuggestions([]);
      return;
    }
    const filtered = allUsersForSuggestions
      .filter(user => user.email.toLowerCase().startsWith(term.toLowerCase()))
      .slice(0, 5); // Limit suggestions
    setEmailSuggestions(filtered);
  };

  const handleSuggestionClick = async (user: AuthenticatedUser) => {
    setSearchTerm(user.email); // Fill search bar with selected email
    setEmailSuggestions([]);    // Hide suggestions
    setIsLoadingSearch(true);
    setNoUserFoundMessage(null);
    try {
      // Fetch the full user details (MockStoredUser might have more, like password if ever needed by service)
      const fullUser = await FirestoreService.getUserById(user.id);
      if (fullUser) {
        setSearchedUserResult(fullUser);
      } else {
        setSearchedUserResult(null);
        setNoUserFoundMessage(t('userNotFoundForInvite', 'User with email "{email}" not found. They need an account to be assigned.', { email: user.email }));
      }
    } catch (error) {
        console.error("Error fetching selected user from suggestion:", error);
        toast({ title: "Error", description: "Failed to fetch user details.", variant: "destructive" });
        setSearchedUserResult(null);
    } finally {
        setIsLoadingSearch(false);
    }
  };
  
  const handleSearchUserByTypedEmail = async () => {
    if (!searchTerm.trim()) {
      setSearchedUserResult(null);
      setNoUserFoundMessage(null);
      setEmailSuggestions([]);
      return;
    }
    setIsLoadingSearch(true);
    setNoUserFoundMessage(null);
    setEmailSuggestions([]); // Clear suggestions on explicit search
    try {
      const user = await FirestoreService.getUserByEmail(searchTerm.trim());
      if (user) {
        setSearchedUserResult(user);
      } else {
        setSearchedUserResult(null);
        setNoUserFoundMessage(t('userNotFoundForInvite', 'User with email "{email}" not found. They need an account to be assigned.', { email: searchTerm.trim() }));
      }
    } catch (error) {
      console.error("Error searching users:", error);
      toast({ title: "Error", description: "Failed to search for user.", variant: "destructive" });
      setSearchedUserResult(null);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleInviteOrUpdateUserRole = async (userToUpdate: MockStoredUser, newRole: UserRole) => {
    if (!currentCompanyId || !currentUser?.companyName) {
      toast({ title: "Error", description: "Cannot determine current company to assign user.", variant: "destructive" });
      return;
    }
    // Use a separate loading state for this action or reuse isLoadingSearch
    setIsLoadingSearch(true); 
    
    const success = await FirestoreService.updateUserRoleAndCompany(userToUpdate.id, newRole, currentCompanyId, currentUser.companyName);
    
    if (success) {
      toast({
        title: t('userRoleUpdatedTitle', 'User Role Updated'),
        description: t('userRoleUpdatedDesc', `User ${userToUpdate.email} is now a ${newRole} in ${currentUser.companyName}.`, { email: userToUpdate.email, role: newRole, companyName: currentUser.companyName }),
      });
      // Refresh data for both suggestion list and company user list
      await fetchInitialData(); 
      setSearchTerm(''); 
      setSearchedUserResult(null);
      setEmailSuggestions([]);
    } else {
      toast({ title: "Error", description: `Failed to update role for ${userToUpdate.email}.`, variant: "destructive" });
    }
    setIsLoadingSearch(false);
  };


  const handleCheckboxChange = (
    userId: string,
    role: 'Inspector' | 'Valuation',
    checked: boolean
  ) => {
    const setter = role === 'Inspector' ? setSelectedInspectorIds : setSelectedValuatorIds;
    setter(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handleSaveAssignments = async () => {
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
  
  const renderUserActionButtons = (user: MockStoredUser) => {
    if (!currentCompanyId) return null;

    const isUserInCurrentCompany = user.companyId === currentCompanyId;
    const isInspectorInCurrentCompany = isUserInCurrentCompany && user.role === 'Inspector';
    const isValuatorInCurrentCompany = isUserInCurrentCompany && user.role === 'Valuation';

    const actionButtons = [];

    if (!isInspectorInCurrentCompany) {
      actionButtons.push(
        <Button key="make-inspector" size="sm" variant="outline" onClick={() => handleInviteOrUpdateUserRole(user, 'Inspector')} disabled={isLoadingSearch}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          {isUserInCurrentCompany ? t('makeInspectorButton', 'Make Inspector') : t('addAsInspectorButton', 'Add as Inspector')}
        </Button>
      );
    }
    if (!isValuatorInCurrentCompany) {
      actionButtons.push(
        <Button key="make-valuator" size="sm" variant="outline" onClick={() => handleInviteOrUpdateUserRole(user, 'Valuation')} disabled={isLoadingSearch}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          {isUserInCurrentCompany ? t('makeValuatorButton', 'Make Valuator') : t('addAsValuatorButton', 'Add as Valuator')}
        </Button>
      );
    }
    if (isInspectorInCurrentCompany || isValuatorInCurrentCompany) {
         actionButtons.push(
            <div key="already-role" className="text-xs text-muted-foreground flex items-center">
                <UserCheck className="mr-1.5 h-3.5 w-3.5 text-green-600"/>
                {t('userAlreadyRoleInCompany', 'Already a {role} in this company.', { role: user.role })}
            </div>
         )
    }

    return actionButtons.length > 0 ? <div className="flex gap-2 mt-1 flex-wrap">{actionButtons}</div> : (
        <div className="text-xs text-muted-foreground mt-1">
            {t('noActionsAvailableForUser', 'User found. No immediate role actions needed for this company.')}
        </div>
    );
  };

  if (!project || !currentUser) return null;
  const isLoadingAnything = isSaving || isLoadingCompanyUsers || isLoadingSearch || isFetchingAllUsers;

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => {
      if (!openState) onClose();
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('assignUsersToProjectTitle', 'Assign Users to:')} {project.name}</DialogTitle>
          <DialogDescription>
            {t('assignUsersModalDescExtended', 'Search for users by email to add them as Inspectors or Valuators to your company, then assign them to this project.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="pt-4 space-y-1 relative">
          <Label htmlFor="user-search-email">{t('searchUserByEmailLabel', 'Search User by Email')}</Label>
          <div className="flex gap-2">
            <Input
              id="user-search-email"
              type="email"
              placeholder={t('emailPlaceholder', 'user@example.com')}
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchUserByTypedEmail()}
              disabled={isLoadingAnything}
            />
            <Button onClick={handleSearchUserByTypedEmail} disabled={isLoadingAnything || !searchTerm.trim()}>
              {isLoadingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {emailSuggestions.length > 0 && (
            <div className="absolute z-10 w-[calc(100%-theme(space.10))] bg-background border border-input rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
              {emailSuggestions.map(user => (
                <div
                  key={user.id}
                  className="p-2 hover:bg-accent cursor-pointer text-sm"
                  onClick={() => handleSuggestionClick(user)}
                >
                  {user.email}
                </div>
              ))}
            </div>
          )}
        </div>

        {(isLoadingSearch && !searchedUserResult) && (
            <div className="py-3 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary inline-block" />
            </div>
        )}

        {searchedUserResult && (
          <div className="mt-3 border rounded-md p-3 space-y-2 bg-muted/30">
            <h4 className="text-sm font-medium">{t('searchResultsTitle', 'Search Results')}</h4>
            <div className="p-2 border-b last:border-b-0">
              <p className="text-sm font-medium">{searchedUserResult.email}</p>
              <p className="text-xs text-muted-foreground">
                {searchedUserResult.companyId === currentCompanyId ? 
                  `${t('currentRoleLabel', 'Role:')} ${t(searchedUserResult.role.toLowerCase() + 'Role', searchedUserResult.role)} ${t('inYourCompanyShort', '(Your Company)')}` : 
                  (searchedUserResult.companyName ? `${t('associatedWithCompanyLabel', 'With:')} ${searchedUserResult.companyName}` : t('noCompanyAffiliationLabel', 'No current company affiliation'))
                }
              </p>
              {renderUserActionButtons(searchedUserResult)}
            </div>
          </div>
        )}
        {noUserFoundMessage && (
            <div className="mt-3 text-sm text-muted-foreground p-3 border rounded-md bg-amber-50 border-amber-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0"/> {noUserFoundMessage}
            </div>
        )}
        
        {(isLoadingCompanyUsers && !searchedUserResult) && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoadingCompanyUsers && !isFetchingAllUsers && (
          <div className="mt-4 pt-2 border-t flex-grow overflow-y-auto space-y-4 min-h-[200px]">
            <div className="space-y-2">
              <Label>{t('assignInspectorsLabel', 'Assign Inspectors from Company')}</Label>
              {inspectors.length > 0 ? (
                <ScrollArea className="h-[120px] border rounded-md p-2">
                  <div className="space-y-2">
                    {inspectors.map(inspector => (
                      <div key={inspector.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`inspector-${inspector.id}`}
                          checked={selectedInspectorIds.has(inspector.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(inspector.id, 'Inspector', !!checked)}
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
                <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/30">{t('noInspectorsFoundInCompany', 'No inspectors currently in your company. Use search to add or assign roles.')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('assignValuatorsLabel', 'Assign Valuators from Company')}</Label>
              {valuators.length > 0 ? (
                <ScrollArea className="h-[120px] border rounded-md p-2">
                  <div className="space-y-2">
                    {valuators.map(valuator => (
                      <div key={valuator.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`valuator-${valuator.id}`}
                          checked={selectedValuatorIds.has(valuator.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(valuator.id, 'Valuation', !!checked)}
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
                <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/30">{t('noValuatorsFoundInCompany', 'No valuators currently in your company. Use search to add or assign roles.')}</p>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="flex flex-row justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoadingAnything}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSaveAssignments} disabled={isLoadingAnything}>
            {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
            {isSaving ? t('saving', 'Saving...') : t('saveAssignmentsButton', 'Save Assignments')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
