
"use client";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Star } from 'lucide-react';
import type { Project } from '@/data/mock-data';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onEditProject: (project: Project) => void;
  onToggleFavorite: (project: Project) => void;
}

export function ProjectCard({ project, onEditProject, onToggleFavorite }: ProjectCardProps) {
  const { t } = useLanguage();
  
  const getStatusBadgeVariant = (status: Project['status']) => {
    switch (status) {
      case 'done': return 'default';
      case 'new': return 'secondary'; 
      case 'recent': return 'outline';
      default: return 'default';
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault(); 
    onToggleFavorite(project);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();
    onEditProject(project);
  };

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <Link href={`/project/${project.id}`} className="flex flex-col flex-grow p-3 group cursor-pointer">
          <CardHeader className="p-0 pb-1.5 w-full">
            <div className="flex justify-between items-start w-full">
              <CardTitle className="text-base font-headline leading-tight group-hover:text-primary transition-colors mr-2">
                {project.name}
              </CardTitle>
              <div className="flex items-center shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full", // Increased size
                    project.isFavorite ? "text-yellow-400 hover:text-yellow-500" : "text-muted-foreground hover:text-yellow-400"
                  )}
                  onClick={handleFavoriteClick}
                  title={project.isFavorite ? t('unmarkAsFavorite', 'Unmark as Favorite') : t('markAsFavorite', 'Mark as Favorite')}
                >
                  <Star className={cn("h-4 w-4", project.isFavorite && "fill-yellow-400")} />
                  <span className="sr-only">{project.isFavorite ? t('unmarkAsFavorite', 'Unmark as Favorite') : t('markAsFavorite', 'Mark as Favorite')}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-primary h-8 w-8" // Increased size
                  onClick={handleEditClick} 
                  title={t('editProjectTitle', 'Edit Project')}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">{t('editProjectTitle', 'Edit Project')}</span>
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs line-clamp-1 pt-0.5">
                {project.description || t('noDescriptionAvailable', 'No description available.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow p-0 pt-1.5 flex items-end">
            <Badge variant={getStatusBadgeVariant(project.status)} className="capitalize text-xs">
                {t(project.status, project.status)}
            </Badge>
          </CardContent>
      </Link>
    </Card>
  );
}
