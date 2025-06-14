
import { getDb } from './firebase/config';
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
  getCountFromServer,
} from 'firebase/firestore';
import type { Project, Folder, Asset, Company, MockStoredUser, AuthenticatedUser, UserRole } from '@/data/mock-data';
import { mockCompanies as initialMockCompanies } from '@/data/mock-data';

const COMPANIES_COLLECTION = 'companies';
const PROJECTS_COLLECTION = 'projects';
const FOLDERS_COLLECTION = 'folders';
const ASSETS_COLLECTION = 'assets';
const USERS_COLLECTION = 'users';


const convertTimestamps = (data: DocumentData): any => {
  const newData: any = { ...data };
  for (const key in newData) {
    if (newData[key] instanceof Timestamp) {
      newData[key] = newData[key].toDate().getTime(); // Changed to getTime()
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

const removeUndefinedProps = (obj: Record<string, any>): Record<string, any> => {
  const newObj = { ...obj };
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
    if (newObj[key] === null) { // Also remove nulls if not explicitly desired for Firestore 'delete field'
      delete newObj[key];
    }
  });
  return newObj;
};


// Companies
export async function getCompanies(): Promise<Company[]> {
  try {
    const snapshot = await getDocs(collection(getDb(), COMPANIES_COLLECTION));
    if (snapshot.empty && initialMockCompanies.length > 0) {
      const batch = writeBatch(getDb());
      const seededCompanies: Company[] = [];
      initialMockCompanies.forEach(company => {
        const docRef = doc(collection(getDb(), COMPANIES_COLLECTION), company.id);
        const companyToSeed = { ...company, name: company.name.toUpperCase() };
        batch.set(docRef, companyToSeed);
        seededCompanies.push(companyToSeed);
      });
      await batch.commit();
      return seededCompanies;
    }
    return processSnapshot<Company>(snapshot);
  } catch (error) {
    console.error("Error getting companies: ", error);
    return [];
  }
}

export async function addCompany(companyData: Omit<Company, 'id'>): Promise<Company | null> {
  try {
    const dataToSave = {
      ...companyData,
      name: companyData.name.toUpperCase()
    };
    const docRef = await addDoc(collection(getDb(), COMPANIES_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave };
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

export async function getAllUsers(): Promise<AuthenticatedUser[]> {
  try {
    const snapshot = await getDocs(collection(getDb(), USERS_COLLECTION));
    return processSnapshot<AuthenticatedUser>(snapshot);
  } catch (error) {
    console.error("Error getting all users:", error);
    return [];
  }
}

export async function addUser(userData: MockStoredUser): Promise<AuthenticatedUser | null> {
  const { password, ...userForDb } = userData;

  try {
    const userDocRef = doc(getDb(), USERS_COLLECTION, userData.id);
    const dataToSave = {
      ...userForDb,
      email: userForDb.email.toLowerCase(),
      companyName: userForDb.companyName.toUpperCase(),
      ...(password && { password }), // Include password only if provided
    };
    await setDoc(userDocRef, removeUndefinedProps(dataToSave));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...authenticatedUser } = userData;
    return { ...authenticatedUser, companyName: dataToSave.companyName };
  } catch (error) {
    console.error("Error adding user: ", error);
    return null;
  }
}

export async function updateUserRoleAndCompany(
  userId: string,
  newRole: UserRole,
  companyId: string,
  companyName: string
): Promise<boolean> {
  try {
    const userRef = doc(getDb(), USERS_COLLECTION, userId);
    const updateData: Partial<AuthenticatedUser> = {
      role: newRole,
      companyId: companyId,
      companyName: companyName.toUpperCase(), // Ensure company name is stored in uppercase
    };
    await updateDoc(userRef, removeUndefinedProps(updateData));
    return true;
  } catch (error) {
    console.error("Error updating user role and company: ", error);
    return false;
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
export async function getProjects(companyId?: string): Promise<Array<Project & { assetCount: number }>> {
  try {
    let q;
    if (companyId) {
      q = query(collection(getDb(), PROJECTS_COLLECTION), where("companyId", "==", companyId));
    } else {
      q = query(collection(getDb(), PROJECTS_COLLECTION));
    }
    const snapshot = await getDocs(q);
    const projectsData = processSnapshot<Project>(snapshot);

    const projectsWithCounts = await Promise.all(
      projectsData.map(async (project) => {
        const assetsCollectionRef = collection(getDb(), ASSETS_COLLECTION);
        const assetsQuery = query(assetsCollectionRef, where("projectId", "==", project.id));
        const countSnapshot = await getCountFromServer(assetsQuery);
        return {
          ...project,
          assetCount: countSnapshot.data().count,
        };
      })
    );
    return projectsWithCounts;
  } catch (error) {
    console.error("Error getting projects with asset counts: ", error);
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

export async function addProject(projectData: Omit<Project, 'id' | 'createdAt' | 'lastAccessed'>): Promise<Project | null> {
  try {
    const dataToSave = removeUndefinedProps({
      ...projectData,
      createdAt: serverTimestamp(),
      lastAccessed: serverTimestamp(),
    });
    const docRef = await addDoc(collection(getDb(), PROJECTS_COLLECTION), dataToSave);
    const newProjectDoc = await getDoc(docRef);
     if (newProjectDoc.exists()) {
      return processDoc<Project>(newProjectDoc);
    }
    return null;
  } catch (error) {
    console.error("Error adding project: ", error);
    return null;
  }
}

export async function updateProject(projectId: string, projectData: Partial<Omit<Project, 'createdAt' | 'lastAccessed'>>): Promise<boolean> {
  try {
    const docRef = doc(getDb(), PROJECTS_COLLECTION, projectId);
    const dataToUpdate = removeUndefinedProps({
        ...projectData,
        lastAccessed: serverTimestamp()
    });
    await updateDoc(docRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error("Error updating project: ", error);
    return false;
  }
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const batch = writeBatch(getDb());
  try {
    const foldersToDeleteQuery = query(collection(getDb(), FOLDERS_COLLECTION), where("projectId", "==", projectId));
    const foldersSnapshot = await getDocs(foldersToDeleteQuery);
    foldersSnapshot.forEach(folderDoc => {
      batch.delete(doc(getDb(), FOLDERS_COLLECTION, folderDoc.id));
    });

    const assetsInProjectQuery = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "==", projectId));
    const assetsSnapshot = await getDocs(assetsInProjectQuery);
    assetsSnapshot.forEach(assetDoc => {
      batch.delete(doc(getDb(), ASSETS_COLLECTION, assetDoc.id));
    });

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

export async function getFolderById(folderId: string): Promise<Folder | null> {
  try {
    const docRef = doc(getDb(), FOLDERS_COLLECTION, folderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return processDoc<Folder>(docSnap);
    }
    return null;
  } catch (error) {
    console.error("Error getting folder by ID:", error);
    return null;
  }
}

export async function addFolder(folderData: Omit<Folder, 'id'>): Promise<Folder | null> {
  try {
    const dataToSave = removeUndefinedProps(folderData);
    const docRef = await addDoc(collection(getDb(), FOLDERS_COLLECTION), dataToSave);
    return { id: docRef.id, ...folderData };
  } catch (error) {
    console.error("Error adding folder: ", error);
    return null;
  }
}

export async function updateFolder(folderId: string, folderData: Partial<Folder>): Promise<boolean> {
  try {
    const docRef = doc(getDb(), FOLDERS_COLLECTION, folderId);
    const dataToUpdate = removeUndefinedProps(folderData);
    await updateDoc(docRef, dataToUpdate);
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

    const assetsQuery = query(collection(getDb(), ASSETS_COLLECTION), where("folderId", "==", currentFolderId));
    const assetsSnapshot = await getDocs(assetsQuery);
    assetsSnapshot.forEach(assetDoc => {
      batch.delete(doc(getDb(), ASSETS_COLLECTION, assetDoc.id));
    });

    const subfoldersQuery = query(collection(getDb(), FOLDERS_COLLECTION), where("parentId", "==", currentFolderId));
    const subfoldersSnapshot = await getDocs(subfoldersQuery);
    for (const subfolderDoc of subfoldersSnapshot.docs) {
      await findAndDeleteRecursive(subfolderDoc.id);
    }

    batch.delete(doc(getDb(), FOLDERS_COLLECTION, currentFolderId));
  }

  try {
    await findAndDeleteRecursive(folderId);
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting folder cascade: ", error);
    return false;
  }
}


// Assets
export async function getAssets(projectId: string, folderId?: string | null): Promise<Asset[]> {
  try {
    let q;
    if (folderId === undefined) { // Query for assets directly under project (folderId is null)
        q = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "==", projectId), where("folderId", "==", null));
    } else if (folderId === null) { // Explicitly querying for assets with folderId: null
        q = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "==", projectId), where("folderId", "==", null));
    }
     else { // Query for assets within a specific folder
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


export async function addAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset | null> {
  try {
    // Ensure recordedAudioDataUrl is explicitly set to null if not provided, to avoid Firestore treating undefined as "no change"
    const dataWithNullForOptionalAudio = {
      ...assetData,
      recordedAudioDataUrl: assetData.recordedAudioDataUrl || null,
    };

    const dataToSave = removeUndefinedProps({
      ...dataWithNullForOptionalAudio,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(getDb(), ASSETS_COLLECTION), dataToSave);
    const newAssetDoc = await getDoc(docRef);
    if (newAssetDoc.exists()) {
        return processDoc<Asset>(newAssetDoc);
    }
    return null;
  } catch (error) {
    console.error("Error adding asset: ", error);
    return null;
  }
}

export async function updateAsset(assetId: string, assetData: Partial<Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
  try {
    const docRef = doc(getDb(), ASSETS_COLLECTION, assetId);
    
    const dataWithNullForOptionalAudio = {
      ...assetData,
      // If recordedAudioDataUrl is part of assetData and is explicitly undefined, it will be removed by removeUndefinedProps.
      // If it's meant to be cleared, it should be passed as null.
      recordedAudioDataUrl: assetData.recordedAudioDataUrl === undefined ? undefined : (assetData.recordedAudioDataUrl || null),
    };

    const dataToUpdate = removeUndefinedProps({
        ...dataWithNullForOptionalAudio,
        updatedAt: serverTimestamp()
    });

    await updateDoc(docRef, dataToUpdate);
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
