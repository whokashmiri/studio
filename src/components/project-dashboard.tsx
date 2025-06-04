
"use client";
import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { NewProjectModal } from '@/components/modals/new-project-modal';
import { EditProjectModal } from '@/components/modals/edit-project-modal';
import type { Company, Project, ProjectStatus, Asset } from '@/data/mock-data'; // Added Asset
import * as LocalStorageService from '@/lib/local-storage-service';
import { FolderPlus, CheckCircle, Star, Clock, Sparkles, ArrowLeft } from 'lucide-react';
import { ProjectCard } from './project-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';

interface ProjectDashboardProps {
  company: Company;
  onClearCompany: () => void;
}

export function ProjectDashboard({ company, onClearCompany }: ProjectDashboardProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]); // New state for all assets
  const [activeTab, setActiveTab] = useState<ProjectStatus | 'favorite'>('recent');
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    setProjects(LocalStorageService.getProjects());
    setAllAssets(LocalStorageService.getAssets()); // Load all assets on mount/company change
  }, [company.id]); 

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.companyId !== company.id) return false;
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
  }, [projects, company.id, activeTab]);
  
  const handleProjectCreated = (newProject: Project) => {
    setProjects(LocalStorageService.getProjects());
    // No need to reload allAssets here unless project creation affects assets globally
    setActiveTab('recent'); 
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(LocalStorageService.getProjects());
    if (editingProject && editingProject.id === updatedProject.id) {
        setEditingProject(null);
    }
  };

  const handleToggleFavorite = (projectToToggle: Project) => {
    const updatedProjectData = {
      ...projectToToggle,
      isFavorite: !projectToToggle.isFavorite,
      lastAccessed: new Date().toISOString(), 
    };
    LocalStorageService.updateProject(updatedProjectData);
    setProjects(currentProjects => currentProjects.map(p => p.id === updatedProjectData.id ? updatedProjectData : p));
    toast({
      title: updatedProjectData.isFavorite ? t('markedAsFavorite', 'Marked as Favorite') : t('unmarkedAsFavorite', 'Unmarked as Favorite'),
      description: `Project "${updatedProjectData.name}" status updated.`,
    });
  };
  
  const tabItems: { value: ProjectStatus | 'favorite'; labelKey: string; defaultLabel: string; icon: React.ElementType }[] = [
    { value: 'recent', labelKey: 'recent', defaultLabel: 'Recent', icon: Clock },
    { value: 'favorite', labelKey: 'favorite', defaultLabel: 'Favorite', icon: Star },
    { value: 'new', labelKey: 'new', defaultLabel: 'New', icon: Sparkles },
    { value: 'done', labelKey: 'done', defaultLabel: 'Done', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0"> 
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button variant="outline" size="sm" onClick={onClearCompany} className="mb-2 sm:mb-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('selectCompany', 'Select a Company')}
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary">
            {company.name}
          </h1>
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
              <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-18rem)] md:h-[60vh] pr-3"> 
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProjects.map((project) => {
                    const projectAssetCount = allAssets.filter(asset => asset.projectId === project.id).length;
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
                <p className="text-lg text-muted-foreground">{t('noProjectsFound', 'No projects found in this category.')}</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t z-40 md:static md:bg-transparent md:p-0 md:border-none md:flex md:justify-end">
        <Button size="lg" onClick={() => setIsNewModalOpen(true)} className="w-full md:w-auto shadow-lg md:shadow-none">
          <FolderPlus className="mr-2 h-5 w-5" />
          {t('createNewProject', 'Create New Project')}
        </Button>
      </div>

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
