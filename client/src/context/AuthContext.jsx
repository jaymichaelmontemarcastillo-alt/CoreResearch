import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';
import api from '../services/api';
import { userService } from '../services/user.service';


const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devMode, setDevMode] = useState(false);
  const isRegisteringRef = useRef(false);
  const [currentFacultyMode, setCurrentFacultyMode] = useState(
    localStorage.getItem('core_research_faculty_mode') || 'adviser'
  );

  // Read the client-facing Firestore profile projection after authentication.
  // Kapag nag-login o register ang user via Firebase Auth (email man o Google), 
  // kailangan nating kunin yung profile para sa buong app.
  // Dito natin kinukuha yung buong Profile details galing sa Firestore 'users' collection
  // para magamit ng buong app (e.g. for Dashboard at Protected Routes).
  const syncProfileWithBackend = async (firebaseUser, defaultRole = 'student') => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const profile = userDoc.data();

        // Enforce approval for non-admin accounts: pending/rejected cannot remain logged in
        if (profile.role !== 'admin' && (profile.status === 'pending' || profile.status === 'rejected' || profile.is_approved === false)) {
          if (profile.status === 'rejected') {
            console.warn('[AuthContext] Account is rejected. Logging out.');
            await signOut(auth);
            setCurrentUser(null);
            setUserProfile(null);
            return null;
          }
          // Retain session & profile for pending accounts so approval detection works in real time
          setUserProfile(profile);
          return profile;
        }

        setUserProfile(profile);
        return profile;
      } else {
        console.warn('[AuthContext] User document not found in Firestore. Marking for onboarding.');
        const partialProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          needsOnboarding: true
        };
        setUserProfile(partialProfile);
        return partialProfile;
      }
    } catch (error) {
      console.error('[AuthContext] Firestore fetch failed:', error.message);
      setUserProfile(null);
      return null;
    }
  };

  useEffect(() => {
    // Check for saved local dev mode user profile
    const savedDevProfile = localStorage.getItem('core_research_dev_profile');
    if (savedDevProfile) {
      try {
        const parsed = JSON.parse(savedDevProfile);
        setUserProfile(parsed);
        setCurrentUser({ uid: parsed.uid, email: parsed.email });
        setDevMode(true);
        setLoading(false);
      } catch (err) {
        localStorage.removeItem('core_research_dev_profile');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Do not intercept or prematurely sign out/redirect during active registration flows
      if (isRegisteringRef.current) {
        return;
      }

      if (localStorage.getItem('core_research_dev_profile')) {
        setLoading(false);
        return;
      }

      if (user) {
        setCurrentUser(user);
        await syncProfileWithBackend(user);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Real-time listener for pending accounts to automatically detect approval
  useEffect(() => {
    if (!currentUser?.uid) return;

    // If already approved or active, do not attach or keep listener
    if (userProfile && (userProfile.is_approved === true || userProfile.status === 'approved' || userProfile.status === 'active')) {
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    let handled = false;

    const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists() && !handled) {
        const updated = docSnap.data();
        if (updated.is_approved === true || updated.status === 'approved' || updated.status === 'active') {
          handled = true;
          console.log('[AuthContext] Account approved in real-time Firestore update!');
          setUserProfile(prev => {
            if (prev?.is_approved === true && (prev?.status === 'approved' || prev?.status === 'active')) {
              return prev;
            }
            return { ...prev, ...updated, is_approved: true, status: 'approved' };
          });
        }
      }
    }, () => {
      // Silent suppression of adblocker / network retry warnings
    });

    return () => {
      unsubscribeSnapshot();
    };
  }, [currentUser?.uid, userProfile?.is_approved, userProfile?.status]);

  // Standard Authentication Actions

  /**
   * Normal login using email & password.
   * Supports optional portal check ('student' | 'faculty') and validates account status.
   */
  const login = async (email, password, portal = null) => {
    setLoading(true);
    try {
      const normalizedEmail = email.trim();
      const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      
      // Fetch Firestore profile directly to inspect role & approval
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const profile = userDoc.data();

        // 1. Validate Portal Role Separation
        if (portal === 'admin' && profile.role !== 'admin') {
          await signOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
          throw new Error('Access denied. This portal is strictly for System Administrators only.');
        }

        if (portal === 'student' && profile.role !== 'student') {
          await signOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
          throw new Error('This portal is for Students only. Please use the Faculty or Admin Portal to sign in.');
        }

        if (portal === 'faculty' && profile.role === 'student') {
          await signOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
          throw new Error('This portal is for Faculty only. Please use the Student Portal to sign in.');
        }

        // 2. Validate Approval Status for non-admins
        if (profile.role !== 'admin') {
          if (profile.status === 'pending' || (profile.is_approved === false && profile.status !== 'approved')) {
            setCurrentUser(result.user);
            setUserProfile(profile);
            const pendingErr = new Error('Account Pending Approval\nYour account has been successfully registered but is still waiting for administrator approval. Please wait until an administrator approves your account.');
            pendingErr.code = 'auth/account-pending';
            throw pendingErr;
          }

          if (profile.status === 'rejected') {
            await signOut(auth);
            setCurrentUser(null);
            setUserProfile(null);
            const rejectedErr = new Error('Registration Not Approved\nYour registration was not approved by the administrator.');
            rejectedErr.code = 'auth/account-rejected';
            throw rejectedErr;
          }
        }

        setUserProfile(profile);
        setCurrentUser(result.user);
        return { result, profile };
      }

      await syncProfileWithBackend(result.user);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Dedicated Student Registration:
   * Fields: Student ID, Complete Name, Gmail/Email, Program, Major, Section, Password.
   * Excludes Year Level completely.
   * Creates account with status = 'pending', is_approved = false.
   * Generates admin notification and logs out immediately.
   */
  const registerStudent = async ({
    email,
    password,
    fullName,
    firstName,
    lastName,
    studentId,
    courseId,
    program,
    programCode,
    major,
    majorCode,
    specializationId,
    section,
    sectionName,
    sectionId,
    enrollmentStatus,
  }) => {
    isRegisteringRef.current = true;
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedStudentId = studentId.trim();

      // 1. Check unique Student ID
      const studentIdExists = await userService.checkStudentIdExists(normalizedStudentId);
      if (studentIdExists) {
        const idErr = new Error("Student ID Already Registered\nThis Student ID Number is already associated with an account.");
        idErr.code = "auth/student-id-exists";
        throw idErr;
      }

      // 2. Check unique Email
      const emailExists = await userService.checkEmailExists(normalizedEmail);
      if (emailExists) {
        const emailErr = new Error("Email Already Registered\nAn account with this email address already exists.");
        emailErr.code = "auth/email-already-in-use";
        throw emailErr;
      }

      // 3. Create Firebase Auth user
      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

      const fName = (firstName?.trim() || fullName?.trim().split(' ')[0] || 'Student');
      const lName = (lastName?.trim() || fullName?.trim().split(' ').slice(1).join(' ') || '');
      const completeName = (fullName?.trim() || `${fName} ${lName}`).trim();

      // Canonical academic resolutions
      const resolvedCourseId = (courseId || programCode?.toLowerCase() || (program?.includes('Computer Science') ? 'bscs' : 'bsit')).toLowerCase();
      const resolvedProgCode = programCode || (resolvedCourseId === 'bscs' ? 'BSCS' : 'BSIT');
      const resolvedProgName = program || (resolvedCourseId === 'bscs' ? 'Bachelor of Science in Computer Science' : 'Bachelor of Science in Information Technology');

      let resolvedSpecId = specializationId ? specializationId.toLowerCase() : '';
      let resolvedMajorCode = majorCode || '';
      if (!resolvedSpecId) {
        const specStr = (major || majorCode || '').toUpperCase();
        if (specStr.includes('WMAD')) { resolvedSpecId = 'wmad'; resolvedMajorCode = 'WMAD'; }
        else if (specStr.includes('AMG')) { resolvedSpecId = 'amg'; resolvedMajorCode = 'AMG'; }
        else if (specStr.includes('SMP')) { resolvedSpecId = 'smp'; resolvedMajorCode = 'SMP'; }
        else if (specStr.includes('IS')) { resolvedSpecId = 'is'; resolvedMajorCode = 'IS'; }
      }
      if (!resolvedMajorCode && resolvedSpecId) {
        resolvedMajorCode = resolvedSpecId.toUpperCase();
      }

      const resolvedSecName = sectionName || section || 'A';
      const resolvedSecId = sectionId && sectionId !== resolvedSecName
        ? sectionId
        : `${resolvedCourseId}-sec-${resolvedSecName.toLowerCase()}`;

      const userProfileData = {
        uid: result.user.uid,
        email: normalizedEmail,
        first_name: fName,
        last_name: lName,
        fullName: completeName,
        studentIdOrEmployeeId: normalizedStudentId,
        studentId: normalizedStudentId,
        courseId: resolvedCourseId,
        program_id: resolvedCourseId,
        program: resolvedProgName,
        programCode: resolvedProgCode,
        specializationId: resolvedSpecId,
        major: major || (resolvedMajorCode ? `${resolvedMajorCode}` : ''),
        majorCode: resolvedMajorCode,
        programSpecialization: major || (resolvedMajorCode ? `${resolvedMajorCode}` : ''),
        section: resolvedSecName,
        sectionName: resolvedSecName,
        sectionId: resolvedSecId,
        enrollmentStatus: enrollmentStatus || 'enrolled',
        role: 'student',
        role_id: 'student',
        department: resolvedCourseId === 'bscs' ? 'Computer Science' : 'Information Technology',
        department_id: resolvedCourseId === 'bscs' ? 'cs' : 'it',
        status: 'pending',
        is_approved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 4. Persist profile document:
      await api.post('/auth/register', userProfileData);

      // 6. Keep session & profile active with pending status.
      // ProtectedRoute restricts them to /pending-approval until an administrator approves them.
      setCurrentUser(result.user);
      setUserProfile(userProfileData);

      return { success: true, pendingApproval: true, studentData: userProfileData };
    } catch (error) {
      throw error;
    } finally {
      isRegisteringRef.current = false;
      setLoading(false);
    }
  };

  /**
   * Dedicated Faculty Registration:
   * Keeps existing faculty fields without student-specific fields.
   */
  const registerFaculty = async ({
    email,
    password,
    fullName,
    firstName,
    lastName,
    employeeId,
    department,
    role = 'adviser',
  }) => {
    isRegisteringRef.current = true;
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedEmployeeId = employeeId ? employeeId.trim() : '';

      // Check unique employee id if provided
      if (normalizedEmployeeId) {
        const empExists = await userService.checkStudentIdExists(normalizedEmployeeId);
        if (empExists) {
          throw new Error("Employee ID Already Registered\nThis Employee ID is already associated with an account.");
        }
      }

      // Check unique email
      const emailExists = await userService.checkEmailExists(normalizedEmail);
      if (emailExists) {
        const emailErr = new Error("Email Already Registered\nAn account with this email address already exists.");
        emailErr.code = "auth/email-already-in-use";
        throw emailErr;
      }

      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

      const fName = (firstName?.trim() || fullName?.trim().split(' ')[0] || 'Faculty');
      const lName = (lastName?.trim() || fullName?.trim().split(' ').slice(1).join(' ') || '');
      const completeName = (fullName?.trim() || `${fName} ${lName}`).trim();

      const userProfileData = {
        uid: result.user.uid,
        email: normalizedEmail,
        first_name: fName,
        last_name: lName,
        fullName: completeName,
        studentIdOrEmployeeId: normalizedEmployeeId,
        role: role || 'adviser',
        role_id: role || 'adviser',
        department: department || 'College of Computer Studies',
        department_id: department ? (department.toLowerCase().includes('computer studies') ? 'ccs' : 'it') : 'ccs',
        college: 'College of Computer Studies',
        status: 'pending',
        is_approved: false,
        isAvailable: true,
        maxCapacity: 5,
        activeGroupsCount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await api.post('/auth/register', userProfileData);

      // Keep session & profile active with pending status.
      // ProtectedRoute restricts them to /pending-approval until an administrator approves them.
      setCurrentUser(result.user);
      setUserProfile(userProfileData);

      return { success: true, pendingApproval: true, facultyData: userProfileData };
    } catch (error) {
      throw error;
    } finally {
      isRegisteringRef.current = false;
      setLoading(false);
    }
  };

  // General legacy register (for backwards compatibility)
  const register = async (email, password, fullName, role, department, studentIdOrEmployeeId, program = '', programSpecialization = '', sectionName = 'A') => {
    if (role === 'student') {
      return registerStudent({
        email,
        password,
        fullName,
        studentId: studentIdOrEmployeeId,
        program,
        major: programSpecialization,
        section: sectionName,
      });
    } else {
      return registerFaculty({
        email,
        password,
        fullName,
        employeeId: studentIdOrEmployeeId,
        department,
        role: role || 'adviser',
      });
    }
  };

  // Google Auth — Direct Log In
  const loginWithGoogle = async (portal = null) => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const profile = userDoc.data();

        // 1. Role portal separation
        if (portal === 'admin' && profile.role !== 'admin') {
          await signOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
          throw new Error('Access denied. This portal is strictly for System Administrators only.');
        }

        if (portal === 'student' && profile.role !== 'student') {
          await signOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
          throw new Error('This portal is for Students only. Please use the Faculty or Admin Portal to sign in.');
        }

        if (portal === 'faculty' && profile.role === 'student') {
          await signOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
          throw new Error('This portal is for Faculty only. Please use the Student Portal to sign in.');
        }

        // 2. Approval status for non-admins
        if (profile.role !== 'admin') {
          if (profile.status === 'pending' || (profile.is_approved === false && profile.status !== 'approved')) {
            await signOut(auth);
            setCurrentUser(null);
            setUserProfile(null);
            const pendingErr = new Error('Account Pending Approval\nYour account has been successfully registered but is still waiting for administrator approval. Please wait until an administrator approves your account.');
            pendingErr.code = 'auth/account-pending';
            throw pendingErr;
          }

          if (profile.status === 'rejected') {
            await signOut(auth);
            setCurrentUser(null);
            setUserProfile(null);
            const rejectedErr = new Error('Registration Not Approved\nYour registration was not approved by the administrator.');
            rejectedErr.code = 'auth/account-rejected';
            throw rejectedErr;
          }
        }

        if (!profile.studentIdOrEmployeeId || profile.studentIdOrEmployeeId === 'GOOGLE-USER') {
          profile.needsOnboarding = true;
        } else {
          profile.needsOnboarding = false;
        }
        setUserProfile(profile);
        return { ...result, profile, needsOnboarding: profile.needsOnboarding };
      }

      // No registered account in database: reject direct login & sign out
      await signOut(auth);
      setUserProfile(null);
      setCurrentUser(null);
      
      const notFoundErr = new Error("No registered account found with this Google email. Please register first.");
      notFoundErr.code = "auth/user-not-found";
      throw notFoundErr;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Google Auth — Registration
  const registerWithGoogle = async (defaultRole = 'student') => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const profile = userDoc.data();
        if (!profile.studentIdOrEmployeeId || profile.studentIdOrEmployeeId === 'GOOGLE-USER') {
          profile.needsOnboarding = true;
        } else {
          profile.needsOnboarding = false;
        }
        setUserProfile(profile);
        return { ...result, profile, needsOnboarding: profile.needsOnboarding, alreadyRegistered: true };
      }

      // Default fallback profile marking needsOnboarding = true
      const nameParts = (result.user.displayName || result.user.email.split('@')[0]).trim().split(' ');
      const newProfile = {
        uid: result.user.uid,
        email: result.user.email,
        first_name: nameParts[0] || 'User',
        last_name: nameParts.slice(1).join(' ') || '',
        fullName: result.user.displayName || result.user.email.split('@')[0],
        role: defaultRole,
        role_id: defaultRole,
        department: 'Information Technology',
        department_id: 'it',
        studentIdOrEmployeeId: '',
        status: defaultRole === 'admin' ? 'active' : 'pending',
        is_approved: defaultRole === 'admin' ? true : false,
        profile_image: result.user.photoURL || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        needsOnboarding: true
      };

      setUserProfile(newProfile);
      return { ...result, profile: newProfile, needsOnboarding: true };
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileLocal = (updatedData) => {
    setUserProfile(prev => {
      const merged = { ...prev, ...updatedData };
      if (devMode || localStorage.getItem('core_research_dev_profile')) {
        localStorage.setItem('core_research_dev_profile', JSON.stringify(merged));
      }
      return merged;
    });
  };

  const updateUserProfile = async (updatedData) => {
    // Persist through the backend so MongoDB remains authoritative and Firestore stays a projection.
    if (currentUser?.uid && !devMode) {
      await api.patch('/users/me', {
        ...updatedData,
        updated_at: new Date().toISOString()
      });
    }
    updateProfileLocal(updatedData);
  };


  const logout = async () => {
    if (devMode) {
      localStorage.removeItem('core_research_dev_profile');
      localStorage.removeItem('core_research_dev_token');
      setDevMode(false);
      setUserProfile(null);
      setCurrentUser(null);
      return;
    }
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Demo / Dev Mode Quick Role Switcher
  const selectDevRole = (role) => {
    const mockProfiles = {
      student: {
        uid: 'dev-student-01',
        email: 'alex.rivera@university.edu',
        fullName: 'Alex Rivera',
        role: 'student',
        department: 'Computer Science',
        studentIdOrEmployeeId: '2022-10482'
      },
      adviser1: {
        uid: 'dev-adviser-01',
        email: 'maria.santos.adv@university.edu',
        fullName: 'Dr. Maria Santos',
        role: 'adviser',
        department: 'Computer Science',
        studentIdOrEmployeeId: 'EMP-8821'
      },
      adviser2: {
        uid: 'dev-adviser-02',
        email: 'juan.cruz@university.edu',
        fullName: 'Dr. Juan Cruz',
        role: 'adviser',
        department: 'Information Technology',
        studentIdOrEmployeeId: 'EMP-4401'
      },
      adviser3: {
        uid: 'dev-adviser-03',
        email: 'ana.reyes@university.edu',
        fullName: 'Dr. Ana Reyes',
        role: 'adviser',
        department: 'Computer Science',
        studentIdOrEmployeeId: 'EMP-5502'
      },
      adviser4: {
        uid: 'dev-adviser-04',
        email: 'mark.garcia@university.edu',
        fullName: 'Dr. Mark Garcia',
        role: 'adviser',
        department: 'Information Technology',
        studentIdOrEmployeeId: 'EMP-6603'
      },
      adviser5: {
        uid: 'dev-adviser-05',
        email: 'carlo.mendoza@university.edu',
        fullName: 'Dr. Carlo Mendoza',
        role: 'adviser',
        department: 'Computer Science',
        studentIdOrEmployeeId: 'EMP-7704'
      },
      panelist: {
        uid: 'dev-panelist-01',
        email: 'prof.chen@university.edu',
        fullName: 'Prof. Marcus Chen',
        role: 'panelist',
        department: 'Information Technology',
        studentIdOrEmployeeId: 'EMP-5510'
      },
      admin: {
        uid: 'dev-admin-01',
        email: 'admin.chair@university.edu',
        fullName: 'Dean Elizabeth Warren',
        role: 'admin',
        department: 'Dean of Research Office',
        studentIdOrEmployeeId: 'ADM-0001'
      },
      research_coordinator: {
        uid: 'dev-coordinator-01',
        email: 'coord.santos@university.edu',
        fullName: 'Prof. Maria Santos',
        role: 'research_coordinator',
        department: 'Department of Information Technology',
        studentIdOrEmployeeId: 'EMP-7700'
      }
    };

    const profile = mockProfiles[role] || mockProfiles.student;
    const token = `dev-token-${profile.uid}-${profile.role}`;

    localStorage.setItem('core_research_dev_profile', JSON.stringify(profile));
    localStorage.setItem('core_research_dev_token', token);

    setUserProfile(profile);
    setCurrentUser({ uid: profile.uid, email: profile.email });
    setDevMode(true);
  };

  const value = {
    currentUser,
    userProfile,
    role: userProfile?.role || null,
    currentFacultyMode: userProfile?.role === 'faculty' ? currentFacultyMode : null,
    setFacultyMode: (mode) => {
      setCurrentFacultyMode(mode);
      localStorage.setItem('core_research_faculty_mode', mode);
    },
    department: userProfile?.department || null,
    isApproved: userProfile?.is_approved || false,
    status: userProfile?.status || null,
    loading,
    devMode,
    login,
    register,
    registerStudent,
    registerFaculty,
    loginWithGoogle,
    registerWithGoogle,
    logout,
    resetPassword,
    selectDevRole,
    updateProfileLocal,
    updateUserProfile,
    refreshProfile: () => currentUser ? syncProfileWithBackend(currentUser) : null
  };



  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
