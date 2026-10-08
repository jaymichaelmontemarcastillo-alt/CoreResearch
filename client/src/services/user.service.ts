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
import api from './api';

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
   * Fetch paginated users from backend API with fallback to Firestore.
   */
  async getPaginatedUsers(params: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
    program?: string;
    specialization?: string;
  } = {}): Promise<{
    users: UserProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.set('page', String(params.page));
      if (params.limit) queryParams.set('limit', String(params.limit));
      if (params.role && params.role !== 'all') queryParams.set('role', params.role);
      if (params.status && params.status !== 'all') queryParams.set('status', params.status);
      if (params.search) queryParams.set('search', params.search);
      if (params.program && params.program !== 'all') queryParams.set('program', params.program);
      if (params.specialization && params.specialization !== 'all') queryParams.set('specialization', params.specialization);

      const res = await api.get(`/users?${queryParams.toString()}`);
      if (res.data && res.data.success) {
        return {
          users: res.data.data || [],
          total: res.data.total ?? res.data.count ?? res.data.data?.length ?? 0,
          page: res.data.page ?? params.page ?? 1,
          limit: res.data.limit ?? params.limit ?? 10,
          totalPages: res.data.totalPages ?? 1,
        };
      }
    } catch (err: any) {
      console.warn('[userService] Backend paginated users query warning (using local fallback):', err?.message);
    }

    // Fallback: in-memory query against Firestore
    const allUsers = await this.getAllUsers();
    let filtered = allUsers;

    if (params.role && params.role !== 'all') {
      if (params.role === 'faculty') {
        const facultyRoles = ['adviser', 'research_coordinator', 'panelist'];
        filtered = filtered.filter((u: any) => facultyRoles.includes(u.role));
      } else {
        filtered = filtered.filter((u: any) => u.role === params.role);
      }
    }

    if (params.status && params.status !== 'all') {
      if (params.status === 'pending') {
        filtered = filtered.filter(
          (u: any) =>
            u.status !== 'approved' &&
            u.status !== 'rejected' &&
            (u.status === 'pending' || u.is_approved === false)
        );
      } else if (params.status === 'rejected') {
        filtered = filtered.filter((u: any) => u.status === 'rejected');
      } else if (params.status === 'approved') {
        filtered = filtered.filter((u: any) => u.status === 'approved' || u.is_approved === true);
      }
    }

    if (params.program && params.program !== 'all') {
      const p = params.program.toUpperCase().trim();
      filtered = filtered.filter((u: any) => {
        const uProg = (u.programCode || u.courseId || '').toUpperCase();
        if (p === 'BSIT') return uProg === 'BSIT' || u.program?.toUpperCase().includes('INFORMATION TECHNOLOGY');
        if (p === 'BSCS') return uProg === 'BSCS' || u.program?.toUpperCase().includes('COMPUTER SCIENCE');
        return uProg.includes(p) || u.program?.toUpperCase().includes(p);
      });
    }

    if (params.specialization && params.specialization !== 'all') {
      const s = params.specialization.toUpperCase().trim();
      filtered = filtered.filter((u: any) => {
        const uMajorCode = (u.majorCode || '').toUpperCase();
        const uSpec = (u.programSpecialization || u.major || '').toUpperCase();
        if (s === 'WMAD') return uMajorCode === 'WMAD' || uSpec.includes('WMAD') || uSpec.includes('WEB AND MOBILE');
        if (s === 'SMP') return uMajorCode === 'SMP' || uSpec.includes('SMP') || uSpec.includes('SERVICE MANAGEMENT');
        if (s === 'AMG') return uMajorCode === 'AMG' || uSpec.includes('AMG') || uSpec.includes('ANIMATION');
        if (s === 'IS') return uMajorCode === 'IS' || uSpec.includes('IS') || uSpec.includes('INTELLIGENT SYSTEMS');
        return uMajorCode === s || uSpec.includes(s);
      });
    }

    if (params.search?.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter((u: any) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.studentIdOrEmployeeId?.toLowerCase().includes(q) ||
        u.programCode?.toLowerCase().includes(q) ||
        u.program?.toLowerCase().includes(q) ||
        u.majorCode?.toLowerCase().includes(q) ||
        u.programSpecialization?.toLowerCase().includes(q) ||
        u.sectionName?.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const users = filtered.slice(startIndex, startIndex + limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
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

    // 1. Try secure backend endpoint first (bypasses unauthenticated Firestore rule restrictions)
    try {
      const res = await api.get(`/auth/check-id?id=${encodeURIComponent(trimmed)}`);
      if (res?.data && typeof res.data.exists === 'boolean') {
        return res.data.exists;
      }
    } catch (apiErr) {
      console.warn('[userService] Backend check-id check warning:', apiErr?.message);
    }

    // 2. Fallback to direct Firestore query
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('studentIdOrEmployeeId', '==', trimmed)
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (fsErr) {
      console.warn('[userService] checkStudentIdExists Firestore check warning (suppressed):', fsErr?.message);
      return false;
    }
  },

  /**
   * Check if an email address is already registered.
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return false;

    // 1. Try secure backend endpoint first
    try {
      const res = await api.get(`/auth/check-email?email=${encodeURIComponent(trimmed)}`);
      if (res?.data && typeof res.data.exists === 'boolean') {
        return res.data.exists;
      }
    } catch (apiErr) {
      console.warn('[userService] Backend check-email check warning:', apiErr?.message);
    }

    // 2. Fallback to direct Firestore query (Firebase Auth will natively enforce email uniqueness on create)
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('email', '==', trimmed)
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (fsErr) {
      console.warn('[userService] checkEmailExists Firestore check warning (suppressed):', fsErr?.message);
      return false;
    }
  },

  /**
   * Check live approval status by email or student ID without requiring authentication.
   */
  async checkRegistrationStatus(identifier: { email?: string; id?: string }): Promise<{
    success: boolean;
    status: 'pending' | 'approved' | 'rejected';
    is_approved: boolean;
    fullName?: string;
    email?: string;
    studentId?: string;
    program?: string;
    programCode?: string;
    major?: string;
    section?: string;
    role?: string;
    rejectionReason?: string;
    submittedAt?: string;
  } | null> {
    const params = new URLSearchParams();
    if (identifier.email) params.append('email', identifier.email.trim().toLowerCase());
    if (identifier.id) params.append('id', identifier.id.trim());

    try {
      const res = await api.get(`/auth/status?${params.toString()}`);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Fetch all pending user registrations awaiting admin approval.
   */
  async getPendingUsers(): Promise<UserProfile[]> {
    const allUsers = await this.getAllUsers();
    return allUsers.filter(
      (u) =>
        u.status !== 'approved' &&
        u.status !== 'rejected' &&
        (u.status === 'pending' || u.is_approved === false)
    );
  },

  /**
   * Approve a pending user account.
   */
  async approveUser(uid: string, adminUid: string): Promise<void> {
    const user = await this.getUserById(uid);
    if (!user) {
      throw new Error('User not found.');
    }
    const userRef = doc(db, COLLECTION_NAME, uid);
    const now = new Date().toISOString();
    const updatePayload = {
      status: 'approved',
      is_approved: true,
      approvedAt: now,
      approvedBy: adminUid,
      updated_at: now,
    };
    await updateDoc(userRef, updatePayload);

    try {
      await api.patch(`/users/${uid}`, updatePayload);
    } catch (e: any) {
      console.warn('[userService] Backend approveUser sync warning:', e?.message);
    }
  },

  /**
   * Reject a pending user account.
   */
  async rejectUser(uid: string, adminUid: string, reason?: string): Promise<void> {
    const user = await this.getUserById(uid);
    if (!user) {
      throw new Error('User not found.');
    }
    const userRef = doc(db, COLLECTION_NAME, uid);
    const now = new Date().toISOString();
    const updatePayload = {
      status: 'rejected',
      is_approved: false,
      rejectedAt: now,
      rejectedBy: adminUid,
      rejectionReason: reason || 'Registration application was not approved.',
      updated_at: now,
    };
    await updateDoc(userRef, updatePayload);

    try {
      await api.patch(`/users/${uid}`, updatePayload);
    } catch (e: any) {
      console.warn('[userService] Backend rejectUser sync warning:', e?.message);
    }
  },

  /**
   * Delete a user by UID.
   */
  async deleteUser(uid: string): Promise<void> {
    await api.delete(`/users/${uid}`);
  },
};

export default userService;
