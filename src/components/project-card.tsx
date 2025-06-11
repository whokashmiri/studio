
"use client";
import Link from 'next/link';
import React from 'react'; // Import React for React.memo
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Star, Users, MoreVertical, Trash2, PackageSearch, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from '@/data/mock-data';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProjectCardProps {
  project: Project;
  assetCount: number; 
  onEditProject: (project: Project) => void;
  onToggleFavorite: (project: Project) => void;
  onAssignUsers?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  isLoading?: boolean; // New prop
}

export const ProjectCard = React.memo(function ProjectCard({ 
  project, 
  assetCount, 
  onEditProject, 
  onToggleFavorite, 
  onAssignUsers,
  onDeleteProject,
  isLoading 
}: ProjectCardProps) {
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

  const hasAdminActions = !!onEditProject || !!onAssignUsers || !!onDeleteProject;

  return (
    <Card className="relative flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200">
      {isLoading && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}
      <Link href={`/project/${project.id}`} className={cn("flex flex-col flex-grow group", isLoading ? "pointer-events-none opacity-50" : "cursor-pointer")}>
          <CardHeader className="p-3 pb-1.5 w-full">
            <div className="flex justify-between items-start w-full gap-2">
              <div className="flex-grow min-w-0">
                <CardTitle className="text-base font-headline leading-tight group-hover:text-primary transition-colors">
                  {project.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground pt-0.5">
                  {t('totalAssets', '{count} Assets', { count: assetCount })}
                  {project.createdByUserRole === 'Inspector' && (
                    <span className="ml-1.5 italic text-xs text-accent/80">({t('createdByInspectorShort', 'Insp. Created')})</span>
                  )}
                </p>
              </div>
              <div className="flex items-center shrink-0 space-x-0.5">
                {isMobile && !hasAdminActions && (
                  <Badge 
                    variant={getStatusBadgeVariant(project.status)} 
                    className="capitalize text-xs mr-1"
                  >
                    {t(project.status.toLowerCase(), project.status)}
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
                
                {hasAdminActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault();}}
                        title={t('projectActionsMenuTitle', 'Project Actions')}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">{t('projectActionsMenuTitle', 'Project Actions')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      onClick={(e) => { e.stopPropagation(); e.preventDefault();}}
                    >
                      {onEditProject && (
                        <DropdownMenuItem onClick={() => onEditProject(project)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('editProjectTitle', 'Edit Project')}
                        </DropdownMenuItem>
                      )}
                      {onAssignUsers && (
                        <DropdownMenuItem onClick={() => onAssignUsers(project)}>
                          <Users className="mr-2 h-4 w-4" />
                          {t('assignUsersButtonTitle', 'Assign Users')}
                        </DropdownMenuItem>
                      )}
                      {onDeleteProject && (
                        <>
                          { (onEditProject || onAssignUsers) && <DropdownMenuSeparator />}
                          <DropdownMenuItem 
                            onClick={() => onDeleteProject(project)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('deleteProjectButton', 'Delete Project')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow p-3 pt-1.5 flex items-end">
            {(!isMobile || (isMobile && hasAdminActions)) && (
               <Badge 
                variant={getStatusBadgeVariant(project.status)} 
                className="capitalize text-xs"
              >
                {t(project.status.toLowerCase(), project.status)}
              </Badge>
            )}
          </CardContent>
      </Link>
    </Card>
  );
});

    
