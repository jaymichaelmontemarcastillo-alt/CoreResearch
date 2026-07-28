import { db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';

// Seed initial mock users into mock storage if empty
const seedMockUsersIfEmpty = () => {
  if (mockUsersDb.size === 0) {
    const initialUsers = [
      { uid: 'dev-student-01', email: 'alex.rivera@university.edu', fullName: 'Alex Rivera', role: 'student', department: 'Computer Science', studentIdOrEmployeeId: '2022-10482', createdAt: new Date().toISOString() },
      { uid: 'dev-student-02', email: 'maria.santos@university.edu', fullName: 'Maria Santos', role: 'student', department: 'Information Technology', studentIdOrEmployeeId: '2022-11093', createdAt: new Date().toISOString() },
      { uid: 'dev-adviser-01', email: 'dr.vance@university.edu', fullName: 'Dr. Eleanor Vance', role: 'adviser', department: 'Computer Science', studentIdOrEmployeeId: 'EMP-8821', createdAt: new Date().toISOString() },
      { uid: 'dev-adviser-02', email: 'dr.reyes@university.edu', fullName: 'Dr. Roberto Reyes', role: 'adviser', department: 'Information Technology', studentIdOrEmployeeId: 'EMP-4401', createdAt: new Date().toISOString() },
      { uid: 'dev-panelist-01', email: 'prof.chen@university.edu', fullName: 'Prof. Marcus Chen', role: 'panelist', department: 'Information Technology', studentIdOrEmployeeId: 'EMP-5510', createdAt: new Date().toISOString() },
      { uid: 'dev-panelist-02', email: 'prof.gomez@university.edu', fullName: 'Prof. Sofia Gomez', role: 'panelist', department: 'Computer Science', studentIdOrEmployeeId: 'EMP-7712', createdAt: new Date().toISOString() },
      { uid: 'dev-admin-01', email: 'admin.chair@university.edu', fullName: 'Dean Elizabeth Warren', role: 'admin', department: 'Dean of Research Office', studentIdOrEmployeeId: 'ADM-0001', createdAt: new Date().toISOString() }
    ];

    initialUsers.forEach(user => mockUsersDb.set(user.uid, user));
  }
};

/**
 * Get all user profiles (Admin only)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let usersList = [];

    if (isDevMockMode) {
      seedMockUsersIfEmpty();
      usersList = Array.from(mockUsersDb.values());
    } else {
      const snapshot = await db.collection('users').get();
      usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    }

    if (role && role !== 'all') {
      usersList = usersList.filter(u => u.role === role);
    }

    if (search) {
      const q = search.toLowerCase();
      usersList = usersList.filter(u => 
        (u.fullName && u.fullName.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.studentIdOrEmployeeId && u.studentIdOrEmployeeId.toLowerCase().includes(q))
      );
    }

    return res.status(200).json({
      success: true,
      count: usersList.length,
      data: usersList
    });
  } catch (error) {
    console.error('[UserController] getAllUsers error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    const validRoles = ['student', 'adviser', 'panelist', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role '${role}'. Allowed: ${validRoles.join(', ')}`
      });
    }

    if (isDevMockMode) {
      const existing = mockUsersDb.get(uid);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      existing.role = role;
      existing.updatedAt = new Date().toISOString();
      mockUsersDb.set(uid, existing);
    } else {
      const userRef = db.collection('users').doc(uid);
      const doc = await userRef.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      await userRef.update({ role, updatedAt: new Date().toISOString() });
    }

    return res.status(200).json({
      success: true,
      message: `User role successfully updated to '${role}'.`,
      data: { uid, role }
    });
  } catch (error) {
    console.error('[UserController] updateUserRole error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
