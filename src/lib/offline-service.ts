

import { 
  addFolder as addFolderToDb, 
  addAsset as addAssetToDb, 
  updateProject, 
  updateAsset as updateAssetInDb,
  updateFolder as updateFolderInDb,
  getProjectById,
  getAllAssetsForProject,
  getFolders as getFoldersFromFirestore
} from './firestore-service';
import type { Folder, Asset, Project, ProjectStatus } from '@/data/mock-data';
import { v4 as uuidv4 } from 'uuid';
import Dexie, { type EntityTable } from 'dexie';

const OFFLINE_QUEUE_KEY = 'offlineQueue-v2';

// --- Dexie (IndexedDB) Setup ---
interface OfflineProjectData extends Project {
  isCached: true;
  downloadedAt: number;
}
interface OfflineFolder extends Folder { isCached: true; }
interface OfflineAsset extends Asset { isCached: true; }

const db = new Dexie('AssetInspectorDB-v3') as Dexie & {
  projects: EntityTable<OfflineProjectData, 'id'>;
  folders: EntityTable<OfflineFolder, 'id'>;
  assets: EntityTable<OfflineAsset, 'id'>;
};

db.version(3).stores({
  projects: '&id, companyId, downloadedAt',
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
  
  const { isOffline, isUploading, isOfflineUpdate, ...restPayload } = payload;
  
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
          success = !!(await addFolderToDb(action.payload, action.localId));
          break;
        case 'add-asset':
          success = !!(await addAssetToDb(action.payload, action.localId));
          break;
        case 'update-asset':
          success = await updateAssetInDb(action.assetId, action.payload);
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

export async function isProjectOffline(projectId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const project = await db.projects.get(projectId);
  return !!project;
}

export async function saveProjectForOffline(projectId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const [project, folders, assets] = await Promise.all([
    getProjectById(projectId),
    getFoldersFromFirestore(projectId),
    getAllAssetsForProject(projectId, 'all')
  ]);

  if (!project) {
    throw new Error("Project not found to save for offline use.");
  }

  const projectToCache: OfflineProjectData = { ...project, isCached: true, downloadedAt: Date.now() };
  const foldersToCache: OfflineFolder[] = folders.map(f => ({ ...f, isCached: true }));
  const assetsToCache: OfflineAsset[] = assets.map(a => ({ ...a, isCached: true }));

  await db.transaction('rw', db.projects, db.folders, db.assets, async () => {
    await db.folders.where({ projectId }).delete();
    await db.assets.where({ projectId }).delete();

    await db.projects.put(projectToCache);
    if (foldersToCache.length > 0) await db.folders.bulkPut(foldersToCache);
    if (assetsToCache.length > 0) await db.assets.bulkPut(assetsToCache);
  });
}

export async function getProjectDataFromCache(projectId: string): Promise<{ project: Project | null; folders: Folder[]; assets: Asset[] }> {
  if (typeof window === 'undefined') return { project: null, folders: [], assets: [] };
  
  const [project, folders, assets] = await Promise.all([
    db.projects.get(projectId),
    db.folders.where({ projectId }).toArray(),
    db.assets.where({ projectId }).toArray()
  ]);

  return { project, folders, assets };
}

export async function getDownloadedProjectsFromCache(): Promise<Project[]> {
  if (typeof window === 'undefined') return [];
  return await db.projects.toArray();
}

export async function getAssetsFromCache(projectId: string): Promise<Asset[]> {
  if (typeof window === 'undefined') return [];
  return await db.assets.where({ projectId }).toArray();
}

export async function searchAssetsInCache(projectId: string, searchTerm: string): Promise<Asset[]> {
    if (typeof window === 'undefined' || !searchTerm.trim()) return [];

    const lowerCaseTerm = searchTerm.toLowerCase();
    const isSerialSearch = /^\d+(\.\d+)?$/.test(searchTerm.trim());

    try {
        let collection;
        if (isSerialSearch) {
            const serialNumber = Number(searchTerm.trim());
            collection = db.assets
                .where({ projectId: projectId, serialNumber: serialNumber });
        } else {
            collection = db.assets
                .where('name_lowercase')
                .startsWith(lowerCaseTerm)
                .and(asset => asset.projectId === projectId);
        }
        
        const results = await collection.toArray();
        return results;
    } catch (error) {
        console.error("Error searching assets in cache: ", error);
        return [];
    }
}
