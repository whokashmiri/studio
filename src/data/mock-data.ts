
export interface Company {
  id: string;
  name: string;
}

export type ProjectStatus = 'done' | 'recent' | 'new';

export interface Project {
  id:string;
  name: string;
  status: ProjectStatus;
  companyId: string;
  lastAccessed?: number; // Changed from string to number
  isFavorite?: boolean;
  createdAt: number; // Changed from string to number
  description?: string;
  assignedInspectorIds?: string[];
  assignedValuatorIds?: string[];
  createdByUserId?: string;
  createdByUserRole?: UserRole;
}

// Added for explicit typing where asset count is included
export type ProjectWithAssetCount = Project & { assetCount: number };


export interface Folder {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
  isOffline?: boolean;
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
  voiceDescription?: string; // Text transcript
  recordedAudioDataUrl?: string; // Data URI of the actual recorded audio
  textDescription?: string;
  miscellaneous?: Record<string, any>;
  createdAt: number; // Changed from string to number
  updatedAt?: number; // Changed from string to number
  userId?: string;
  isUploading?: boolean;
  isOffline?: boolean;
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
  { id: 'comp1', name: 'Innovatech Solutions' },
  { id: 'comp2', name: 'FutureBuild Corp' },
  { id: 'comp3', name: 'EcoConstruct Ltd.' },
];

export const mockProjects: Project[] = [];
export const mockFolders: Folder[] = [];
export const mockAssets: Asset[] = [];
