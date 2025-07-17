

import { 
  addFolder, 
  addAsset, 
  updateProject, 
  updateAsset, 
  updateFolder as updateFolderInDb,
  getAllAssetsForProject,
  getFolders as getFoldersFromFirestore
} from './firestore-service';
import type { Folder, Asset, ProjectStatus } from '@/data/mock-data';
import { v4 as uuidv4 } from 'uuid';
import Dexie, { type EntityTable } from 'dexie';

const OFFLINE_QUEUE_KEY = 'offlineQueue-v2'; // Version bump for new structure

// --- Dexie (IndexedDB) Setup ---
interface OfflineProjectData {
  id: string; // The original project ID
  downloadedAt: number;
}
interface OfflineFolder extends Folder { isCached: true; }
interface OfflineAsset extends Asset { isCached: true; }

const db = new Dexie('AssetInspectorDB-v2') as Dexie & {
  offlineProjects: EntityTable<OfflineProjectData, 'id'>;
  folders: EntityTable<OfflineFolder, 'id'>;
  assets: EntityTable<OfflineAsset, 'id'>;
};

db.version(2).stores({
  offlineProjects: '&id, downloadedAt',
  folders: '&id, projectId, parentId',
  assets: '&id, projectId, folderId, name_lowercase, serialNumber'
});

export type OfflineAction = 
  | { type: 'add-folder'; payload: Omit<Folder, 'id' | 'isOffline'>; localId: string; projectId: string }
  | { type: 'add-asset'; payload: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'isOffline' | 'isUploading'>; localId: string; projectId: string }
  | { type: 'update-asset'; payload: Partial<Asset>; assetId: string; projectId: string }
  | { type: 'update-folder'; payload: Partial<Folder>; folderId: string; projectId: string };

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  const queueJson = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return queueJson ? JSON.parse(queueJson) : [];
}

function saveOfflineQueue(queue: OfflineAction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function queueOfflineAction(
  type: 'add-folder' | 'add-asset' | 'update-asset' | 'update-folder', 
  payload: any, 
  projectId: string,
  itemId?: string
): { localId?: string, itemId?: string } {

  const queue = getOfflineQueue();
  
  const { isOffline, isUploading, ...restPayload } = payload;
  
  let action: OfflineAction;
  let returnVal: { localId?: string, itemId?: string } = {};

  if (type === 'add-folder' || type === 'add-asset') {
    const localId = uuidv4();
    action = { type, payload: restPayload, localId, projectId };
    returnVal.localId = localId;
  } else if ((type === 'update-asset' || type === 'update-folder') && itemId) {
    const key = type === 'update-asset' ? 'assetId' : 'folderId';
    action = { type, payload: restPayload, [key]: itemId, projectId } as OfflineAction;
    returnVal.itemId = itemId;
  } else {
    console.error("Invalid parameters for queueOfflineAction");
    return {};
  }
  
  queue.push(action);
  saveOfflineQueue(queue);

  updateProject(projectId, { status: 'recent' as ProjectStatus }).catch(e => console.error("Failed to update project status optimistically", e));

  return returnVal;
}

export async function syncOfflineActions(): Promise<{syncedCount: number, errorCount: number}> {
  let queue = getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, errorCount: 0 };
  }

  let syncedCount = 0;
  let errorCount = 0;
  
  const remainingActions: OfflineAction[] = [];

  for (const action of queue) {
    let success = false;
    try {
      switch(action.type) {
        case 'add-folder':
          success = !!(await addFolder(action.payload, action.localId));
          break;
        case 'add-asset':
          success = !!(await addAsset(action.payload, action.localId));
          break;
        case 'update-asset':
          success = await updateAsset(action.assetId, action.payload);
          break;
        case 'update-folder':
          success = await updateFolderInDb(action.folderId, action.payload);
          break;
      }
    } catch (error) {
      console.error(`Failed to sync action for localId ${'localId' in action ? action.localId : 'assetId' in action ? action.assetId : ''}:`, error);
    }
    
    if (success) {
      syncedCount++;
    } else {
      errorCount++;
      remainingActions.push(action);
    }
  }

  saveOfflineQueue(remainingActions);
  
  if(errorCount > 0){
    console.warn(`${errorCount} offline actions failed to sync and were re-queued.`);
  }

  return { syncedCount, errorCount };
}

// ---- New Functions for Offline Project Caching ----

/**
 * Checks if a project has been downloaded for offline use.
 * @param projectId The ID of the project to check.
 * @returns A boolean indicating if the project is available offline.
 */
export async function isProjectOffline(projectId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const project = await db.offlineProjects.get(projectId);
  return !!project;
}

/**
 * Downloads all data for a project (folders, assets) and saves it to IndexedDB.
 * @param projectId The ID of the project to download.
 */
export async function saveProjectForOffline(projectId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Fetch all data from Firestore
  const [folders, assets] = await Promise.all([
    getFoldersFromFirestore(projectId),
    getAllAssetsForProject(projectId, 'all') // Fetch all assets regardless of status
  ]);

  const foldersToCache: OfflineFolder[] = folders.map(f => ({ ...f, isCached: true }));
  const assetsToCache: OfflineAsset[] = assets.map(a => ({ ...a, isCached: true }));

  // 2. Clear old data for this project and save new data in a transaction
  await db.transaction('rw', db.offlineProjects, db.folders, db.assets, async () => {
    // Clear existing data for this project
    await db.folders.where({ projectId }).delete();
    await db.assets.where({ projectId }).delete();

    // Add new data
    await db.offlineProjects.put({ id: projectId, downloadedAt: Date.now() });
    await db.folders.bulkPut(foldersToCache);
    await db.assets.bulkPut(assetsToCache);
  });
}

/**
 * Gets all folders for a project from the local cache.
 * @param projectId The ID of the project.
 * @returns An array of Folder objects.
 */
export async function getFoldersFromCache(projectId: string): Promise<Folder[]> {
  if (typeof window === 'undefined') return [];
  return await db.folders.where({ projectId }).toArray();
}

/**
 * Gets all assets for a project from the local cache.
 * @param projectId The ID of the project.
 * @returns An array of Asset objects.
 */
export async function getAssetsFromCache(projectId: string): Promise<Asset[]> {
  if (typeof window === 'undefined') return [];
  return await db.assets.where({ projectId }).toArray();
}
