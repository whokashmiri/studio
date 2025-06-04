
"use client";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Edit, Star, Clock } from 'lucide-react';
import type { Project } from '@/data/mock-data';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onEditProject: (project: Project) => void;
  onToggleFavorite: (project: Project) => void;
}

export function ProjectCard({ project, onEditProject, onToggleFavorite }: ProjectCardProps) {
  const { t } = useLanguage();
  const formattedDate = project.createdAt ? format(parseISO(project.createdAt), 'MMM d, yyyy') : 'N/A';
  
  const getStatusBadgeVariant = (status: Project['status']) => {
    switch (status) {
      case 'done': return 'default';
      case 'new': return 'secondary'; 
      case 'recent': return 'outline';
      default: return 'default';
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    e.preventDefault(); // Prevent link navigation if star is inside a link
    onToggleFavorite(project);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    e.preventDefault();
    onEditProject(project);
  };

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 group">
      <Link href={`/project/${project.id}`} className="flex flex-col flex-grow contents-display"> {/* contents-display allows Link to wrap complex children for layout */}
        <div className="flex flex-col flex-grow p-0 cursor-pointer"> {/* Added p-0 to reset Card default padding if Link wraps */}
          <CardHeader className="pb-2"> {/* Adjusted padding */}
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg font-headline leading-tight group-hover:text-primary transition-colors">{project.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 rounded-full -mr-2 -mt-1", // Adjust margins for better placement
                  project.isFavorite ? "text-yellow-400 hover:text-yellow-500" : "text-muted-foreground hover:text-yellow-400"
                )}
                onClick={handleFavoriteClick}
                title={project.isFavorite ? t('unmarkAsFavorite', 'Unmark as Favorite') : t('markAsFavorite', 'Mark as Favorite')}
              >
                <Star className={cn("h-5 w-5", project.isFavorite && "fill-yellow-400")} />
                <span className="sr-only">{project.isFavorite ? t('unmarkAsFavorite', 'Unmark as Favorite') : t('markAsFavorite', 'Mark as Favorite')}</span>
              </Button>
            </div>
            <CardDescription className="text-xs line-clamp-2 h-[2.5em] pt-1">{project.description || t('noDescriptionAvailable', 'No description available.')}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-2 pt-0 pb-3"> {/* Adjusted padding */}
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              {t('created', 'Created')}: {formattedDate}
            </div>
            {project.lastAccessed && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                {t('accessed', 'Accessed')}: {format(parseISO(project.lastAccessed), 'MMM d, yyyy, p')}
              </div>
            )}
            <Badge variant={getStatusBadgeVariant(project.status)} className="capitalize text-xs">{t(project.status, project.status)}</Badge>
          </CardContent>
        </div>
      </Link>
      <CardFooter className="border-t pt-3 pb-3"> {/* Adjusted padding */}
        <div className="flex w-full justify-end items-center">
          {/* "Open Project" button removed */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary h-8 w-8" // Standardized size
            onClick={handleEditClick} 
            title={t('editProjectTitle', 'Edit Project')}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">{t('editProjectTitle', 'Edit Project')}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
