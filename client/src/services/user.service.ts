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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { UserProfile, CreateUserInput, UpdateUserInput, UserRole } from '../types/user.types';

const COLLECTION_NAME = 'users';

export const userService = {
  /**
   * Create or initialize a new user profile document in Firestore.
   */
  async createUser(input: CreateUserInput): Promise<UserProfile> {
    const userRef = doc(db, COLLECTION_NAME, input.uid);
    const now = new Date().toISOString();
    const newUser: UserProfile = {
      ...input,
      created_at: input.created_at || now,
      updated_at: input.updated_at || now,
    };
    await setDoc(userRef, newUser, { merge: true });
    return newUser;
  },

  /**
   * Fetch a single user profile document by UID.
   */
  async getUserById(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, COLLECTION_NAME, uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as UserProfile;
  },

  /**
   * Fetch all users.
   */
  async getAllUsers(): Promise<UserProfile[]> {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnap = await getDocs(q);
    return querySnap.docs.map((doc) => doc.data() as UserProfile);
  },

  /**
   * Fetch all users matching a specific role (e.g. 'student', 'adviser', 'panelist', 'admin').
   */
  async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('role', '==', role)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((doc) => doc.data() as UserProfile);
  },

  /**
   * Fetch all users in a specific department.
   */
  async getUsersByDepartment(department: string): Promise<UserProfile[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('department', '==', department)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((doc) => doc.data() as UserProfile);
  },

  /**
   * Update an existing user profile document.
   */
  async updateUser(uid: string, updates: UpdateUserInput): Promise<void> {
    const userRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(userRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  },

  /**
   * Check if a student ID number is already registered.
   */
  async checkStudentIdExists(studentId: string): Promise<boolean> {
    const trimmed = studentId.trim();
    if (!trimmed) return false;
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentIdOrEmployeeId', '==', trimmed)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  /**
   * Check if an email address is already registered in Firestore.
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return false;
    const q = query(
      collection(db, COLLECTION_NAME),
      where('email', '==', trimmed)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  /**
   * Fetch all pending student registrations awaiting admin approval.
   */
  async getPendingStudents(): Promise<UserProfile[]> {
    const allUsers = await this.getAllUsers();
    return allUsers.filter(
      (u) => u.role === 'student' && (u.status === 'pending' || u.is_approved === false)
    );
  },

  /**
   * Approve a pending student account.
   */
  async approveStudent(uid: string, adminUid: string): Promise<void> {
    const user = await this.getUserById(uid);
    if (!user) {
      throw new Error('User not found.');
    }
    const userRef = doc(db, COLLECTION_NAME, uid);
    const now = new Date().toISOString();
    await updateDoc(userRef, {
      status: 'approved',
      is_approved: true,
      approvedAt: now,
      approvedBy: adminUid,
      updated_at: now,
    });
  },

  /**
   * Reject a pending student account.
   */
  async rejectStudent(uid: string, adminUid: string, reason?: string): Promise<void> {
    const user = await this.getUserById(uid);
    if (!user) {
      throw new Error('User not found.');
    }
    const userRef = doc(db, COLLECTION_NAME, uid);
    const now = new Date().toISOString();
    await updateDoc(userRef, {
      status: 'rejected',
      is_approved: false,
      rejectedAt: now,
      rejectedBy: adminUid,
      rejectionReason: reason || 'Registration application was not approved.',
      updated_at: now,
    });
  },
};

export default userService;
