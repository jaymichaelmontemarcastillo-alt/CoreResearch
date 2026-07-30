import { useAuth as useAuthContext } from '../context/AuthContext';
import { UserProfile, UserRole } from '../types/user.types';

export interface UseAuthReturn {
  currentUser: any;
  userProfile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  devMode: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    department: string,
    studentIdOrEmployeeId?: string
  ) => Promise<any>;
  loginWithGoogle: (defaultRole?: UserRole) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  selectDevRole: (role: UserRole) => void;
  updateProfileLocal: (updatedData: Partial<UserProfile>) => void;
}

export const useAuth = (): UseAuthReturn => {
  return useAuthContext() as UseAuthReturn;
};

export default useAuth;
