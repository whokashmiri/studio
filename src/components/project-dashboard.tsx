
"use client";
import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { NewProjectModal } from '@/components/modals/new-project-modal';
import { EditProjectModal } from '@/components/modals/edit-project-modal'; // Added import
import type { Company, Project, ProjectStatus } from '@/data/mock-data';
import * as LocalStorageService from '@/lib/local-storage-service';
import { FolderPlus, CheckCircle, Star, Clock, Sparkles, ArrowLeft } from 'lucide-react';
import { ProjectCard } from './project-card';
import { useLanguage } from '@/contexts/language-context';

interface ProjectDashboardProps {
  company: Company;
  onClearCompany: () => void;
}

export function ProjectDashboard({ company, onClearCompany }: ProjectDashboardProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for edit modal
  const [editingProject, setEditingProject] = useState<Project | null>(null); // State for project being edited
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<ProjectStatus | 'favorite'>('recent');
  const { t } = useLanguage();

  useEffect(() => {
    setProjects(LocalStorageService.getProjects());
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
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [projects, company.id, activeTab]);
  
  const handleProjectCreated = (newProject: Project) => {
    setProjects(LocalStorageService.getProjects()); // Reload all projects
    setActiveTab('recent'); 
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(LocalStorageService.getProjects()); // Reload all projects
    // Optionally, you could try to keep the active tab or re-evaluate based on changes
    // For simplicity, just reloading all projects is fine here
  };
  
  const tabItems: { value: ProjectStatus | 'favorite'; labelKey: string; defaultLabel: string; icon: React.ElementType }[] = [
    { value: 'recent', labelKey: 'recent', defaultLabel: 'Recent', icon: Clock },
    { value: 'favorite', labelKey: 'favorite', defaultLabel: 'Favorite', icon: Star },
    { value: 'new', labelKey: 'new', defaultLabel: 'New', icon: Sparkles },
    { value: 'done', labelKey: 'done', defaultLabel: 'Done', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button variant="outline" size="sm" onClick={onClearCompany} className="mb-2 sm:mb-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('selectCompany', 'Select a Company')}
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold font-headline">
            {t('selectedCompany', 'Selected Company')}: <span className="text-primary">{company.name}</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} onEditProject={handleOpenEditModal} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">{t('noProjectsFound', 'No projects found in this category.')}</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t md:static md:bg-transparent md:p-0 md:border-none md:flex md:justify-end">
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
