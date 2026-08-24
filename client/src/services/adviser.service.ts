import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { AdviserProfile, FacultyAssignment } from '../types/adviser.types';
import userService from './user.service';

const COLLECTION_NAME = 'advisers';

export const adviserService = {
  /**
   * Fetch all registered advisers from the users collection and optional adviser profile extensions.
   */
  async getAdvisers(): Promise<AdviserProfile[]> {
    const adviserUsers = await userService.getUsersByRole('adviser');
    return adviserUsers.map((u) => ({
      id: u.uid,
      userId: u.uid,
      fullName: u.fullName || `${u.first_name} ${u.last_name}`,
      email: u.email,
      department: u.department,
      maxCapacity: 5,
      activeGroupsCount: 0,
      isAvailable: true,
    }));
  },

  /**
   * Fetch an adviser's profile details.
   */
  async getAdviserById(id: string): Promise<AdviserProfile | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AdviserProfile;
    }

    const user = await userService.getUserById(id);
    if (!user || user.role !== 'adviser') return null;

    return {
      id: user.uid,
      userId: user.uid,
      fullName: user.fullName || `${user.first_name} ${user.last_name}`,
      email: user.email,
      department: user.department,
      maxCapacity: 5,
      activeGroupsCount: 0,
      isAvailable: true,
    };
  },

  /**
   * Assign an adviser to a research group.
   */
  async assignAdviserToGroup(assignment: FacultyAssignment): Promise<void> {
    const docRef = doc(collection(db, 'faculty_assignments'));
    await setDoc(docRef, assignment);
  },
};

export default adviserService;
