
"use client";
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { NewProjectModal } from '@/components/modals/new-project-modal';
import { EditProjectModal } from '@/components/modals/edit-project-modal';
import type { Company, Project, ProjectStatus } from '@/data/mock-data'; // Removed Asset type
import * as FirestoreService from '@/lib/firestore-service';
import { FolderPlus, CheckCircle, Star, Clock, Sparkles, Loader2 } from 'lucide-react';
import { ProjectCard } from './project-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context'; 
import Link from 'next/link';

interface ProjectDashboardProps {
  company: Company;
  onLogout: () => void;
}

// Define a type for project with asset count
type ProjectWithAssetCount = Project & { assetCount: number };

export function ProjectDashboard({ company, onLogout }: ProjectDashboardProps) {
  const { currentUser } = useAuth(); 
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<ProjectWithAssetCount[]>([]); // Use new type
  // const [allAssets, setAllAssets] = useState<Asset[]>([]); // Removed allAssets state
  const [activeTab, setActiveTab] = useState<ProjectStatus | 'favorite'>('recent');
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  const { t } = useLanguage();
  const { toast } = useToast();

  const fetchProjectsAndAssets = useCallback(async () => {
    if (!company?.id || !currentUser) return;
    setIsLoadingProjects(true);
    try {
      const fetchedProjectsWithCounts = await FirestoreService.getProjects(company.id); // Fetches projects with counts
      setProjects(fetchedProjectsWithCounts);
      // Removed fetching all assets logic
    } catch (error) {
      console.error("Failed to fetch projects or assets:", error);
      toast({ title: "Error", description: "Could not load project data.", variant: "destructive" });
    } finally {
      setIsLoadingProjects(false);
    }
  }, [company?.id, currentUser, toast]);

  useEffect(() => {
    fetchProjectsAndAssets();
  }, [fetchProjectsAndAssets]);

  const filteredProjects = useMemo(() => {
    if (!currentUser) return [];

    const roleFilteredProjects = projects.filter(p => {
      if (p.companyId !== company.id) return false;
      if (currentUser.role === 'Admin') return true;
      if (currentUser.role === 'Inspector') return (p.assignedInspectorIds?.includes(currentUser.id) || p.createdByUserId === currentUser.id);
      if (currentUser.role === 'Valuation') return p.assignedValuatorIds?.includes(currentUser.id);
      return false;
    });

    return roleFilteredProjects.filter(p => {
      if (activeTab === 'favorite') return p.isFavorite === true;
      return p.status === activeTab;
    }).sort((a, b) => {
      if (activeTab === 'recent' && a.lastAccessed && b.lastAccessed) {
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
      }
      if (activeTab === 'new' && a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a.isFavorite && !b.isFavorite && activeTab === 'favorite') return -1;
      if (!a.isFavorite && b.isFavorite && activeTab === 'favorite') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [projects, company.id, activeTab, currentUser]);

  // Removed projectAssetCounts useMemo hook

  const handleProjectCreated = useCallback(async (newProject: Project) => {
    // Fetch the project again to get asset count if not already included, or simply add with count 0
    // For simplicity, refetching all projects is easier here or assume count is 0 for new project display temporarily
    // A better approach would be for addProject to return the count or the dashboard to fetch a single project with count
    await fetchProjectsAndAssets(); // Refetch all to get updated counts and sorting
    setActiveTab('new'); 
  }, [setActiveTab, fetchProjectsAndAssets]);


  const handleOpenEditModal = useCallback((project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  }, []);

  const handleProjectUpdated = useCallback(async (updatedProject: Project) => {
     // Refetch projects to ensure counts and all data are fresh
    await fetchProjectsAndAssets();
    if (editingProject && editingProject.id === updatedProject.id) {
        setEditingProject(null);
    }
  }, [editingProject, fetchProjectsAndAssets]);

  const handleToggleFavorite = useCallback(async (projectToToggle: ProjectWithAssetCount) => {
    const newIsFavorite = !projectToToggle.isFavorite;
    const success = await FirestoreService.updateProject(projectToToggle.id, { 
      isFavorite: newIsFavorite,
    });
    if (success) {
      const updatedProject = { ...projectToToggle, isFavorite: newIsFavorite, lastAccessed: new Date().toISOString() };
      setProjects(currentProjects => 
        currentProjects.map(p => 
          p.id === updatedProject.id ? updatedProject : p
        )
      );
      toast({
        title: newIsFavorite ? t('markedAsFavorite', 'Marked as Favorite') : t('unmarkedAsFavorite', 'Unmarked as Favorite'),
        description: t('projectFavoriteStatusUpdatedDesc', `Project "${projectToToggle.name}" favorite status updated.`, { projectName: projectToToggle.name}),
      });
    } else {
      toast({ title: "Error", description: "Failed to update favorite status.", variant: "destructive" });
    }
  }, [t, toast]);

  const tabItems: { value: ProjectStatus | 'favorite'; labelKey: string; defaultLabel: string; icon: React.ElementType }[] = [
    { value: 'recent', labelKey: 'recent', defaultLabel: 'Recent', icon: Clock },
    { value: 'favorite', labelKey: 'favorite', defaultLabel: 'Favorite', icon: Star },
    { value: 'new', labelKey: 'new', defaultLabel: 'New', icon: Sparkles },
    { value: 'done', labelKey: 'done', defaultLabel: 'Done', icon: CheckCircle },
  ];

  const canCreateProject = currentUser?.role === 'Admin' || currentUser?.role === 'Inspector';

  const handleProjectCardClick = (projectId: string) => {
    setLoadingProjectId(projectId);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary">
            {t('projectsFor', 'Projects for:')} {company.name}
          </h1>
          {currentUser && <p className="text-sm text-muted-foreground">{t('loggedInAsRole', 'Logged in as: {role}', { role: t(currentUser.role.toLowerCase() + 'Role', currentUser.role) })}</p>}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProjectStatus | 'favorite')}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10">
          {tabItems.map(item => (
            <TabsTrigger key={item.value} value={item.value} className="text-xs sm:text-sm py-2 sm:py-1.5">
              <item.icon className="mr-2 h-4 w-4" />
              {t(item.labelKey, item.defaultLabel)}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabItems.map(item => (
          <TabsContent key={item.value} value={item.value} className="mt-6">
            {isLoadingProjects ? (
              <div className="flex justify-center items-center h-[calc(100vh-22rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : filteredProjects.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-22rem)] sm:h-[calc(100vh-20rem)] md:h-[calc(60vh+2rem)] pr-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProjects.map((project) => (
                    <div key={project.id} onClick={() => handleProjectCardClick(project.id)}>
                      <ProjectCard
                        project={project}
                        assetCount={project.assetCount} // Use project.assetCount directly
                        onEditProject={handleOpenEditModal}
                        onToggleFavorite={() => handleToggleFavorite(project)}
                        isLoading={loadingProjectId === project.id}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">{t('noProjectsFoundInTab', 'No projects found in "{tabName}" tab.', {tabName: t(item.labelKey, item.defaultLabel)})}</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {canCreateProject && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t z-40 md:static md:bg-transparent md:p-0 md:border-none md:flex md:justify-end">
          <Button size="lg" onClick={() => setIsNewModalOpen(true)} className="w-full md:w-auto shadow-lg md:shadow-none">
            <FolderPlus className="mr-2 h-5 w-5" />
            {t('createNewProject', 'Create New Project')}
          </Button>
        </div>
      )}

      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onProjectCreated={handleProjectCreated}
        companyId={company.id}
      />
      {editingProject && (
        <EditProjectModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingProject(null);
          }}
          project={editingProject}
          onProjectUpdated={handleProjectUpdated}
        />
      )}
    </div>
  );
}
