"use client";
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { NewProjectModal } from '@/components/modals/new-project-modal';
import { mockProjects, type Company, type Project, type ProjectStatus } from '@/data/mock-data';
import { FolderPlus, CheckCircle, Star, Clock, Sparkles, ArrowLeft } from 'lucide-react';
import { ProjectCard } from './project-card';
import { useLanguage } from '@/contexts/language-context';

interface ProjectDashboardProps {
  company: Company;
  onClearCompany: () => void;
}

export function ProjectDashboard({ company, onClearCompany }: ProjectDashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [activeTab, setActiveTab] = useState<ProjectStatus>('recent');
  const { t } = useLanguage();

  // Filter projects based on company and status
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.companyId !== company.id) return false;
      if (activeTab === 'favorite') return p.isFavorite === true;
      return p.status === activeTab;
    });
  }, [projects, company.id, activeTab]);
  
  const handleProjectCreated = (newProject: Project) => {
    setProjects(prevProjects => [...prevProjects, newProject]);
  };

  // Effect to reset tab if projects for current tab become empty after a project status change (not fully implemented here)
  useEffect(() => {
    // This is a placeholder for more complex logic if projects can change status dynamically
  }, [filteredProjects.length, activeTab]);

  const tabItems: { value: ProjectStatus; labelKey: string; defaultLabel: string; icon: React.ElementType }[] = [
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
          <h1 className="text-2xl font-bold font-headline">
            {t('selectedCompany', 'Selected Company')}: <span className="text-primary">{company.name}</span>
          </h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProjectStatus)}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
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
        <Button size="lg" onClick={() => setIsModalOpen(true)} className="w-full md:w-auto shadow-lg md:shadow-none">
          <FolderPlus className="mr-2 h-5 w-5" />
          {t('createNewProject', 'Create New Project')}
        </Button>
      </div>

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={handleProjectCreated}
        companyId={company.id}
      />
    </div>
  );
}
