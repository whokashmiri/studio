
export interface Company {
  id: string;
  name: string;
}

export type ProjectStatus = 'done' | 'favorite' | 'recent' | 'new';

export interface Project {
  id:string;
  name: string;
  status: ProjectStatus;
  companyId: string;
  lastAccessed?: string; // Should be ISOString if from Firestore, or Firestore Timestamp
  isFavorite?: boolean;
  createdAt: string; // Should be ISOString if from Firestore, or Firestore Timestamp
  description?: string;
  assignedInspectorIds?: string[]; 
  assignedValuatorIds?: string[];   
  createdByUserId?: string; 
  createdByUserRole?: UserRole; 
}

export interface Folder {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
  // children?: Folder[]; // children are typically resolved via queries in Firestore, not stored directly
}

export interface Asset {
  id: string;
  name: string;
  projectId: string;
  folderId: string | null; // Can be null if asset is at project root
  photos: string[]; // Array of photo URLs or base64 strings
  voiceDescription?: string;
  textDescription?: string;
  createdAt: string; // Should be ISOString if from Firestore, or Firestore Timestamp
  updatedAt?: string; // Should be ISOString if from Firestore, or Firestore Timestamp
}

export type UserRole = 'Admin' | 'Inspector' | 'Valuation';

// This represents the user object stored in session/context after authentication
export interface AuthenticatedUser {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
  role: UserRole;
}

// This represents the user object as it might be stored in Firestore (potentially with a password hash)
// For this mock, we still include plaintext password if directly using this for new user creation
// In a real Firebase Auth scenario, Firebase handles password hashing.
export interface MockStoredUser extends AuthenticatedUser {
  password?: string; // INSECURE: For mock purposes only. Real apps use hashed passwords or Firebase Auth.
}

// Initial mock data - only used for seeding companies if Firestore is empty.
// Other data (projects, folders, assets, users) will be created via the app.
export const mockCompanies: Company[] = [
  { id: 'comp1', name: 'Innovatech Solutions' },
  { id: 'comp2', name: 'FutureBuild Corp' },
  { id: 'comp3', name: 'EcoConstruct Ltd.' },
];

// The following mock arrays are no longer used by the service to populate localStorage
// They serve as examples of data structure.
export const mockProjects: Project[] = []; // Start with empty, data comes from Firestore
export const mockFolders: Folder[] = [];   // Start with empty
export const mockAssets: Asset[] = [];     // Start with empty
