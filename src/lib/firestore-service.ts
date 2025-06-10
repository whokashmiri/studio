
import { getDb } from './firebase/config'; // Changed import
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  serverTimestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import type { Project, Folder, Asset, Company, MockStoredUser, AuthenticatedUser, UserRole } from '@/data/mock-data';
import { mockCompanies as initialMockCompanies } from '@/data/mock-data';

const COMPANIES_COLLECTION = 'companies';
const PROJECTS_COLLECTION = 'projects';
const FOLDERS_COLLECTION = 'folders';
const ASSETS_COLLECTION = 'assets';
const USERS_COLLECTION = 'users';


// Helper to convert Firestore Timestamps to ISO strings
const convertTimestamps = (data: DocumentData): any => {
  const newData: any = { ...data };
  for (const key in newData) {
    if (newData[key] instanceof Timestamp) {
      newData[key] = newData[key].toDate().toISOString();
    } else if (typeof newData[key] === 'object' && newData[key] !== null && !Array.isArray(newData[key])) {
      newData[key] = convertTimestamps(newData[key]);
    } else if (Array.isArray(newData[key])) {
      newData[key] = newData[key].map(item => 
        typeof item === 'object' && item !== null && !(item instanceof Timestamp) ? convertTimestamps(item) : item
      );
    }
  }
  return newData;
};

const processDoc = <T>(docSnap: DocumentData): T => {
  const data = docSnap.data();
  return { id: docSnap.id, ...convertTimestamps(data) } as T;
};

const processSnapshot = <T>(snapshot: QuerySnapshot<DocumentData>): T[] => {
  return snapshot.docs.map(docSnap => processDoc<T>(docSnap));
};


// Companies
export async function getCompanies(): Promise<Company[]> {
  try {
    const snapshot = await getDocs(collection(getDb(), COMPANIES_COLLECTION));
    if (snapshot.empty) {
      const batch = writeBatch(getDb());
      initialMockCompanies.forEach(company => {
        const docRef = doc(collection(getDb(), COMPANIES_COLLECTION), company.id);
        batch.set(docRef, company);
      });
      await batch.commit();
      return initialMockCompanies;
    }
    return processSnapshot<Company>(snapshot);
  } catch (error) {
    console.error("Error getting companies: ", error);
    return [];
  }
}

export async function addCompany(companyData: Omit<Company, 'id'>): Promise<Company | null> {
  try {
    const docRef = await addDoc(collection(getDb(), COMPANIES_COLLECTION), companyData);
    return { id: docRef.id, ...companyData };
  } catch (error) {
    console.error("Error adding company: ", error);
    return null;
  }
}


// Users
export async function getUserById(userId: string): Promise<MockStoredUser | null> {
  try {
    const docRef = doc(getDb(), USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return processDoc<MockStoredUser>(docSnap);
    }
    return null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<MockStoredUser | null> {
  try {
    const q = query(collection(getDb(), USERS_COLLECTION), where("email", "==", email.toLowerCase()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return processDoc<MockStoredUser>(snapshot.docs[0]);
    }
    return null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

export async function addUser(userData: MockStoredUser): Promise<AuthenticatedUser | null> {
  const { password, ...userForDb } = userData; 
  
  try {
    const userDocRef = doc(getDb(), USERS_COLLECTION, userData.id); // Use provided ID
    await setDoc(userDocRef, {
      ...userForDb,
      email: userForDb.email.toLowerCase(),
      ...(password && { password }), // Store password if provided (for mock purposes)
    });
    
    // Return the AuthenticatedUser version (without password)
    const { password: _, ...authenticatedUser } = userData;
    return authenticatedUser;
  } catch (error) {
    console.error("Error adding user: ", error);
    return null;
  }
}


export async function getAllUsersByCompany(companyId: string): Promise<AuthenticatedUser[]> {
  try {
    const q = query(collection(getDb(), USERS_COLLECTION), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return processSnapshot<AuthenticatedUser>(snapshot);
  } catch (error) {
    console.error("Error getting users by company:", error);
    return [];
  }
}


// Projects
export async function getProjects(companyId?: string): Promise<Project[]> {
  try {
    let q;
    if (companyId) {
      q = query(collection(getDb(), PROJECTS_COLLECTION), where("companyId", "==", companyId));
    } else {
      q = query(collection(getDb(), PROJECTS_COLLECTION));
    }
    const snapshot = await getDocs(q);
    return processSnapshot<Project>(snapshot);
  } catch (error) {
    console.error("Error getting projects: ", error);
    return [];
  }
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const docRef = doc(getDb(), PROJECTS_COLLECTION, projectId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return processDoc<Project>(docSnap);
    }
    return null;
  } catch (error) {
    console.error("Error getting project by ID:", error);
    return null;
  }
}

export async function addProject(projectData: Omit<Project, 'id' | 'createdAt' | 'lastAccessed'> & { createdAt?: string, lastAccessed?: string }): Promise<Project | null> {
  try {
    const docRef = await addDoc(collection(getDb(), PROJECTS_COLLECTION), {
      ...projectData,
      createdAt: serverTimestamp(),
      lastAccessed: serverTimestamp(),
    });
    const newProject = await getProjectById(docRef.id);
    return newProject;
  } catch (error) {
    console.error("Error adding project: ", error);
    return null;
  }
}

export async function updateProject(projectId: string, projectData: Partial<Project>): Promise<boolean> {
  try {
    const docRef = doc(getDb(), PROJECTS_COLLECTION, projectId);
    await updateDoc(docRef, {
        ...projectData,
        lastAccessed: serverTimestamp() 
    });
    return true;
  } catch (error) {
    console.error("Error updating project: ", error);
    return false;
  }
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const batch = writeBatch(getDb());
  try {
    // Delete folders associated with the project
    const foldersToDeleteQuery = query(collection(getDb(), FOLDERS_COLLECTION), where("projectId", "==", projectId));
    const foldersSnapshot = await getDocs(foldersToDeleteQuery);
    const folderIdsToDelete: string[] = foldersSnapshot.docs.map(d => d.id);

    // Delete assets associated with the project (can be in root or in folders)
    const assetsInProjectQuery = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "==", projectId));
    const assetsSnapshot = await getDocs(assetsInProjectQuery);
    assetsSnapshot.forEach(assetDoc => {
      batch.delete(doc(getDb(), ASSETS_COLLECTION, assetDoc.id));
    });
    
    // Add folder deletions to batch
    folderIdsToDelete.forEach(folderId => {
      batch.delete(doc(getDb(), FOLDERS_COLLECTION, folderId));
    });

    // Delete the project itself
    batch.delete(doc(getDb(), PROJECTS_COLLECTION, projectId));

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting project and its contents: ", error);
    return false;
  }
}


// Folders
export async function getFolders(projectId: string): Promise<Folder[]> {
  try {
    const q = query(collection(getDb(), FOLDERS_COLLECTION), where("projectId", "==", projectId));
    const snapshot = await getDocs(q);
    return processSnapshot<Folder>(snapshot);
  } catch (error) {
    console.error("Error getting folders: ", error);
    return [];
  }
}

export async function addFolder(folderData: Omit<Folder, 'id'>): Promise<Folder | null> {
  try {
    const docRef = await addDoc(collection(getDb(), FOLDERS_COLLECTION), folderData);
    return { id: docRef.id, ...folderData };
  } catch (error) {
    console.error("Error adding folder: ", error);
    return null;
  }
}

export async function updateFolder(folderId: string, folderData: Partial<Folder>): Promise<boolean> {
  try {
    const docRef = doc(getDb(), FOLDERS_COLLECTION, folderId);
    await updateDoc(docRef, folderData);
    return true;
  } catch (error) {
    console.error("Error updating folder: ", error);
    return false;
  }
}

export async function deleteFolderCascade(folderId: string): Promise<boolean> {
  const batch = writeBatch(getDb());
  const foldersProcessed = new Set<string>(); 
  
  async function findAndDeleteRecursive(currentFolderId: string) {
    if (foldersProcessed.has(currentFolderId)) return;
    foldersProcessed.add(currentFolderId);

    // Find and delete assets in the current folder
    const assetsQuery = query(collection(getDb(), ASSETS_COLLECTION), where("folderId", "==", currentFolderId));
    const assetsSnapshot = await getDocs(assetsQuery);
    assetsSnapshot.forEach(assetDoc => {
      batch.delete(doc(getDb(), ASSETS_COLLECTION, assetDoc.id));
    });

    // Find and recursively delete subfolders
    const subfoldersQuery = query(collection(getDb(), FOLDERS_COLLECTION), where("parentId", "==", currentFolderId));
    const subfoldersSnapshot = await getDocs(subfoldersQuery);
    for (const subfolderDoc of subfoldersSnapshot.docs) {
      await findAndDeleteRecursive(subfolderDoc.id); // Recursively call for subfolders
    }
    
    // Delete the current folder itself
    batch.delete(doc(getDb(), FOLDERS_COLLECTION, currentFolderId));
  }

  try {
    await findAndDeleteRecursive(folderId);
    await batch.commit();
    return true;
  } catch (error)
{
    console.error("Error deleting folder cascade: ", error);
    return false;
  }
}


// Assets
export async function getAssets(projectId: string, folderId?: string | null): Promise<Asset[]> {
  try {
    let q;
    if (folderId === undefined) { // Query for assets at project root (folderId is null)
        q = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "==", projectId), where("folderId", "==", null));
    } else { // Query for assets in a specific folder (folderId is a string or explicitly null)
        q = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "==", projectId), where("folderId", "==", folderId));
    }
    const snapshot = await getDocs(q);
    return processSnapshot<Asset>(snapshot);
  } catch (error) {
    console.error("Error getting assets: ", error);
    return [];
  }
}

export async function getAssetById(assetId: string): Promise<Asset | null> {
    try {
        const docRef = doc(getDb(), ASSETS_COLLECTION, assetId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return processDoc<Asset>(docSnap);
        }
        return null;
    } catch (error) {
        console.error("Error getting asset by ID: ", error);
        return null;
    }
}


export async function addAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string, updatedAt?: string }): Promise<Asset | null> {
  try {
    const docRef = await addDoc(collection(getDb(), ASSETS_COLLECTION), {
      ...assetData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const newAsset = await getAssetById(docRef.id); // Fetch the newly created asset to get server-generated timestamps
    return newAsset;
  } catch (error) {
    console.error("Error adding asset: ", error);
    return null;
  }
}

export async function updateAsset(assetId: string, assetData: Partial<Asset>): Promise<boolean> {
  try {
    const docRef = doc(getDb(), ASSETS_COLLECTION, assetId);
    await updateDoc(docRef, {
        ...assetData,
        updatedAt: serverTimestamp() // Update the 'updatedAt' timestamp
    });
    return true;
  } catch (error) {
    console.error("Error updating asset: ", error);
    return false;
  }
}

export async function deleteAsset(assetId: string): Promise<boolean> {
  try {
    const docRef = doc(getDb(), ASSETS_COLLECTION, assetId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting asset: ", error);
    return false;
  }
}

