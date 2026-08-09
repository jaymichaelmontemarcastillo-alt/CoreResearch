import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
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
  const syncProfileWithBackend = async (firebaseUser, defaultRole = 'student') => {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await api.post('/auth/login-sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.data) {
        setUserProfile(response.data.data);
      }
    } catch (error) {
      console.warn('[AuthContext] Backend sync failed, using client fallback:', error.message);
      const nameParts = (firebaseUser.displayName || firebaseUser.email.split('@')[0]).trim().split(' ');
      setUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        first_name: nameParts[0] || 'User',
        last_name: nameParts.slice(1).join(' ') || '',
        fullName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        role: defaultRole,
        role_id: defaultRole,
        department: 'Information Technology',
        department_id: 'Information Technology',
        studentIdOrEmployeeId: '',
        status: 'active',
        is_approved: true,
        profile_image: firebaseUser.photoURL || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
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
        return;
      } catch (err) {
        localStorage.removeItem('core_research_dev_profile');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

  const register = async (email, password, fullName, role, department, studentIdOrEmployeeId) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      const nameParts = fullName.trim().split(' ');
      // Register record on Express API
      try {
        await api.post('/auth/register', {
          uid: result.user.uid,
          email,
          first_name: nameParts[0] || 'User',
          last_name: nameParts.slice(1).join(' ') || '',
          fullName,
          role,
          role_id: role,
          department,
          department_id: department,
          studentIdOrEmployeeId
        });
      } catch (apiErr) {
        console.warn('[AuthContext] API registration sync warning:', apiErr.message);
      }

      await syncProfileWithBackend(result.user, role);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (defaultRole = 'student') => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Try fetching profile from backend
      try {
        const token = await result.user.getIdToken();
        const response = await api.post('/auth/login-sync', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.data) {
          const profile = response.data.data;
          // Check if profile needs onboarding (e.g. ID is default or missing)
          if (!profile.studentIdOrEmployeeId || profile.studentIdOrEmployeeId === 'GOOGLE-USER') {
            profile.needsOnboarding = true;
          }
          setUserProfile(profile);
          return { ...result, needsOnboarding: profile.needsOnboarding };
        }
      } catch (syncErr) {
        console.warn('[AuthContext] Backend sync warning:', syncErr.message);
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
        department: 'Computer Studies',
        department_id: 'Computer Studies',
        studentIdOrEmployeeId: '',
        status: 'active',
        is_approved: true,
        profile_image: result.user.photoURL || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        needsOnboarding: true
      };

      setUserProfile(newProfile);
      return { ...result, needsOnboarding: true };
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileLocal = (updatedData) => {
    setUserProfile(prev => ({ ...prev, ...updatedData }));
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
    loading,
    devMode,
    login,
    register,
    loginWithGoogle,
    logout,
    resetPassword,
    selectDevRole,
    updateProfileLocal
  };



  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
