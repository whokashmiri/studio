
"use client";
import type { Company, Project, Folder, Asset, ProjectStatus } from '@/data/mock-data';
import { mockCompanies, mockProjects, mockFolders, mockAssets } from '@/data/mock-data';

const COMPANIES_KEY = 'assetInspectorPro_companies';
const PROJECTS_KEY = 'assetInspectorPro_projects';
const FOLDERS_KEY = 'assetInspectorPro_folders';
const ASSETS_KEY = 'assetInspectorPro_assets';

// Helper to get an item from localStorage or initialize it
function getItem<T>(key: string, initialData: T[]): T[] {
  if (typeof window === 'undefined') {
    return initialData; // Return mock data during SSR or if window is not available
  }
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      return JSON.parse(item) as T[];
    } else {
      window.localStorage.setItem(key, JSON.stringify(initialData));
      return initialData;
    }
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    // Fallback to initialData and try to set it again in case of parse error on corrupted data
    try {
      window.localStorage.setItem(key, JSON.stringify(initialData));
    } catch (setError) {
      console.error(`Error setting localStorage key "${key}" after read error:`, setError);
    }
    return initialData;
  }
}

// Helper to set an item in localStorage
function setItem<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') {
    return; // Do nothing during SSR
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

// Companies
export function getCompanies(): Company[] {
  return getItem<Company>(COMPANIES_KEY, mockCompanies);
}
export function saveCompanies(companies: Company[]): void {
  setItem<Company>(COMPANIES_KEY, companies);
}

// Projects
export function getProjects(): Project[] {
  return getItem<Project>(PROJECTS_KEY, mockProjects);
}
export function saveProjects(projects: Project[]): void {
  setItem<Project>(PROJECTS_KEY, projects);
}

export function addProject(newProject: Project): void {
  const projects = getProjects();
  saveProjects([...projects, newProject]);
}

export function updateProject(updatedProject: Project): void {
  let projects = getProjects();
  const projectIndex = projects.findIndex(p => p.id === updatedProject.id);
  if (projectIndex !== -1) {
    projects[projectIndex] = updatedProject;
    saveProjects(projects);
  } else {
    console.warn(`Project with id ${updatedProject.id} not found for update, adding it instead.`);
    addProject(updatedProject);
  }
}


// Folders
export function getFolders(): Folder[] {
  return getItem<Folder>(FOLDERS_KEY, mockFolders);
}
export function saveFolders(folders: Folder[]): void {
  setItem<Folder>(FOLDERS_KEY, folders);
}
export function addFolder(newFolder: Folder): void {
  const folders = getFolders();
  saveFolders([...folders, newFolder]);
}

export function updateFolder(updatedFolder: Folder): void {
  let folders = getFolders();
  const folderIndex = folders.findIndex(f => f.id === updatedFolder.id);
  if (folderIndex !== -1) {
    folders[folderIndex] = updatedFolder;
    saveFolders(folders);
  } else {
    console.warn(`Folder with id ${updatedFolder.id} not found for update.`);
  }
}

export function deleteFolder(folderId: string): void { // Kept simple delete for now
  let folders = getFolders();
  const updatedFolders = folders.filter(f => f.id !== folderId);
  saveFolders(updatedFolders);
  // Note: This simple delete does not handle subfolders or assets within the folder.
  // deleteFolderCascade should be used for that.
}

export function deleteFolderCascade(folderId: string): void {
  let allFolders = getFolders();
  let allAssets = getAssets();
  
  const foldersToDeleteIds: string[] = [];
  const queue: string[] = [folderId];
  
  // Find all subfolders to delete
  while (queue.length > 0) {
    const currentFolderId = queue.shift()!;
    foldersToDeleteIds.push(currentFolderId);
    const children = allFolders.filter(f => f.parentId === currentFolderId);
    children.forEach(child => queue.push(child.id));
  }
  
  // Filter out deleted folders
  const updatedFolders = allFolders.filter(f => !foldersToDeleteIds.includes(f.id));
  saveFolders(updatedFolders);
  
  // Filter out assets within deleted folders
  const updatedAssets = allAssets.filter(a => a.folderId === null || !foldersToDeleteIds.includes(a.folderId));
  saveAssets(updatedAssets);
}


// Assets
export function getAssets(): Asset[] {
  return getItem<Asset>(ASSETS_KEY, mockAssets);
}
export function saveAssets(assets: Asset[]): void {
  setItem<Asset>(ASSETS_KEY, assets);
}
export function addAsset(newAsset: Asset): void {
  const assets = getAssets();
  saveAssets([...assets, newAsset]);
}

export function updateAsset(updatedAsset: Asset): void {
  let assets = getAssets();
  const assetIndex = assets.findIndex(a => a.id === updatedAsset.id);
  if (assetIndex !== -1) {
    assets[assetIndex] = updatedAsset;
    saveAssets(assets);
  } else {
    console.warn(`Asset with id ${updatedAsset.id} not found for update, adding it instead.`);
    addAsset(updatedAsset);
  }
}

export function deleteAsset(assetId: string): void {
  let assets = getAssets();
  const updatedAssets = assets.filter(a => a.id !== assetId);
  saveAssets(updatedAssets);
}
