
"use client";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Star } from 'lucide-react';
import type { Project } from '@/data/mock-data';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProjectCardProps {
  project: Project;
  assetCount: number; // New prop for asset count
  onEditProject: (project: Project) => void;
  onToggleFavorite: (project: Project) => void;
}

export function ProjectCard({ project, assetCount, onEditProject, onToggleFavorite }: ProjectCardProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  
  const getStatusBadgeVariant = (status: Project['status']) => {
    switch (status) {
      case 'done': return 'default';
      case 'new': return 'secondary'; 
      case 'recent': return 'outline';
      default: return 'outline'; 
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
      <Link href={`/project/${project.id}`} className="flex flex-col flex-grow group cursor-pointer">
          <CardHeader className="p-3 pb-1.5 w-full">
            <div className="flex justify-between items-start w-full gap-2">
              <div className="flex-grow min-w-0">
                <CardTitle className="text-base font-headline leading-tight group-hover:text-primary transition-colors">
                  {project.name}
                </CardTitle>
                 {/* Display asset count instead of description */}
                <p className="text-xs text-muted-foreground pt-0.5">
                  {t('totalAssets', '{count} Assets', { count: assetCount })}
                </p>
              </div>
              <div className="flex items-center shrink-0">
                {isMobile && (
                  <Badge 
                    variant={getStatusBadgeVariant(project.status === 'favorite' && project.lastAccessed ? 'recent' : project.status)} 
                    className="capitalize text-xs mr-1"
                  >
                    {t(project.status === 'favorite' && project.lastAccessed ? 'recent' : project.status, project.status)}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full",
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
                  className="text-muted-foreground hover:text-primary h-8 w-8"
                  onClick={handleEditClick} 
                  title={t('editProjectTitle', 'Edit Project')}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">{t('editProjectTitle', 'Edit Project')}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow p-3 pt-1.5 flex items-end">
            {!isMobile && (
               <Badge 
                variant={getStatusBadgeVariant(project.status === 'favorite' && project.lastAccessed ? 'recent' : project.status)} 
                className="capitalize text-xs"
              >
                {t(project.status === 'favorite' && project.lastAccessed ? 'recent' : project.status, project.status)}
              </Badge>
            )}
          </CardContent>
      </Link>
    </Card>
  );
}
