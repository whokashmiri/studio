
"use client";
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { Project, AuthenticatedUser, MockStoredUser, Asset } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ShieldAlert, Users, Briefcase, UserCheck, UserSearch } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { ProjectCard } from '@/components/project-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssignProjectUsersModal } from '@/components/modals/assign-project-users-modal'; // Import the new modal
import { useToast } from '@/hooks/use-toast';

const MOCK_USERS_KEY = 'mockUsers';

export default function AdminDashboardPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [inspectors, setInspectors] = useState<AuthenticatedUser[]>([]);
  const [valuators, setValuators] = useState<AuthenticatedUser[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [projectToAssign, setProjectToAssign] = useState<Project | null>(null);

  const loadAdminData = () => {
    if (currentUser && currentUser.role === 'Admin') {
      const allProjects = LocalStorageService.getProjects();
      setCompanyProjects(allProjects.filter(p => p.companyId === currentUser.companyId));
      setAllAssets(LocalStorageService.getAssets());

      const storedUsersJson = localStorage.getItem(MOCK_USERS_KEY);
      const allUsers: MockStoredUser[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];
      
      const companyUsers = allUsers.filter(u => u.companyId === currentUser.companyId);
      setInspectors(companyUsers.filter(u => u.role === 'Inspector'));
      setValuators(companyUsers.filter(u => u.role === 'Valuation'));
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || currentUser.role !== 'Admin') {
        router.push('/'); 
      } else {
        loadAdminData();
      }
    }
  }, [authLoading, currentUser, router]);

  const projectAssetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allAssets.forEach(asset => {
      if (asset.projectId) {
        counts[asset.projectId] = (counts[asset.projectId] || 0) + 1;
      }
    });
    return counts;
  }, [allAssets]);

  const handleEditProject = (project: Project) => {
    // Placeholder for actual edit functionality if needed beyond assignment
    toast({ title: t('actionNotImplemented', "Action Not Implemented"), description: t('editProjectAdminPlaceholder', "Project editing from admin dashboard is a placeholder.")});
  };

  const handleToggleFavorite = (project: Project) => {
    // Placeholder or could be implemented if admins manage favorites
    const updatedProject = { ...project, isFavorite: !project.isFavorite };
    LocalStorageService.updateProject(updatedProject);
    loadAdminData(); // Refresh projects
    toast({
        title: updatedProject.isFavorite ? t('markedAsFavorite', 'Marked as Favorite') : t('unmarkedAsFavorite', 'Unmarked as Favorite'),
        description: `Project "${updatedProject.name}" favorite status updated.`,
      });
  };

  const handleOpenAssignUsersModal = (project: Project) => {
    setProjectToAssign(project);
    setIsAssignModalOpen(true);
  };

  const handleProjectAssignmentsUpdated = (updatedProject: Project) => {
    setCompanyProjects(prevProjects => 
      prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
    // Optionally re-fetch all projects if more complex updates are involved
    // loadAdminData(); 
  };


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
  
  const getInitials = (email?: string) => {
    if (!email) return 'N/A';
    return email.substring(0, 2).toUpperCase();
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl sm:text-3xl font-bold font-headline text-primary">
          {t('adminDashboardTitle', 'Admin Dashboard')}
        </CardTitle>
        <CardDescription>
          {t('adminDashboardDesc', 'Overview of projects and team members for {companyName}.', { companyName: currentUser.companyName })}
        </CardDescription>
      </CardHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline">
            <Briefcase className="h-6 w-6 text-primary" />
            {t('companyProjectsTitle', 'Company Projects')} ({companyProjects.length})
          </CardTitle>
          <CardDescription>{t('companyProjectsDescAdmin', 'All projects associated with your company.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {companyProjects.length > 0 ? (
            <ScrollArea className="h-[400px] pr-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companyProjects.map((project) => {
                  const projectAssetCount = projectAssetCounts[project.id] || 0;
                  return (
                     <ProjectCard
                        key={project.id}
                        project={project}
                        assetCount={projectAssetCount}
                        onEditProject={handleEditProject} 
                        onToggleFavorite={handleToggleFavorite}
                        onAssignUsers={handleOpenAssignUsersModal} // Pass the new handler
                      />
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground">{t('noProjectsFound', 'No projects found in this category.')}</p>
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
             <CardDescription>{t('inspectorsDescAdmin', 'List of all inspectors in your company.')}</CardDescription>
          </CardHeader>
          <CardContent>
            {inspectors.length > 0 ? (
              <ScrollArea className="h-[250px] pr-2">
                <ul className="space-y-3">
                  {inspectors.map(inspector => (
                    <li key={inspector.id} className="flex items-center space-x-3 p-2 border rounded-md hover:bg-muted/50">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{getInitials(inspector.email)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inspector.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{t(inspector.role.toLowerCase() + 'Role', inspector.role)}</p>
                      </div>
                    </li>
                  ))}
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
            <CardDescription>{t('valuatorsDescAdmin', 'List of all valuators in your company.')}</CardDescription>
          </CardHeader>
          <CardContent>
            {valuators.length > 0 ? (
               <ScrollArea className="h-[250px] pr-2">
                <ul className="space-y-3">
                  {valuators.map(valuator => (
                    <li key={valuator.id} className="flex items-center space-x-3 p-2 border rounded-md hover:bg-muted/50">
                      <Avatar className="h-9 w-9">
                         <AvatarFallback>{getInitials(valuator.email)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{valuator.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{t(valuator.role.toLowerCase() + 'Role', valuator.role)}</p>
                      </div>
                    </li>
                  ))}
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
    </div>
  );
}
