
export interface Company {
  id: string;
  name: string;
}

export type ProjectStatus = 'done' | 'favorite' | 'recent' | 'new';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  companyId: string;
  lastAccessed?: string; 
  isFavorite?: boolean; 
  createdAt: string;
  description?: string; // Optional description
}

export interface Folder {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null;
  children?: Folder[]; 
}

export interface Asset {
  id: string;
  name: string;
  projectId: string;
  folderId: string | null; // null if asset is at project root
  photos: string[]; // URLs or paths to photos (Data URLs for localStorage)
  voiceDescription?: string; // New field for voice-captured description
  textDescription?: string; // New field for typed description
  createdAt: string;
  updatedAt?: string; // Optional: track updates
}

export const mockCompanies: Company[] = [
  { id: 'comp1', name: 'Innovatech Solutions' },
  { id: 'comp2', name: 'FutureBuild Corp' },
  { id: 'comp3', name: 'EcoConstruct Ltd.' },
];

export const mockProjects: Project[] = [
  { id: 'proj1', name: 'Downtown Office Complex', status: 'recent', companyId: 'comp1', lastAccessed: new Date(Date.now() - 86400000 * 1).toISOString(), createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), description: 'Renovation of a 10-story office building in the city center.' },
  { id: 'proj2', name: 'Riverside Mall Renovation', status: 'favorite', companyId: 'comp1', isFavorite: true, createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), description: 'Complete overhaul of the Riverside Mall, including new food court and cinema.' },
  { id: 'proj3', name: 'Highway 401 Expansion', status: 'done', companyId: 'comp2', createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), description: 'Expansion of a 20km stretch of Highway 401 to 6 lanes.' },
  { id: 'proj4', name: 'New Residential Tower "The Peak"', status: 'new', companyId: 'comp2', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), description: 'Construction of a new 40-floor luxury residential tower.' },
  { id: 'proj5', name: 'Tech Park Phase 2', status: 'recent', companyId: 'comp3', lastAccessed: new Date(Date.now() - 86400000 * 3).toISOString(), createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), description: 'Development of the second phase of the an existing technology park.' },
  { id: 'proj6', name: 'Skyline Bridge Maintenance', status: 'favorite', companyId: 'comp3', isFavorite: true, createdAt: new Date(Date.now() - 86400000 * 15).toISOString(), description: 'Scheduled maintenance and structural integrity checks for the Skyline Bridge.' },
];

export const mockFolders: Folder[] = [
  { id: 'folder1', name: 'Floor Plans', projectId: 'proj1', parentId: null },
  { id: 'folder2', name: 'Electrical Systems', projectId: 'proj1', parentId: 'folder1' },
  { id: 'folder3', name: 'Plumbing', projectId: 'proj1', parentId: 'folder1' },
  { id: 'folder4', name: 'Structural Reports', projectId: 'proj1', parentId: null },
  { id: 'folder5', name: 'Exterior Facade', projectId: 'proj2', parentId: null },
];

export const mockAssets: Asset[] = [
  { id: 'asset1', name: 'Main Entrance Door Frame', projectId: 'proj1', folderId: 'folder1', photos: ['https://placehold.co/600x400.png?ai_hint=door+frame'], textDescription: 'Damage noted on the main entrance door frame, lower right corner. Possible water ingress.', voiceDescription: 'Initial voice report confirms visual damage.', createdAt: new Date().toISOString() },
  { id: 'asset2', name: 'HVAC Unit #3 (Rooftop)', projectId: 'proj1', folderId: 'folder2', photos: ['https://placehold.co/600x400.png?ai_hint=hvac+unit', 'https://placehold.co/600x400.png?ai_hint=rooftop+view'], textDescription: 'Unit appears to be leaking coolant. Rust visible on the casing.', createdAt: new Date().toISOString() },
];
