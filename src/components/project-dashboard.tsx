
"use client";
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { NewProjectModal } from '@/components/modals/new-project-modal';
import { EditProjectModal } from '@/components/modals/edit-project-modal';
import type { Company, Project, ProjectStatus, Asset } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { FolderPlus, CheckCircle, Star, Clock, Sparkles } from 'lucide-react';
import { ProjectCard } from './project-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context'; 

interface ProjectDashboardProps {
  company: Company;
  onLogout: () => void;
}

export function ProjectDashboard({ company, onLogout }: ProjectDashboardProps) {
  const { currentUser } = useAuth(); 
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [activeTab, setActiveTab] = useState<ProjectStatus | 'favorite'>('recent');
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    setProjects(LocalStorageService.getProjects());
    setAllAssets(LocalStorageService.getAssets());
  }, [company.id]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.companyId !== company.id) return false;
      
      if (activeTab === 'favorite') return p.isFavorite === true;

      if (activeTab === 'new') {
        if (currentUser?.role === 'Inspector') {
          return (p.assignedInspectorIds?.includes(currentUser.id) || p.createdByUserId === currentUser.id) && p.status === 'new';
        }
        if (currentUser?.role === 'Valuation') {
          return p.assignedValuatorIds?.includes(currentUser.id) && p.status === 'new';
        }
        return p.status === 'new';
      }
      
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

  const projectAssetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allAssets.forEach(asset => {
      if (asset.projectId) {
        counts[asset.projectId] = (counts[asset.projectId] || 0) + 1;
      }
    });
    return counts;
  }, [allAssets]);

  const handleProjectCreated = useCallback((newProject: Project) => {
    setProjects(LocalStorageService.getProjects());
    setActiveTab('new'); 
  }, [setActiveTab, setProjects]);

  const handleOpenEditModal = useCallback((project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  }, [setEditingProject, setIsEditModalOpen]);

  const handleProjectUpdated = useCallback((updatedProject: Project) => {
    setProjects(LocalStorageService.getProjects());
    if (editingProject && editingProject.id === updatedProject.id) {
        setEditingProject(null);
    }
  }, [editingProject, setProjects, setEditingProject]);

  const handleToggleFavorite = useCallback((projectToToggle: Project) => {
    const updatedProjectData = {
      ...projectToToggle,
      isFavorite: !projectToToggle.isFavorite,
      lastAccessed: new Date().toISOString(),
    };
    LocalStorageService.updateProject(updatedProjectData);
    setProjects(currentProjects => currentProjects.map(p => p.id === updatedProjectData.id ? updatedProjectData : p));
    toast({
      title: updatedProjectData.isFavorite ? t('markedAsFavorite', 'Marked as Favorite') : t('unmarkedAsFavorite', 'Unmarked as Favorite'),
      description: t('projectFavoriteStatusUpdatedDesc', `Project "${updatedProjectData.name}" favorite status updated.`, { projectName: updatedProjectData.name}),
    });
  }, [setProjects, t, toast]);

  const tabItems: { value: ProjectStatus | 'favorite'; labelKey: string; defaultLabel: string; icon: React.ElementType }[] = [
    { value: 'recent', labelKey: 'recent', defaultLabel: 'Recent', icon: Clock },
    { value: 'favorite', labelKey: 'favorite', defaultLabel: 'Favorite', icon: Star },
    { value: 'new', labelKey: 'new', defaultLabel: 'New', icon: Sparkles },
    { value: 'done', labelKey: 'done', defaultLabel: 'Done', icon: CheckCircle },
  ];

  const canCreateProject = currentUser?.role === 'Admin' || currentUser?.role === 'Inspector';

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
            {filteredProjects.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-22rem)] sm:h-[calc(100vh-20rem)] md:h-[calc(60vh+2rem)] pr-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProjects.map((project) => {
                    const projectAssetCount = projectAssetCounts[project.id] || 0;
                    return (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        assetCount={projectAssetCount}
                        onEditProject={handleOpenEditModal}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    );
                  })}
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
