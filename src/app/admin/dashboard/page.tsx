
"use client";
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import type { Project, AuthenticatedUser, Asset } from '@/data/mock-data'; // Keep Asset for type consistency if any minor use remains, but primary count source changes
import * as FirestoreService from '@/lib/firestore-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ShieldAlert, Users, Briefcase, UserCheck, UserSearch, FolderOpen, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { ProjectCard } from '@/components/project-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssignProjectUsersModal } from '@/components/modals/assign-project-users-modal';
import { EditProjectModal } from '@/components/modals/edit-project-modal';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// Define a type for project with asset count
type ProjectWithAssetCount = Project & { assetCount: number };

// Helper function moved outside the component
const getInitials = (email?: string) => {
  if (!email) return 'N/A';
  return email.substring(0, 2).toUpperCase();
};

export default function AdminDashboardPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [companyProjects, setCompanyProjects] = useState<ProjectWithAssetCount[]>([]);
  const [inspectors, setInspectors] = useState<AuthenticatedUser[]>([]);
  const [valuators, setValuators] = useState<AuthenticatedUser[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [projectToAssign, setProjectToAssign] = useState<Project | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const loadAdminData = useCallback(async () => {
    if (currentUser && currentUser.role === 'Admin' && currentUser.companyId) {
      setPageLoading(true);
      try {
        const [projectsWithCounts, users] = await Promise.all([
          FirestoreService.getProjects(currentUser.companyId),
          FirestoreService.getAllUsersByCompany(currentUser.companyId),
        ]);
        
        setCompanyProjects(projectsWithCounts);
        setInspectors(users.filter(u => u.role === 'Inspector'));
        setValuators(users.filter(u => u.role === 'Valuation'));
      } catch (error) {
        console.error("Error loading admin data:", error);
        toast({ title: "Error", description: "Failed to load dashboard data.", variant: "destructive" });
      } finally {
        setPageLoading(false);
      }
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || currentUser.role !== 'Admin') {
        router.push('/'); 
      } else {
        loadAdminData();
      }
    }
  }, [authLoading, currentUser, router, loadAdminData]);

  const projectsByInspector = useMemo(() => {
    const map = new Map<string, ProjectWithAssetCount[]>();
    // Initialize map with all inspectors
    inspectors.forEach(inspector => {
      map.set(inspector.id, []);
    });
    // Populate projects
    companyProjects.forEach(project => {
      project.assignedInspectorIds?.forEach(inspectorId => {
        if (map.has(inspectorId)) {
          map.get(inspectorId)!.push(project);
        }
      });
    });
    return map;
  }, [inspectors, companyProjects]);

  const projectsByValuator = useMemo(() => {
    const map = new Map<string, ProjectWithAssetCount[]>();
    // Initialize map with all valuators
    valuators.forEach(valuator => {
      map.set(valuator.id, []);
    });
    // Populate projects
    companyProjects.forEach(project => {
      project.assignedValuatorIds?.forEach(valuatorId => {
        if (map.has(valuatorId)) {
          map.get(valuatorId)!.push(project);
        }
      });
    });
    return map;
  }, [valuators, companyProjects]);

  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  }, []);

  const handleToggleFavorite = useCallback(async (project: Project) => {
    const newIsFavorite = !project.isFavorite;
    // Optimistic UI update
    setCompanyProjects(prevProjects => 
      prevProjects.map(p => p.id === project.id ? { ...p, isFavorite: newIsFavorite, lastAccessed: Date.now() } : p)
    );

    const success = await FirestoreService.updateProject(project.id, { isFavorite: newIsFavorite });
    if (success) {
      toast({
          title: newIsFavorite ? t('markedAsFavorite', 'Marked as Favorite') : t('unmarkedAsFavorite', 'Unmarked as Favorite'),
          description: t('projectFavoriteStatusUpdatedDesc',`Project "${project.name}" favorite status updated.`, {projectName: project.name}),
        });
      // Optionally refetch specific project if server-generated lastAccessed is critical for immediate display
      // For now, optimistic Date.now() is fine.
    } else {
      // Revert optimistic update on failure
      setCompanyProjects(prevProjects => 
        prevProjects.map(p => p.id === project.id ? { ...p, isFavorite: !newIsFavorite, lastAccessed: project.lastAccessed } : p)
      );
      toast({ title: "Error", description: "Failed to update favorite status.", variant: "destructive" });
    }
  }, [t, toast]);

  const handleOpenAssignUsersModal = useCallback((project: Project) => {
    setProjectToAssign(project);
    setIsAssignModalOpen(true);
  }, []);

  const handleProjectAssignmentsUpdated = useCallback((updatedProjectFromModal: Project) => {
    // `updatedProjectFromModal` is of type `Project`, might not have `assetCount`
    // It contains the latest `assignedInspectorIds` and `assignedValuatorIds`
    setCompanyProjects(prevProjects =>
      prevProjects.map(p => {
        if (p.id === updatedProjectFromModal.id) {
          return {
            ...p, // Preserves assetCount and other fields from ProjectWithAssetCount
            assignedInspectorIds: updatedProjectFromModal.assignedInspectorIds,
            assignedValuatorIds: updatedProjectFromModal.assignedValuatorIds,
            lastAccessed: Date.now(), // Optimistic update for lastAccessed
          };
        }
        return p;
      })
    );
    toast({
      title: t('assignmentsUpdatedTitle', "Assignments Updated"),
      description: t('assignmentsUpdatedDesc', `Assignments for project "${updatedProjectFromModal.name}" have been updated.`, { projectName: updatedProjectFromModal.name }),
    });
  }, [t, toast]);

  const handleProjectUpdatedFromEdit = useCallback((updatedProjectFromModal: Project) => {
    // `updatedProjectFromModal` is of type `Project`, contains new name, isFavorite, etc.
    setCompanyProjects(prevProjects =>
      prevProjects.map(p => {
        if (p.id === updatedProjectFromModal.id) {
          return {
            ...p, // Preserves assetCount
            name: updatedProjectFromModal.name,
            isFavorite: updatedProjectFromModal.isFavorite,
            // Include other editable fields if any
            description: updatedProjectFromModal.description, 
            lastAccessed: Date.now(), // Optimistic update for lastAccessed
          };
        }
        return p;
      })
    );
  }, []);

  const promptDeleteProject = useCallback((project: Project) => {
    setProjectToDelete(project);
    setIsDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteProject = useCallback(async () => {
    if (projectToDelete) {
      const success = await FirestoreService.deleteProject(projectToDelete.id);
      if (success) {
        toast({
          title: t('projectDeletedTitle', 'Project Deleted'),
          description: t('projectDeletedDesc', `Project "${projectToDelete.name}" has been deleted.`, { projectName: projectToDelete.name }),
        });
        loadAdminData(); // Reload all data, as deletion is a major change.
      } else {
        toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" });
      }
      setProjectToDelete(null);
      setIsDeleteConfirmOpen(false);
    }
  }, [projectToDelete, loadAdminData, t, toast]);

  if (authLoading || pageLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mt-4">
          {authLoading ? t('loadingUserSession', 'Loading user session...') : t('loadingAdminData', 'Loading dashboard data...')}
        </p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">{t('accessDeniedTitle', 'Access Denied')}</h1>
        <p className="text-muted-foreground">{t('accessDeniedAdminDesc', 'You do not have permission to view this page.')}</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <CardHeader className="px-0 pt-0 flex-grow">
          <CardTitle className="text-2xl sm:text-3xl font-bold font-headline text-primary">
            {t('adminDashboardTitle', 'Admin Dashboard')}
          </CardTitle>
          <CardDescription>
            {t('adminDashboardDesc', 'Overview of projects and team members for {companyName}.', { companyName: currentUser.companyName })}
          </CardDescription>
        </CardHeader>
        <Link href="/admin/review-assets" passHref legacyBehavior>
          <Button variant="outline" size="lg">
            <Eye className="mr-2 h-5 w-5" />
            {t('reviewAllCompanyAssetsButton', 'Review All Company Assets')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline">
            <Briefcase className="h-6 w-6 text-primary" />
            {t('companyProjectsTitle', 'Company Projects')} ({companyProjects.length})
          </CardTitle>
          <CardDescription>{t('companyProjectsDescAdmin', 'All projects associated with your company. Use the "Assign Users" button on each project card to manage assignments.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {companyProjects.length > 0 ? (
            <ScrollArea className="h-[400px] pr-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companyProjects.map((project) => {
                  return (
                     <ProjectCard
                        key={project.id}
                        project={project}
                        assetCount={project.assetCount} 
                        onEditProject={handleEditProject} 
                        onToggleFavorite={handleToggleFavorite}
                        onAssignUsers={handleOpenAssignUsersModal}
                        onDeleteProject={promptDeleteProject}
                      />
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground">{t('noProjectsFound', 'No projects found for this company.')}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-headline">
              <UserCheck className="h-6 w-6 text-accent" />
              {t('inspectorsTitle', 'Inspectors')} ({inspectors.length})
            </CardTitle>
             <CardDescription>{t('inspectorsDescAdmin', 'List of all inspectors in your company and their assigned projects.')}</CardDescription>
          </CardHeader>
          <CardContent>
            {inspectors.length > 0 ? (
              <ScrollArea className="h-[350px] pr-2">
                <ul className="space-y-4">
                  {inspectors.map(inspector => {
                    const assignedProjectsToInspector = projectsByInspector.get(inspector.id) || [];
                    return (
                      <li key={inspector.id} className="flex flex-col space-y-2 p-3 border rounded-md hover:bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{getInitials(inspector.email)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{inspector.email}</p>
                            <p className="text-xs text-muted-foreground truncate">{t(inspector.role.toLowerCase() + 'Role', inspector.role)}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center">
                            <FolderOpen className="h-3 w-3 mr-1.5"/>
                            {t('assignedProjectsListTitle', 'Assigned Projects:')}
                          </h4>
                          {assignedProjectsToInspector.length > 0 ? (
                            <ul className="list-disc list-inside pl-2 space-y-0.5">
                              {assignedProjectsToInspector.map(p => (
                                <li key={p.id} className="text-xs text-foreground truncate" title={p.name}>
                                  {p.name} 
                                  {p.status === 'new' && <Badge variant="outline" className="ml-1.5 text-xs px-1.5 py-0 h-auto leading-tight">{t('new', 'New')}</Badge>}
                                  {p.status === 'recent' && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0 h-auto leading-tight">{t('recent', 'Recent')}</Badge>}
                                  {p.status === 'done' && <Badge variant="default" className="ml-1.5 text-xs px-1.5 py-0 h-auto leading-tight">{t('done', 'Done')}</Badge>}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground pl-2">{t('noProjectsAssigned', 'No projects currently assigned.')}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground">{t('noInspectorsFound', 'No inspectors found in this company.')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-headline">
                <UserSearch className="h-6 w-6 text-secondary-foreground" /> 
                {t('valuatorsTitle', 'Valuators')} ({valuators.length})
            </CardTitle>
            <CardDescription>{t('valuatorsDescAdmin', 'List of all valuators in your company and their assigned projects.')}</CardDescription>
          </CardHeader>
          <CardContent>
            {valuators.length > 0 ? (
               <ScrollArea className="h-[350px] pr-2">
                <ul className="space-y-4">
                  {valuators.map(valuator => {
                     const assignedProjectsToValuator = projectsByValuator.get(valuator.id) || [];
                    return (
                      <li key={valuator.id} className="flex flex-col space-y-2 p-3 border rounded-md hover:bg-muted/50">
                         <div className="flex items-center space-x-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{getInitials(valuator.email)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{valuator.email}</p>
                            <p className="text-xs text-muted-foreground truncate">{t(valuator.role.toLowerCase() + 'Role', valuator.role)}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center">
                            <FolderOpen className="h-3 w-3 mr-1.5"/>
                            {t('assignedProjectsListTitle', 'Assigned Projects:')}
                          </h4>
                          {assignedProjectsToValuator.length > 0 ? (
                            <ul className="list-disc list-inside pl-2 space-y-0.5">
                              {assignedProjectsToValuator.map(p => (
                                 <li key={p.id} className="text-xs text-foreground truncate" title={p.name}>
                                  {p.name}
                                  {p.status === 'new' && <Badge variant="outline" className="ml-1.5 text-xs px-1.5 py-0 h-auto leading-tight">{t('new', 'New')}</Badge>}
                                  {p.status === 'recent' && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0 h-auto leading-tight">{t('recent', 'Recent')}</Badge>}
                                  {p.status === 'done' && <Badge variant="default" className="ml-1.5 text-xs px-1.5 py-0 h-auto leading-tight">{t('done', 'Done')}</Badge>}
                                 </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground pl-2">{t('noProjectsAssigned', 'No projects currently assigned.')}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground">{t('noValuatorsFound', 'No valuators found in this company.')}</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {projectToAssign && currentUser && (
        <AssignProjectUsersModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          project={projectToAssign}
          onProjectUpdated={handleProjectAssignmentsUpdated}
          currentCompanyId={currentUser.companyId}
        />
      )}

      {editingProject && (
        <EditProjectModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingProject(null);
          }}
          project={editingProject}
          onProjectUpdated={handleProjectUpdatedFromEdit}
        />
      )}

      {projectToDelete && (
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteProjectConfirmationTitle', 'Confirm Project Deletion')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteProjectConfirmationDesc', `Are you sure you want to delete project "{projectName}"? This action cannot be undone and will delete all associated folders and assets.`, { projectName: projectToDelete.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setProjectToDelete(null); setIsDeleteConfirmOpen(false); }}>{t('cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('delete', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
