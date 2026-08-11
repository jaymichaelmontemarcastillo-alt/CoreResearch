import {
  doc,
  getDoc,
  getDocs,
  setDoc,
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
    // Note: If orderBy('createdAt', 'asc') requires an index, we fetch and sort in memory for simplicity.
    const querySnap = await getDocs(q);
    const groups = querySnap.docs.map((docSnap) => docSnap.data() as ResearchGroup);
    
    // Sort by createdAt ascending to ensure Group 01, Group 02 order
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
  }
};

export default groupService;
