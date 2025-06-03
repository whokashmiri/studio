
"use client";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderArchive, CalendarDays, Edit, Star, Clock } from 'lucide-react'; // Replaced custom ClockSmall with lucide Clock
import type { Project } from '@/data/mock-data';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/language-context';

interface ProjectCardProps {
  project: Project;
  onEditProject: (project: Project) => void;
}

export function ProjectCard({ project, onEditProject }: ProjectCardProps) {
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

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-headline leading-tight">{project.name}</CardTitle>
          {project.isFavorite && <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
        </div>
        <CardDescription className="text-xs line-clamp-2 h-[2.5em]">{project.description || t('noDescriptionAvailable', 'No description available.')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <div className="flex items-center text-xs text-muted-foreground">
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
          {t('created', 'Created')}: {formattedDate}
        </div>
        {project.lastAccessed && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1.5 h-3.5 w-3.5" /> {/* Using Lucide Clock */}
            {t('accessed', 'Accessed')}: {format(parseISO(project.lastAccessed), 'MMM d, yyyy, p')}
          </div>
        )}
        <Badge variant={getStatusBadgeVariant(project.status)} className="capitalize text-xs">{t(project.status, project.status)}</Badge>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex w-full justify-between items-center">
          <Link href={`/project/${project.id}`} passHref legacyBehavior>
            <Button variant="default" size="sm" className="flex-1 sm:flex-none">
              <FolderArchive className="mr-2 h-4 w-4" />
              {t('openProject', 'Open Project')}
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => onEditProject(project)} title={t('editProjectTitle', 'Edit Project')}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">{t('editProjectTitle', 'Edit Project')}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
