
export interface Company {
  id: string;
  name: string;
}

export type ProjectStatus = 'done' | 'recent' | 'new';

export interface Project {
  id:string;
  name: string;
  companyName: string; // Added to ensure it's available for offline projects
  status: ProjectStatus;
  companyId: string;
  lastAccessed?: number;
  isFavorite?: boolean;
  createdAt: number;
  description?: string;
  assignedInspectorIds?: string[];
  assignedValuatorIds?: string[];
  createdByUserId?: string;
  createdByUserRole?: UserRole;
}

export type ProjectWithAssetCount = Project & { assetCount: number };


export interface Folder {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
  isOffline?: boolean;
  isOfflineUpdate?: boolean;
}

export interface Asset {
  id: string;
  name: string;
  name_lowercase?: string;
  name_lowercase_with_status?: string;
  projectId: string;
  folderId: string | null;
  serialNumber?: number;
  photos: string[];
  videos?: string[];
  voiceDescription?: string;
  recordedAudioDataUrl?: string;
  textDescription?: string;
  miscellaneous?: Record<string, any>;
  createdAt: number;
  updatedAt?: number;
  userId?: string;
  isUploading?: boolean;
  isOffline?: boolean;
  isOfflineUpdate?: boolean;
  isDone?: boolean;
}

export type UserRole = 'Admin' | 'Inspector' | 'Valuation';

export interface AuthenticatedUser {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
  role: UserRole;
}

export interface MockStoredUser extends AuthenticatedUser {
  password?: string;
}

export const mockCompanies: Company[] = [
  { id: 'comp1', name: 'INNOVATECH SOLUTIONS' },
  { id: 'comp2', name: 'FUTUREBUILD CORP' },
  { id: 'comp3', name: 'ECOCONSTRUCT LTD.' },
];

export const mockProjects: Project[] = [];
export const mockFolders: Folder[] = [];
export const mockAssets: Asset[] = [];
