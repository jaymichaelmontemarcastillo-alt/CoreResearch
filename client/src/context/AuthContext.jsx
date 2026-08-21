import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';
import api from '../services/api';


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

  // Sync profile with Express backend API
  // Kapag nag-login o register ang user via Firebase Auth (email man o Google), 
  // kailangan nating i-sync yung UID nila papunta sa backend natin.
  // Dito natin kinukuha yung buong Profile details galing sa Firestore 'users' collection 
  // gamit ang API natin para magamit ng buong app (e.g. for Dashboard at Protected Routes).
  const syncProfileWithBackend = async (firebaseUser, defaultRole = 'student') => {
    try {
      // Fetch directly from Firestore users collection
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // User is fully registered in our database
        setUserProfile(userDoc.data());
      } else {
        // User account exists in Firebase Auth but NOT in our users collection.
        // Eto yung scenario na di natapos yung registration o bago silang Google user.
        // HINDI tayo dapat mag-mock ng full profile. Itatag natin silang needsOnboarding
        // para ma-redirect sila ng ProtectedRoute papunta sa /onboarding.
        console.warn('[AuthContext] User document not found in Firestore. Marking for onboarding.');
        
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          needsOnboarding: true
        });
      }
    } catch (error) {
      console.error('[AuthContext] Firestore fetch failed:', error.message);
      // Kung network error or permission error, null profile para hindi mag crash pero safe.
      setUserProfile(null);
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
        // We don't return here so that the Firebase listener is still attached.
      } catch (err) {
        localStorage.removeItem('core_research_dev_profile');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If dev profile is active, ignore Firebase Auth state changes
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

  // Standard Authentication Actions

  // Normal na login gamit email at password.
  // Flow: 
  // 1. Firebase Auth vavalidate yung credentials.
  // 2. Pag okay, babalik yung `result.user` (may UID).
  // 3. Ite-trigger yung `syncProfileWithBackend` para kunin ang Firestore 'users' data nila.
  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncProfileWithBackend(result.user);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Dito kino-create yung Firebase Authentication account ng bagong user.
  // Pag successful, ginagamit yung returned UID para ma-identify yung user sa backend.
  // Connected ito sa Register page. Kahit incomplete pa yung ibang details (kasi sa Onboarding pa yun),
  // gagawa na tayo ng record sa backend/Firestore via API para may connection na.
  const register = async (email, password, fullName, role, department, studentIdOrEmployeeId, program = '') => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      const nameParts = (fullName || '').trim().split(' ');
      const first_name = nameParts[0] || 'User';
      const last_name = nameParts.slice(1).join(' ') || '';

      // Register record directly to Firestore users collection
      try {
        const userRef = doc(db, 'users', result.user.uid);
        const userProfileData = {
          uid: result.user.uid,
          email,
          first_name,
          last_name,
          fullName: `${first_name} ${last_name}`.trim(),
          role: role || 'student',
          role_id: role || 'student',
          department: department || 'Information Technology',
          department_id: department || 'Information Technology',
          program: program || '',
          studentIdOrEmployeeId: studentIdOrEmployeeId || '',
          status: 'active',
          is_approved: true,
          profile_image: result.user.photoURL || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await setDoc(userRef, userProfileData, { merge: true });
      } catch (dbErr) {
        console.warn('[AuthContext] Firestore registration warning:', dbErr.message);
      }

      await syncProfileWithBackend(result.user, role || 'student');
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Google Auth — Direct Log In
  // Flow:
  // 1. Popup Google authentication.
  // 2. Checks Firestore 'users' collection to see if user has already registered.
  // 3. If account does NOT exist, signs out immediately and throws an error asking user to register.
  // 4. If account exists, logs in directly.
  const loginWithGoogle = async () => {
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
  // Flow:
  // 1. Popup Google authentication.
  // 2. If user already exists, logs them in directly.
  // 3. If new user, creates an initial profile marked with needsOnboarding = true to proceed to Onboarding.
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
        department_id: 'Information Technology',
        studentIdOrEmployeeId: '',
        status: 'active',
        is_approved: true,
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
    // 1. Update state & dev storage
    updateProfileLocal(updatedData);

    // 2. If logged in with Firebase, sync to Firestore
    if (currentUser?.uid && !devMode) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          ...updatedData,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('[AuthContext] Firestore profile update warning:', err.message);
      }
    }
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
      adviser: {
        uid: 'dev-adviser-01',
        email: 'dr.vance@university.edu',
        fullName: 'Dr. Eleanor Vance',
        role: 'adviser',
        department: 'Computer Science',
        studentIdOrEmployeeId: 'EMP-8821'
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
    department: userProfile?.department || null,
    isApproved: userProfile?.is_approved || false,
    status: userProfile?.status || null,
    loading,
    devMode,
    login,
    register,
    loginWithGoogle,
    registerWithGoogle,
    logout,
    resetPassword,
    selectDevRole,
    updateProfileLocal,
    updateUserProfile
  };



  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
