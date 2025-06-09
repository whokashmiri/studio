
"use client";
import type { Project, Folder, Asset, Company } from '@/data/mock-data';
import { mockProjects, mockFolders, mockAssets, mockCompanies } from '@/data/mock-data';

const PROJECTS_KEY = 'assetInspectorProjects';
const FOLDERS_KEY = 'assetInspectorFolders';
const ASSETS_KEY = 'assetInspectorAssets';
const COMPANIES_KEY = 'assetInspectorCompanies'; // Though companies are mostly static in this mock setup

// Companies
export function getCompanies(): Company[] {
  if (typeof window !== 'undefined') {
    const storedCompanies = localStorage.getItem(COMPANIES_KEY);
    if (storedCompanies) {
      return JSON.parse(storedCompanies);
    } else {
      localStorage.setItem(COMPANIES_KEY, JSON.stringify(mockCompanies));
      return mockCompanies;
    }
  }
  return [...mockCompanies]; // Return a copy for server-side or if window is undefined
}

export function saveCompanies(companies: Company[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
  }
}

// Projects
export function getProjects(): Project[] {
  if (typeof window !== 'undefined') {
    const storedProjects = localStorage.getItem(PROJECTS_KEY);
    if (storedProjects) {
      return JSON.parse(storedProjects);
    } else {
      // Initialize with mock data if no projects are in localStorage
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(mockProjects));
      return mockProjects;
    }
  }
  return [...mockProjects]; // Return a copy for server-side or if window is undefined
}

export function saveProjects(projects: Project[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }
}

export function addProject(newProject: Project): void {
  if (typeof window !== 'undefined') {
    const projects = getProjects();
    projects.push(newProject);
    saveProjects(projects);
  }
}

export function updateProject(updatedProject: Project): void {
  if (typeof window !== 'undefined') {
    let projects = getProjects();
    projects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    saveProjects(projects);
  }
}

// Folders
export function getFolders(): Folder[] {
  if (typeof window !== 'undefined') {
    const storedFolders = localStorage.getItem(FOLDERS_KEY);
    if (storedFolders) {
      return JSON.parse(storedFolders);
    } else {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(mockFolders));
      return mockFolders;
    }
  }
  return [...mockFolders];
}

export function saveFolders(folders: Folder[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  }
}

export function addFolder(newFolder: Folder): void {
  if (typeof window !== 'undefined') {
    const folders = getFolders();
    folders.push(newFolder);
    saveFolders(folders);
  }
}

export function updateFolder(updatedFolder: Folder): void {
  if (typeof window !== 'undefined') {
    let folders = getFolders();
    folders = folders.map(f => f.id === updatedFolder.id ? updatedFolder : f);
    saveFolders(folders);
  }
}

export function deleteFolder(folderId: string): void {
  if (typeof window !== 'undefined') {
    let folders = getFolders();
    folders = folders.filter(f => f.id !== folderId);
    saveFolders(folders);
  }
}

export function deleteFolderCascade(folderId: string): void {
  if (typeof window !== 'undefined') {
    let allFolders = getFolders();
    let allAssets = getAssets();
    
    const folderIdsToDelete: string[] = [folderId];
    let currentLength = 0;
    // Find all descendant folder IDs
    while (currentLength < folderIdsToDelete.length) {
      currentLength = folderIdsToDelete.length;
      allFolders.forEach(folder => {
        if (folder.parentId && folderIdsToDelete.includes(folder.parentId) && !folderIdsToDelete.includes(folder.id)) {
          folderIdsToDelete.push(folder.id);
        }
      });
    }
    
    // Filter out folders to delete
    const updatedFolders = allFolders.filter(f => !folderIdsToDelete.includes(f.id));
    // Filter out assets belonging to deleted folders
    const updatedAssets = allAssets.filter(a => !a.folderId || !folderIdsToDelete.includes(a.folderId));
    
    saveFolders(updatedFolders);
    saveAssets(updatedAssets);
  }
}

// Assets
export function getAssets(): Asset[] {
  if (typeof window !== 'undefined') {
    const storedAssets = localStorage.getItem(ASSETS_KEY);
    if (storedAssets) {
      return JSON.parse(storedAssets);
    } else {
      localStorage.setItem(ASSETS_KEY, JSON.stringify(mockAssets));
      return mockAssets;
    }
  }
  return [...mockAssets];
}

export function saveAssets(assets: Asset[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
  }
}

export function addAsset(newAsset: Asset): void {
  if (typeof window !== 'undefined') {
    const assets = getAssets();
    assets.push(newAsset);
    saveAssets(assets);
  }
}

export function updateAsset(updatedAsset: Asset): void {
  if (typeof window !== 'undefined') {
    let assets = getAssets();
    assets = assets.map(a => a.id === updatedAsset.id ? updatedAsset : a);
    saveAssets(assets);
  }
}

export function deleteAsset(assetId: string): void {
  if (typeof window !== 'undefined') {
    let assets = getAssets();
    assets = assets.filter(a => a.id !== assetId);
    saveAssets(assets);
  }
}
