
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
  or, 
  and, 
  documentId,
  orderBy,
  limit,
  startAfter,
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

export async function getCompaniesByIds(companyIds: string[]): Promise<Company[]> {
  if (companyIds.length === 0) {
    return [];
  }
  
  const allCompanies: Company[] = [];
  try {
    // Firestore 'in' query has a limit of 30 values per query. We need to batch.
    for (let i = 0; i < companyIds.length; i += 30) {
      const batchIds = companyIds.slice(i, i + 30);
      if (batchIds.length > 0) {
        const q = query(collection(getDb(), COMPANIES_COLLECTION), where(documentId(), "in", batchIds));
        const snapshot = await getDocs(q);
        allCompanies.push(...processSnapshot<Company>(snapshot));
      }
    }
    return allCompanies;
  } catch (error) {
    console.error("Error getting companies by IDs: ", error);
    return [];
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
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return false; // User not found
    }

    const currentUserData = userDoc.data();

    // If user already belongs to a company, do not change their affiliation or role.
    // This prevents "poaching" a user or changing their role unintentionally from another company's admin panel.
    if (currentUserData.companyId) {
      return true; // Indicate success, but no operation was performed.
    }

    // Only update if the user is unaffiliated.
    const updateData: Partial<MockStoredUser> = {
      role: newRole,
      companyId: companyId,
      companyName: companyName.toUpperCase(),
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

export async function addFolder(folderData: Omit<Folder, 'id'>, localId?: string): Promise<Folder | null> {
  try {
    const dataToSave = removeUndefinedProps(folderData);
    if (localId) {
      const docRef = doc(getDb(), FOLDERS_COLLECTION, localId);
      await setDoc(docRef, dataToSave);
      const newFolderDoc = await getDoc(docRef);
      if (newFolderDoc.exists()) {
          return processDoc<Folder>(newFolderDoc);
      }
    } else {
      const docRef = await addDoc(collection(getDb(), FOLDERS_COLLECTION), dataToSave);
      const newFolderDoc = await getDoc(docRef);
      if (newFolderDoc.exists()) {
          return processDoc<Folder>(newFolderDoc);
      }
    }
    return null;
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
export async function getAssets(projectId: string, folderId: string | null): Promise<Asset[]> {
    try {
      let q;
      if (folderId === null) {
          // If folderId is null, fetch assets at the root of the project
          q = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "==", projectId), where("folderId", "==", null), where("isDone", "==", false));
      } else {
          // If folderId is provided, fetch assets within that specific folder
          q = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "==", projectId), where("folderId", "==", folderId), where("isDone", "==", false));
      }
      const snapshot = await getDocs(q);
      return processSnapshot<Asset>(snapshot);
    } catch (error) {
      console.error("Error getting assets: ", error);
      return [];
    }
}

export async function getAssetsPaginated(
  projectId: string,
  folderId: string | null,
  pageSize: number,
  startAfterDoc?: DocumentData
): Promise<{ assets: Asset[]; lastDoc: DocumentData | null }> {
  try {
    const assetsCollectionRef = collection(getDb(), ASSETS_COLLECTION);
    
    // Base query constraints - orderBy('name') is removed to prevent the need for a composite index.
    const constraints: any[] = [
      where("projectId", "==", projectId),
      where("folderId", "==", folderId),
      where("isDone", "==", false),
      orderBy("name"),
      limit(pageSize)
    ];

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    
    const q = query(assetsCollectionRef, ...constraints);
    
    const snapshot = await getDocs(q);
    const assets = processSnapshot<Asset>(snapshot);
    const lastDoc = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { assets, lastDoc };
  } catch (error) {
    console.error("Error getting paginated assets: ", error);
    return { assets: [], lastDoc: null };
  }
}

export async function getAllAssetsForProject(projectId: string): Promise<Asset[]> {
  try {
    const q = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "==", projectId));
    const snapshot = await getDocs(q);
    return processSnapshot<Asset>(snapshot);
  } catch (error) {
    console.error("Error getting all assets for project: ", error);
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

export async function addAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'name_lowercase' | 'name_lowercase_with_status'>, localId?: string): Promise<Asset | null> {
  try {
    const dataWithNullForOptionalAudio = {
      ...assetData,
      recordedAudioDataUrl: assetData.recordedAudioDataUrl || null,
    };

    const dataToSave = removeUndefinedProps({
      ...dataWithNullForOptionalAudio,
      name_lowercase: assetData.name.toLowerCase(),
      isDone: false, // Explicitly set to false for new assets
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (localId) {
        const docRef = doc(getDb(), ASSETS_COLLECTION, localId);
        await setDoc(docRef, dataToSave);
        const newAssetDoc = await getDoc(docRef);
        if (newAssetDoc.exists()) {
            return processDoc<Asset>(newAssetDoc);
        }
    } else {
        const docRef = await addDoc(collection(getDb(), ASSETS_COLLECTION), dataToSave);
        const newAssetDoc = await getDoc(docRef);
        if (newAssetDoc.exists()) {
            return processDoc<Asset>(newAssetDoc);
        }
    }
    return null;
  } catch (error) {
    console.error("Error adding asset: ", error);
    return null;
  }
}

export async function updateAsset(assetId: string, assetData: Partial<Asset>): Promise<boolean> {
  try {
    const docRef = doc(getDb(), ASSETS_COLLECTION, assetId);

    const dataToUpdate: Record<string, any> = {
        ...assetData,
        updatedAt: serverTimestamp()
    };
    
    if (assetData.name) {
        dataToUpdate.name_lowercase = assetData.name.toLowerCase();
    }

    await updateDoc(docRef, removeUndefinedProps(dataToUpdate));
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

// Function to get all data accessible by a user
export async function getUserAccessibleData(userId: string, companyId: string): Promise<{ projects: Project[]; folders: Folder[]; assets: Asset[] }> {
  const result: { projects: Project[]; folders: Folder[]; assets: Asset[] } = {
    projects: [],
    folders: [],
    assets: [],
  };

  try {
    const projectsQuery = query(
      collection(getDb(), PROJECTS_COLLECTION),
      and( // Use and() to combine top-level filters
        where("companyId", "==", companyId),
        or(
          where("createdByUserId", "==", userId),
          where("assignedInspectorIds", "array-contains", userId),
          where("assignedValuatorIds", "array-contains", userId)
        )
      )
    );
    const projectsSnapshot = await getDocs(projectsQuery);
    result.projects = processSnapshot<Project>(projectsSnapshot);

    if (result.projects.length === 0) {
      return result; 
    }

    const projectIds = result.projects.map(p => p.id);

    if (projectIds.length > 0) {
      for (let i = 0; i < projectIds.length; i += 30) { // Firestore 'in' query limit is 30
        const batchProjectIds = projectIds.slice(i, i + 30);
        if (batchProjectIds.length > 0) {
          const foldersQuery = query(collection(getDb(), FOLDERS_COLLECTION), where("projectId", "in", batchProjectIds));
          const foldersSnapshot = await getDocs(foldersQuery);
          result.folders.push(...processSnapshot<Folder>(foldersSnapshot));
          
          const assetsQuery = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "in", batchProjectIds), where("isDone", "==", false));
          const assetsSnapshot = await getDocs(assetsQuery);
          result.assets.push(...processSnapshot<Asset>(assetsSnapshot));
        }
      }
    }

  } catch (error) {
    console.error("Error in getUserAccessibleData: ", error);
    return { projects: [], folders: [], assets: [] };
  }

  return result;
}

export async function getAssociatedCompanyIdsForUser(userId: string, primaryCompanyId?: string): Promise<string[]> {
    const companyIds = new Set<string>();

    if (primaryCompanyId) {
        companyIds.add(primaryCompanyId);
    }

    try {
        const inspectorProjectsQuery = query(collection(getDb(), PROJECTS_COLLECTION), where("assignedInspectorIds", "array-contains", userId));
        const valuatorProjectsQuery = query(collection(getDb(), PROJECTS_COLLECTION), where("assignedValuatorIds", "array-contains", userId));
        const creatorProjectsQuery = query(collection(getDb(), PROJECTS_COLLECTION), where("createdByUserId", "==", userId));

        const [inspectorSnapshot, valuatorSnapshot, creatorSnapshot] = await Promise.all([
            getDocs(inspectorProjectsQuery),
            getDocs(valuatorProjectsQuery),
            getDocs(creatorProjectsQuery)
        ]);

        const processAndAddIds = (snapshot: QuerySnapshot<DocumentData>) => {
            snapshot.forEach(doc => {
                const project = doc.data() as Project;
                if (project.companyId) {
                    companyIds.add(project.companyId);
                }
            });
        };

        processAndAddIds(inspectorSnapshot);
        processAndAddIds(valuatorSnapshot);
        processAndAddIds(creatorSnapshot);

        return Array.from(companyIds);
    } catch (error) {
        console.error("Error fetching associated projects for user:", error);
        // Return at least the primary company if it exists
        return primaryCompanyId ? [primaryCompanyId] : [];
    }
}

// Function to get all assets for a company, augmented with project and folder names
export type AssetWithContext = Asset & { projectName: string; folderName?: string };

export async function getAllAssetsForCompany(companyId: string): Promise<AssetWithContext[]> {
  const allAssetsProcessed: AssetWithContext[] = [];
  try {
    // 1. Fetch all projects for the company
    const projectsQuery = query(collection(getDb(), PROJECTS_COLLECTION), where("companyId", "==", companyId));
    const projectsSnapshot = await getDocs(projectsQuery);
    const companyProjects = processSnapshot<Project>(projectsSnapshot);

    if (companyProjects.length === 0) {
      return [];
    }
    const projectMap = new Map(companyProjects.map(p => [p.id, p.name]));
    const projectIds = companyProjects.map(p => p.id);

    // 2. Fetch all folders belonging to these projects (batching projectIds for 'in' query)
    const allFolders: Folder[] = [];
    for (let i = 0; i < projectIds.length; i += 30) { // Firestore 'in' query limit
      const batchProjectIds = projectIds.slice(i, i + 30);
      if (batchProjectIds.length > 0) {
        const foldersQuery = query(collection(getDb(), FOLDERS_COLLECTION), where("projectId", "in", batchProjectIds));
        const foldersSnapshot = await getDocs(foldersQuery);
        allFolders.push(...processSnapshot<Folder>(foldersSnapshot));
      }
    }
    const folderMap = new Map(allFolders.map(f => [f.id, f.name]));

    // 3. Fetch all assets belonging to these projects (batching projectIds for 'in' query)
    for (let i = 0; i < projectIds.length; i += 30) { // Firestore 'in' query limit
      const batchProjectIds = projectIds.slice(i, i + 30);
      if (batchProjectIds.length > 0) {
        const assetsQuery = query(collection(getDb(), ASSETS_COLLECTION), where("projectId", "in", batchProjectIds));
        const assetsSnapshot = await getDocs(assetsQuery);
        const assetsInBatch = processSnapshot<Asset>(assetsSnapshot);
        
        assetsInBatch.forEach(asset => {
          allAssetsProcessed.push({
            ...asset,
            projectName: projectMap.get(asset.projectId) || 'Unknown Project',
            folderName: asset.folderId ? folderMap.get(asset.folderId) : undefined,
          });
        });
      }
    }
    // Sort assets for consistent display, e.g., by project name, then asset name
    allAssetsProcessed.sort((a, b) => {
      const projectCompare = a.projectName.localeCompare(b.projectName);
      if (projectCompare !== 0) return projectCompare;
      if (a.folderName && b.folderName) { // Corrected: a.folderName instead of a.folderNamgete
        const folderCompare = a.folderName.localeCompare(b.folderName);
        if (folderCompare !== 0) return folderCompare;
      } else if (a.folderName) {
        return -1; // a has folder, b does not (root)
      } else if (b.folderName) {
        return 1; // b has folder, a does not (root)
      }
      return a.name.localeCompare(b.name);
    });

  } catch (error) {
    console.error("Error in getAllAssetsForCompany: ", error);
    return []; // Return empty on error
  }
  return allAssetsProcessed;
}

export async function searchAssets(
  projectId: string,
  searchTerm: string,
  pageSize: number,
  startAfterDoc?: DocumentData | null
): Promise<{ assets: Asset[]; lastDoc: DocumentData | null }> {
  try {
    const assetsCollectionRef = collection(getDb(), ASSETS_COLLECTION);
    const isSerialSearch = /^\d+(\.\d+)?$/.test(searchTerm.trim()) && searchTerm.trim().length > 0;

    const constraints: any[] = [where("projectId", "==", projectId)];

    if (isSerialSearch) {
      constraints.push(where("serialNumber", "==", Number(searchTerm.trim())));
       // To use startAfter with cursors, an orderBy is required. 
       // We'll order by serialNumber then name to be safe and have a consistent order.
      constraints.push(orderBy("serialNumber"));
      constraints.push(orderBy("name_lowercase"));
    } else { // Name search
      const lowerCaseTerm = searchTerm.toLowerCase();
      constraints.push(where("name_lowercase", ">=", lowerCaseTerm));
      constraints.push(where("name_lowercase", "<=", lowerCaseTerm + '\uf8ff'));
      constraints.push(orderBy("name_lowercase"));
    }

    constraints.push(limit(pageSize));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    
    const q = query(assetsCollectionRef, ...constraints);
    const snapshot = await getDocs(q);
    let assets = processSnapshot<Asset>(snapshot);
    
    // Client-side filtering for 'isDone' status to avoid complex index requirements
    assets = assets.filter(asset => asset.isDone !== true);

    const lastDoc = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { assets, lastDoc };

  } catch (error) {
    console.error(`Error searching assets by term "${searchTerm}": `, error);
    if (error instanceof Error && error.message.includes("query requires an index")) {
      console.error("Firestore composite index required. Please create the index suggested in the Firebase console error message.");
    }
    return { assets: [], lastDoc: null };
  }
}
