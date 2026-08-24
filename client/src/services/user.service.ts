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
   * Delete a user profile document from Firestore.
   */
  async deleteUser(uid: string): Promise<void> {
    const userRef = doc(db, COLLECTION_NAME, uid);
    await deleteDoc(userRef);
  },
};

export default userService;
