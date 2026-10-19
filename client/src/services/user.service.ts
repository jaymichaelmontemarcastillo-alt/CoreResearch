import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { UserProfile, CreateUserInput, UpdateUserInput, UserRole } from '../types/user.types';
import api from './api';
import { dataCache } from './dataCache';


const COLLECTION_NAME = 'users';

/**
 * Strips undefined properties from an object so Firestore operations won't fail.
 */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Normalizes user profile fields for uniform consistency across the entire client application.
 */
function normalizeUserProfile(raw: any): UserProfile {
  const u = raw || {};

  let programCode = u.programCode;
  const courseId = (u.courseId || '').toLowerCase();
  if (!programCode) {
    if (u.program?.includes('Computer Science') || courseId === 'bscs') {
      programCode = 'BSCS';
    } else if (u.program?.includes('Information Technology') || courseId === 'bsit' || u.role === 'student') {
      programCode = 'BSIT';
    } else {
      programCode = '';
    }
  }

  let majorCode = u.majorCode;
  const specStr = (u.major || u.programSpecialization || '').toUpperCase();
  if (!majorCode && specStr) {
    if (specStr.includes('WMAD') || specStr.includes('WEB AND MOBILE')) majorCode = 'WMAD';
    else if (specStr.includes('SMP') || specStr.includes('SERVICE MANAGEMENT')) majorCode = 'SMP';
    else if (specStr.includes('AMG') || specStr.includes('ANIMATION')) majorCode = 'AMG';
    else if (specStr.includes('IS') || specStr.includes('INTELLIGENT SYSTEMS')) majorCode = 'IS';
  }
  if (!majorCode && programCode === 'BSIT' && u.role === 'student') {
    majorCode = 'WMAD';
  }

  const sectionName = u.sectionName || u.section || (u.role === 'student' ? 'A' : '');
  const isApproved =
    u.is_approved === true ||
    u.status === 'approved' ||
    u.status === 'active' ||
    u.role === 'admin' ||
    u.role === 'research_coordinator';
  const status = isApproved ? 'approved' : u.status === 'rejected' ? 'rejected' : (u.status || 'pending');

  const fullName =
    u.fullName ||
    `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
    (u.role === 'student' ? 'Student Researcher' : 'User');

  const studentId = u.studentId || u.studentIdOrEmployeeId || u.employeeId || '';

  return {
    ...u,
    uid: u.uid || u._id || '',
    fullName,
    studentIdOrEmployeeId: studentId,
    studentId,
    programCode: programCode || (u.role === 'student' ? 'BSIT' : ''),
    program:
      u.program ||
      (programCode === 'BSCS'
        ? 'Bachelor of Science in Computer Science'
        : programCode === 'BSIT'
          ? 'Bachelor of Science in Information Technology'
          : ''),
    majorCode: majorCode || '',
    major: u.major || u.programSpecialization || (majorCode ? `${majorCode}` : ''),
    programSpecialization: u.programSpecialization || u.major || (majorCode ? `${majorCode}` : ''),
    sectionName,
    section: sectionName,
    is_approved: isApproved,
    status,
  };
}

export const userService = {
  /**
   * Create or initialize a new user profile document in Firestore.
   */
  async createUser(input: CreateUserInput): Promise<UserProfile> {
    const userRef = doc(db, COLLECTION_NAME, input.uid);
    const now = new Date().toISOString();
    const cleanInput = stripUndefined(input);
    const newUser: UserProfile = normalizeUserProfile({
      ...cleanInput,
      created_at: cleanInput.created_at || now,
      updated_at: cleanInput.updated_at || now,
    });
    await setDoc(userRef, stripUndefined(newUser), { merge: true });
    dataCache.invalidatePattern('user');
    dataCache.invalidatePattern('adviser');
    return newUser;
  },


  /**
   * Fetch a single user profile document by UID.
   */
  async getUserById(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    try {
      const userRef = doc(db, COLLECTION_NAME, uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        return normalizeUserProfile({ uid: docSnap.id, ...docSnap.data() });
      }
    } catch (fsErr: any) {
      console.warn('[userService] getUserById Firestore read warning:', fsErr?.message);
    }

    // Fallback: If not in Firestore or read fails, check backend API
    try {
      const res = await api.get(`/users?search=${encodeURIComponent(uid)}`);
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const found = res.data.data.find((u: any) => u.uid === uid || u._id === uid);
        if (found) return normalizeUserProfile(found);
      }
    } catch (apiErr: any) {
      console.warn('[userService] getUserById Backend fallback warning:', apiErr?.message);
    }

    return null;
  },

  /**
   * Fetch all users from backend API with fallback to Firestore.
   */
  async getAllUsers(): Promise<UserProfile[]> {
    // 1. Try backend API first to stay synchronized with MongoDB
    try {
      const res = await api.get('/users?limit=1000');
      if (res?.data?.success && Array.isArray(res.data.data)) {
        return res.data.data.map((u: any) => normalizeUserProfile(u));
      }
    } catch (apiErr: any) {
      console.warn('[userService] getAllUsers Backend query warning (using Firestore fallback):', apiErr?.message);
    }

    // 2. Fallback to Firestore by role-targeted queries (which adhere to Firestore rules)
    try {
      const [advisers, facultyUsers, coords, students, admins] = await Promise.all([
        this.getUsersByRole('adviser').catch(() => []),
        this.getUsersByRole('faculty').catch(() => []),
        this.getUsersByRole('research_coordinator').catch(() => []),
        this.getUsersByRole('student').catch(() => []),
        this.getUsersByRole('admin').catch(() => []),
      ]);
      const map = new Map<string, UserProfile>();
      [...advisers, ...facultyUsers, ...coords, ...students, ...admins].forEach((u) => {
        if (u.uid) map.set(u.uid, u);
      });
      return Array.from(map.values());
    } catch (fsErr: any) {
      console.warn('[userService] getAllUsers Firestore read warning:', fsErr?.message);
      return [];
    }
  },

  /**
   * Fetch paginated users from backend API with robust fallback to Firestore.
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
        const rawUsers = res.data.data || [];
        const normalizedUsers = rawUsers.map((u: any) => normalizeUserProfile(u));
        return {
          users: normalizedUsers,
          total: res.data.total ?? res.data.count ?? normalizedUsers.length ?? 0,
          page: res.data.page ?? params.page ?? 1,
          limit: res.data.limit ?? params.limit ?? 10,
          totalPages: res.data.totalPages ?? (Math.ceil((res.data.total || normalizedUsers.length) / (params.limit || 10)) || 1),
        };
      }
    } catch (err: any) {
      console.warn('[userService] Backend paginated users query warning (using local fallback):', err?.message);
    }

    // Fallback: targeted role query against Firestore
    let allUsers: UserProfile[] = [];
    if (params.role === 'faculty') {
      allUsers = await this.getUsersByRole('faculty');
    } else if (params.role && params.role !== 'all') {
      allUsers = await this.getUsersByRole(params.role as any);
    } else {
      allUsers = await this.getAllUsers();
    }

    let filtered = allUsers;

    if (params.role && params.role !== 'all') {
      if (params.role === 'faculty') {
        const facultyRoles = ['adviser', 'research_coordinator', 'panelist', 'faculty'];
        filtered = filtered.filter((u: any) => facultyRoles.includes(u.role));
      } else {
        filtered = filtered.filter((u: any) => u.role === params.role);
      }
    }

    if (params.status && params.status !== 'all') {
      if (params.status === 'pending') {
        filtered = filtered.filter(
          (u: any) =>
            u.role !== 'admin' &&
            u.role !== 'research_coordinator' &&
            u.status !== 'approved' &&
            u.status !== 'active' &&
            u.status !== 'rejected' &&
            u.is_approved !== true &&
            (u.status === 'pending' || u.is_approved === false)
        );
      } else if (params.status === 'rejected') {
        filtered = filtered.filter((u: any) => u.status === 'rejected');
      } else if (params.status === 'approved') {
        filtered = filtered.filter((u: any) => u.status === 'approved' || u.status === 'active' || u.is_approved === true || u.role === 'admin' || u.role === 'research_coordinator');
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
        u.studentId?.toLowerCase().includes(q) ||
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
   * Fetch all users matching a specific role (e.g. 'student', 'adviser', 'panelist', 'admin', 'faculty').
   */
  async getUsersByRole(role: string): Promise<UserProfile[]> {
    try {
      if (role === 'faculty') {
        const [adviserSnap, facultySnap, coordSnap] = await Promise.all([
          getDocs(query(collection(db, COLLECTION_NAME), where('role', '==', 'adviser'))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, COLLECTION_NAME), where('role', '==', 'faculty'))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, COLLECTION_NAME), where('role', '==', 'research_coordinator'))).catch(() => ({ docs: [] })),
        ]);
        const map = new Map<string, UserProfile>();
        [...adviserSnap.docs, ...facultySnap.docs, ...coordSnap.docs].forEach((docSnap) => {
          const u = normalizeUserProfile({ uid: docSnap.id, ...docSnap.data() });
          map.set(u.uid, u);
        });
        return Array.from(map.values());
      }

      const q = query(
        collection(db, COLLECTION_NAME),
        where('role', '==', role)
      );
      const querySnap = await getDocs(q);
      return querySnap.docs.map((docSnap) =>
        normalizeUserProfile({ uid: docSnap.id, ...docSnap.data() })
      );
    } catch (fsErr: any) {
      console.warn(`[userService] getUsersByRole(${role}) Firestore warning:`, fsErr?.message);
      // Fallback: in-memory filter from getAllUsers
      const all = await this.getAllUsers();
      if (role === 'faculty') {
        return all.filter((u) => ['adviser', 'faculty', 'research_coordinator', 'panelist'].includes(u.role));
      }
      return all.filter((u) => u.role === role);
    }
  },

  /**
   * Fetch all users in a specific department.
   */
  async getUsersByDepartment(department: string): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('department', '==', department)
      );
      const querySnap = await getDocs(q);
      return querySnap.docs.map((docSnap) =>
        normalizeUserProfile({ uid: docSnap.id, ...docSnap.data() })
      );
    } catch (fsErr: any) {
      console.warn(`[userService] getUsersByDepartment(${department}) warning:`, fsErr?.message);
      const all = await this.getAllUsers();
      return all.filter((u) => u.department === department);
    }
  },

  /**
   * Update an existing user profile through the backend persistence path.
   */
  async updateUser(uid: string, updates: UpdateUserInput): Promise<void> {
    if (!uid) return;
    const cleanUpdates = stripUndefined({
      ...updates,
      updated_at: new Date().toISOString(),
    });

    const isSelfProfileUpdate = auth.currentUser?.uid === uid && !('role' in cleanUpdates);
    await api.patch(isSelfProfileUpdate ? '/users/me' : `/users/${uid}`, cleanUpdates);
    dataCache.invalidatePattern('user');
    dataCache.invalidatePattern('adviser');
  },


  /**
   * Check if a student ID number is already registered.
   */
  async checkStudentIdExists(studentId: string): Promise<boolean> {
    const trimmed = studentId.trim();
    if (!trimmed) return false;

    // 1. Try secure backend endpoint first
    try {
      const res = await api.get(`/auth/check-id?id=${encodeURIComponent(trimmed)}`);
      if (res?.data && typeof res.data.exists === 'boolean') {
        return res.data.exists;
      }
    } catch (apiErr: any) {
      console.warn('[userService] Backend check-id check warning:', apiErr?.message);
    }

    // 2. Fallback to direct Firestore query (check both studentIdOrEmployeeId and studentId)
    try {
      const q1 = query(
        collection(db, COLLECTION_NAME),
        where('studentIdOrEmployeeId', '==', trimmed)
      );
      const snap1 = await getDocs(q1);
      if (!snap1.empty) return true;

      const q2 = query(
        collection(db, COLLECTION_NAME),
        where('studentId', '==', trimmed)
      );
      const snap2 = await getDocs(q2);
      return !snap2.empty;
    } catch (fsErr: any) {
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
    } catch (apiErr: any) {
      console.warn('[userService] Backend check-email check warning:', apiErr?.message);
    }

    // 2. Fallback to direct Firestore query
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('email', '==', trimmed)
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (fsErr: any) {
      console.warn('[userService] checkEmailExists Firestore check warning (suppressed):', fsErr?.message);
      return false;
    }
  },

  /**
   * Check live approval status by email or student ID without requiring authentication.
   * Seamlessly checks backend API with full fallback to direct Firestore lookup.
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

    // 1. Try backend status endpoint
    try {
      const res = await api.get(`/auth/status?${params.toString()}`);
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Backend actively reported no record; continue to check Firestore fallback before giving up
      } else {
        console.warn('[userService] Backend checkRegistrationStatus warning:', err?.message);
      }
    }

    // 2. Fallback: Query Firestore directly
    try {
      let snap: any = null;
      if (identifier.email) {
        const qEmail = query(
          collection(db, COLLECTION_NAME),
          where('email', '==', identifier.email.trim().toLowerCase())
        );
        snap = await getDocs(qEmail);
      }

      if ((!snap || snap.empty) && identifier.id) {
        const trimmedId = identifier.id.trim();
        const qId1 = query(
          collection(db, COLLECTION_NAME),
          where('studentIdOrEmployeeId', '==', trimmedId)
        );
        snap = await getDocs(qId1);

        if (snap.empty) {
          const qId2 = query(
            collection(db, COLLECTION_NAME),
            where('studentId', '==', trimmedId)
          );
          snap = await getDocs(qId2);
        }
      }

      if (snap && !snap.empty) {
        const userDoc = snap.docs[0].data();
        const isApproved = userDoc.is_approved === true || userDoc.status === 'approved';
        const isRejected = userDoc.status === 'rejected';
        const status = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';

        return {
          success: true,
          status,
          is_approved: isApproved,
          fullName:
            userDoc.fullName ||
            `${userDoc.first_name || ''} ${userDoc.last_name || ''}`.trim() ||
            'Student Researcher',
          email: userDoc.email,
          studentId: userDoc.studentIdOrEmployeeId || userDoc.studentId || '',
          program: userDoc.program || '',
          programCode: userDoc.programCode || '',
          major: userDoc.major || userDoc.programSpecialization || '',
          section: userDoc.sectionName || userDoc.section || '',
          role: userDoc.role || 'student',
          rejectionReason: userDoc.rejectionReason || undefined,
          submittedAt: userDoc.created_at || userDoc.createdAt || undefined,
        };
      }
    } catch (fsErr: any) {
      console.warn('[userService] Firestore fallback checkRegistrationStatus warning:', fsErr?.message);
    }

    return null;
  },

  /**
   * Fetch all pending user registrations awaiting admin approval.
   */
  async getPendingUsers(): Promise<UserProfile[]> {
    const allUsers = await this.getAllUsers();
    return allUsers.filter(
      (u) =>
        u.role !== 'admin' &&
        u.role !== 'research_coordinator' &&
        u.status !== 'approved' &&
        u.status !== 'active' &&
        u.status !== 'rejected' &&
        u.is_approved !== true &&
        (u.status === 'pending' || u.is_approved === false)
    );
  },

  /**
   * Approve a pending user account.
   */
  async approveUser(uid: string, adminUid: string, roleHint?: string): Promise<void> {
    const user = await this.getUserById(uid);
    const resolvedRole = roleHint || user?.role || 'student';
    const now = new Date().toISOString();
    const isAdviser = resolvedRole === 'adviser' || (resolvedRole as string) === 'faculty';

    const updatePayload: any = {
      status: 'approved',
      is_approved: true,
      approvedAt: now,
      approvedBy: adminUid,
      updated_at: now,
    };

    if (isAdviser) {
      updatePayload.role = 'adviser';
      updatePayload.role_id = 'adviser';
      updatePayload.isAvailable = true;
      updatePayload.maxCapacity = (user as any)?.maxCapacity || 5;
      updatePayload.activeGroupsCount = (user as any)?.activeGroupsCount || 0;
    }

    // 1. Send update to authoritative backend (updates MongoDB & syncs Firestore)
    await api.patch(`/users/${uid}`, updatePayload);

    // 2. Also directly update Firestore from client if possible for immediate reactive UI
    try {
      const userRef = doc(db, COLLECTION_NAME, uid);
      await setDoc(userRef, stripUndefined(updatePayload), { merge: true });
    } catch (fsErr: any) {
      console.warn('[userService] approveUser direct Firestore write warning:', fsErr?.message);
    }
    dataCache.invalidatePattern('user');
    dataCache.invalidatePattern('adviser');
  },

  async rejectUser(uid: string, adminUid: string, reason?: string): Promise<void> {
    const now = new Date().toISOString();
    const updatePayload = {
      status: 'rejected' as const,
      is_approved: false,
      rejectedAt: now,
      rejectedBy: adminUid,
      rejectionReason: reason || 'Registration application was not approved.',
      updated_at: now,
    };

    // 1. Send update to authoritative backend
    await api.patch(`/users/${uid}`, updatePayload);

    // 2. Also directly update Firestore from client if possible
    try {
      const userRef = doc(db, COLLECTION_NAME, uid);
      await setDoc(userRef, updatePayload, { merge: true });
    } catch (fsErr: any) {
      console.warn('[userService] rejectUser direct Firestore write warning:', fsErr?.message);
    }
    dataCache.invalidatePattern('user');
    dataCache.invalidatePattern('adviser');
  },


  async deleteUser(uid: string, email?: string): Promise<void> {
    if (!uid && !email) return;

    const url = email
      ? `/users/${uid || 'by-email'}?email=${encodeURIComponent(email)}`
      : `/users/${uid}`;
    await api.delete(url);
    dataCache.invalidatePattern('user');
    dataCache.invalidatePattern('adviser');
  },

};

export default userService;
