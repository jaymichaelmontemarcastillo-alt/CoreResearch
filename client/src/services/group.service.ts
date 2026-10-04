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
   * Enforces One Group Per Student rule and auto-associates academic details.
   */
  async createGroup(input: CreateResearchGroupInput): Promise<ResearchGroup> {
    // 0. Enforce maximum 3 members rule
    if (input.memberIds && input.memberIds.length > 3) {
      throw new Error('Group Limit Exceeded: A research group can have a maximum of 3 members.');
    }

    // 1. Enforce One Group Per Student rule for all initial members
    for (const memberId of input.memberIds) {
      const existing = await this.getGroupByStudentId(memberId);
      if (existing) {
        throw new Error('Already in a Group: You are already a member of a research group and cannot join another group.');
      }
    }

    // 2. Determine the next group number for this section if name not provided
    const existingGroups = await this.getGroupsBySection(input.sectionId);
    let name = input.name?.trim();
    if (!name) {
      const groupNumber = existingGroups.length + 1;
      const paddedNumber = groupNumber.toString().padStart(2, '0');
      name = `Group ${paddedNumber}`;
    }

    const groupRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    
    const d = new Date(now);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0 = Jan, 7 = Aug
    const academicYear = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    
    let semester = 'summer';
    if (month >= 7 && month <= 11) semester = '1st';
    else if (month >= 0 && month <= 4) semester = '2nd';

    const newGroup: ResearchGroup = {
      id: groupRef.id,
      name,
      ...input,
      academicYear,
      semester,
      status: input.memberIds.length >= 3 ? 'ready' : 'incomplete',
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(groupRef, newGroup);
    return newGroup;
  },

  /**
   * Add a student member to an existing group.
   * Validates:
   * 1. Group does not already have 3 members.
   * 2. Student does not already belong to any research group.
   * 3. Student is not already in this group.
   */
  async addMemberToGroup(
    groupId: string,
    newMember: { uid: string; fullName: string; email: string; studentNumber?: string }
  ): Promise<ResearchGroup> {
    const group = await this.getGroupById(groupId);
    if (!group) {
      throw new Error('Research group not found.');
    }

    // Validate maximum 3 members rule
    if ((group.members && group.members.length >= 3) || (group.memberIds && group.memberIds.length >= 3)) {
      throw new Error('Group is Full: A research group can have a maximum of 3 members.');
    }

    // Validate if student is already in this group
    if (group.memberIds.includes(newMember.uid)) {
      throw new Error('This student is already a member of this research group.');
    }

    // Validate if student is already in ANY other research group
    const existingGroup = await this.getGroupByStudentId(newMember.uid);
    if (existingGroup) {
      throw new Error('Already in a Group: This student is already a member of a research group and cannot join another group.');
    }

    const updatedMembers = [...group.members, newMember];
    const updatedMemberIds = [...group.memberIds, newMember.uid];
    const updatedStatus = updatedMemberIds.length >= 3 ? 'ready' : 'incomplete';

    const groupRef = doc(db, COLLECTION_NAME, groupId);
    const now = new Date().toISOString();

    await updateDoc(groupRef, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
      status: updatedStatus,
      updatedAt: now,
    });

    return {
      ...group,
      members: updatedMembers,
      memberIds: updatedMemberIds,
      status: updatedStatus,
      updatedAt: now,
    };
  },

  /**
   * Remove a student member from a research group.
   */
  async removeMemberFromGroup(groupId: string, memberUid: string): Promise<ResearchGroup> {
    const group = await this.getGroupById(groupId);
    if (!group) throw new Error('Research group not found.');

    const updatedMembers = group.members.filter(m => m.uid !== memberUid);
    const updatedMemberIds = group.memberIds.filter(id => id !== memberUid);
    const updatedStatus = updatedMemberIds.length >= 3 ? 'ready' : 'incomplete';
    const now = new Date().toISOString();

    const groupRef = doc(db, COLLECTION_NAME, groupId);
    await updateDoc(groupRef, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
      status: updatedStatus,
      updatedAt: now,
    });

    return {
      ...group,
      members: updatedMembers,
      memberIds: updatedMemberIds,
      status: updatedStatus,
      updatedAt: now,
    };
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
      adviserId?: string;
      panelists?: any[];
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
    
    if (data.adviserId !== undefined) {
      updateData.adviserId = data.adviserId;
    }

    if (data.panelists !== undefined) {
      updateData.panelists = data.panelists;
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