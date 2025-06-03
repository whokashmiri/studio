"use client";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderArchive, CalendarDays, Edit, Star } from 'lucide-react';
import type { Project } from '@/data/mock-data';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const formattedDate = project.createdAt ? format(parseISO(project.createdAt), 'MMM d, yyyy') : 'N/A';
  
  const getStatusBadgeVariant = (status: Project['status']) => {
    switch (status) {
      case 'done': return 'default'; // Using default as a subdued completed status
      case 'new': return 'secondary'; 
      case 'recent': return 'outline'; // using outline for a distinct look
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
        <CardDescription className="text-xs line-clamp-2 h-[2.5em]">{project.description || 'No description available.'}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <div className="flex items-center text-xs text-muted-foreground">
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
          Created: {formattedDate}
        </div>
        {project.lastAccessed && (
          <div className="flex items-center text-xs text-muted-foreground">
            <ClockSmall className="mr-1.5 h-3.5 w-3.5" />
            Accessed: {format(parseISO(project.lastAccessed), 'MMM d, yyyy, p')}
          </div>
        )}
        <Badge variant={getStatusBadgeVariant(project.status)} className="capitalize text-xs">{project.status}</Badge>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex w-full justify-between items-center">
          <Link href={`/project/${project.id}`} passHref legacyBehavior>
            <Button variant="default" size="sm" className="flex-1 sm:flex-none">
              <FolderArchive className="mr-2 h-4 w-4" />
              Open Project
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit Project</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// Small clock icon as lucide-react might not have a specific small version
const ClockSmall = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
