import { useState, useEffect, useCallback } from 'react';
import userService from '../services/user.service';
import { UserProfile, UserRole, UpdateUserInput } from '../types/user.types';

export const useUsers = (roleFilter?: UserRole) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result: UserProfile[];
      if (roleFilter) {
        result = await userService.getUsersByRole(roleFilter);
      } else {
        result = await userService.getUsersByRole('student');
      }
      setUsers(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (uid: string, updates: UpdateUserInput) => {
    setLoading(true);
    try {
      await userService.updateUser(uid, updates);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, error, refetch: fetchUsers, updateUser };
};

export default useUsers;
