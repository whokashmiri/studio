
import { addFolder, addAsset, updateProject } from './firestore-service';
import type { Folder, Asset, ProjectStatus } from '@/data/mock-data';
import { v4 as uuidv4 } from 'uuid';

const OFFLINE_QUEUE_KEY = 'offlineQueue-v1';

type OfflineAction = 
  | { type: 'add-folder'; payload: Omit<Folder, 'id' | 'isOffline'>; localId: string; projectId: string }
  | { type: 'add-asset'; payload: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'isOffline' | 'isUploading'>; localId: string; projectId: string };

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  const queueJson = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return queueJson ? JSON.parse(queueJson) : [];
}

function saveOfflineQueue(queue: OfflineAction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function queueOfflineAction(type: 'add-folder' | 'add-asset', payload: any, projectId: string): { localId: string } {
  const queue = getOfflineQueue();
  const localId = uuidv4();
  
  // Ensure we don't save UI-only flags to the queue payload
  const { isOffline, isUploading, ...restPayload } = payload;
  
  const action: OfflineAction = { type, payload: restPayload, localId, projectId };
  
  queue.push(action);
  saveOfflineQueue(queue);

  // Also queue a project status update to 'recent' if not already there
  updateProject(projectId, { status: 'recent' as ProjectStatus }).catch(e => console.error("Failed to update project status optimistically", e));

  return { localId };
}

export async function syncOfflineActions(): Promise<{syncedCount: number, errorCount: number}> {
  let queue = getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, errorCount: 0 };
  }

  let syncedCount = 0;
  let errorCount = 0;
  
  const originalQueueLength = queue.length;

  while(queue.length > 0) {
    const action = queue.shift(); // Process one by one from the start
    if (!action) continue;

    let success = false;
    try {
      if (action.type === 'add-folder') {
        const newFolder = await addFolder(action.payload, action.localId);
        if (newFolder) success = true;
      } else if (action.type === 'add-asset') {
        const newAsset = await addAsset(action.payload, action.localId);
        if (newAsset) success = true;
      }
    } catch (error) {
      console.error(`Failed to sync action for localId ${action.localId}:`, error);
    }
    
    if (success) {
      syncedCount++;
    } else {
      errorCount++;
      queue.push(action); // Add failed action to the end to retry later
    }

    // If we've looped through the whole initial queue and still have errors, break to avoid infinite loop
    if (queue.length === originalQueueLength - syncedCount) {
        console.warn("Sync failed for some items, they will be retried on next connection.", queue);
        break;
    }
  }

  saveOfflineQueue(queue); // Save the remaining (failed) actions
  return { syncedCount, errorCount };
}
