// src/services/group.service.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { ResearchGroup, CreateResearchGroupInput } from '../types/group.types';

const COLLECTION_NAME = 'research_groups';

export const groupService = {
  /**
   * Create a new research group.
   * Auto-generates the name based on the count of groups in that section.
   */
  async createGroup(input: CreateResearchGroupInput): Promise<ResearchGroup> {
    // Determine the next group number for this section
    const existingGroups = await this.getGroupsBySection(input.sectionId);
    const groupNumber = existingGroups.length + 1;
    const paddedNumber = groupNumber.toString().padStart(2, '0');
    const name = `Group ${paddedNumber}`;

    const groupRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    
    const newGroup: ResearchGroup = {
      id: groupRef.id,
      name,
      ...input,
      status: input.memberIds.length === 3 ? 'ready' : 'incomplete',
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(groupRef, newGroup);
    return newGroup;
  },

  /**
   * Fetch research groups for a specific section.
   */
  async getGroupsBySection(sectionId: string): Promise<ResearchGroup[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('sectionId', '==', sectionId)
    );
    const querySnap = await getDocs(q);
    const groups = querySnap.docs.map((docSnap) => docSnap.data() as ResearchGroup);
    
    return groups.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  /**
   * Fetch research group by student member ID.
   */
  async getGroupByStudentId(studentId: string): Promise<ResearchGroup | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('memberIds', 'array-contains', studentId)
    );
    const querySnap = await getDocs(q);
    if (querySnap.empty) return null;
    return querySnap.docs[0].data() as ResearchGroup;
  },

  /**
   * Fetch all groups assigned to a specific adviser.
   */
  async getGroupsByAdviserId(adviserId: string): Promise<ResearchGroup[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('adviserId', '==', adviserId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((d) => d.data() as ResearchGroup);
  },

  /**
   * Assign (or update) an adviser on a group.
   * Called by admin from the User Directory.
   */
  async updateGroupAdviser(
    groupId: string,
    adviserId: string,
    adviserName: string
  ): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, groupId);
    await updateDoc(ref, {
      adviserId,
      adviserName,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Update a research group with new data.
   * Used for editing group details like adviser, members, etc.
   */
  async updateGroup(
    groupId: string,
    data: {
      adviserName?: string;
      members?: Array<{ uid: string; fullName: string; email?: string }>;
      memberIds?: string[];
      status?: string;
      name?: string;
      courseId?: string;
      courseName?: string;
      sectionId?: string;
      sectionName?: string;
    }
  ): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, groupId);
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    
    if (data.adviserName !== undefined) {
      updateData.adviserName = data.adviserName;
    }
    
    if (data.members !== undefined) {
      updateData.members = data.members;
      // Also update memberIds array for querying
      updateData.memberIds = data.members.map(m => m.uid);
    }
    
    if (data.memberIds !== undefined) {
      updateData.memberIds = data.memberIds;
    }
    
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    
    if (data.courseId !== undefined) {
      updateData.courseId = data.courseId;
    }
    
    if (data.courseName !== undefined) {
      updateData.courseName = data.courseName;
    }
    
    if (data.sectionId !== undefined) {
      updateData.sectionId = data.sectionId;
    }
    
    if (data.sectionName !== undefined) {
      updateData.sectionName = data.sectionName;
    }
    
    await updateDoc(ref, updateData);
  },

  /**
   * Delete a research group by ID.
   */
  async deleteGroup(groupId: string): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, groupId);
    await deleteDoc(ref);
  },

  /**
   * Fetch a single research group by ID.
   */
  async getGroupById(groupId: string): Promise<ResearchGroup | null> {
    const ref = doc(db, COLLECTION_NAME, groupId);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) return null;
    return docSnap.data() as ResearchGroup;
  },

  /**
   * Fetch all research groups.
   */
  async getAllGroups(): Promise<ResearchGroup[]> {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as ResearchGroup);
  }
};

export default groupService;