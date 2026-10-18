import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { db, isDevMockMode, mockUsersDb, auth } from '../config/firebaseAdmin.js';
import { updateUserProfileStores } from '../services/userProfilePersistence.service.js';
import { buildUserListCandidateFilter } from '../services/userListQuery.js';

const sendUserProfileUpdateError = (res, error, action) => {
  console.error(`[UserController] ${action} error:`, error);
  if (error.code === 'PARTIAL_USER_PROFILE_SYNC') {
    return res.status(503).json({
      success: false,
      error: 'Partial Persistence',
      message: error.message
    });
  }
  return res.status(500).json({ success: false, error: error.message });
};

// Seed initial mock users into mock storage if empty
export const seedMockUsersIfEmpty = () => {
  if (mockUsersDb.size === 0) {
    const initialUsers = [
      { uid: 'dev-student-01', email: 'alex.rivera@university.edu', fullName: 'Alex Rivera', role: 'student', department: 'Computer Science', studentIdOrEmployeeId: '2022-10482', createdAt: new Date().toISOString() },
      { uid: 'dev-student-02', email: 'maria.santos@university.edu', fullName: 'Maria Santos', role: 'student', department: 'Information Technology', studentIdOrEmployeeId: '2022-11093', createdAt: new Date().toISOString() },
      
      // NLP Test Adviser 1: Web / Info Systems
      { 
        uid: 'dev-adviser-01', email: 'maria.santos.adv@university.edu', fullName: 'Dr. Maria Santos', role: 'adviser', department: 'Computer Science', studentIdOrEmployeeId: 'EMP-8821', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 5, activeGroupsCount: 2,
        specialization: ['Web Development', 'Information Systems'],
        expertise: ['Full-Stack Development', 'React', 'Node.js', 'System Architecture'],
        researchInterests: ['Web Application Architecture', 'Educational Technology', 'Research Management Systems'],
        keywords: ['web', 'software', 'architecture', 'management', 'systems', 'application'],
        createdAt: new Date().toISOString() 
      },
      // NLP Test Adviser 2: AI / ML
      { 
        uid: 'dev-adviser-02', email: 'juan.cruz@university.edu', fullName: 'Dr. Juan Cruz', role: 'adviser', department: 'Information Technology', studentIdOrEmployeeId: 'EMP-4401', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 4, activeGroupsCount: 1,
        specialization: ['Artificial Intelligence', 'Data Science'],
        expertise: ['Machine Learning', 'Deep Learning', 'Neural Networks', 'Predictive Modeling'],
        researchInterests: ['Natural Language Processing', 'Computer Vision', 'Predictive Analytics in Education'],
        keywords: ['machine', 'learning', 'neural', 'networks', 'predictive', 'ai', 'vision'],
        createdAt: new Date().toISOString() 
      },
      // NLP Test Adviser 3: Database Systems
      { 
        uid: 'dev-adviser-03', email: 'ana.reyes@university.edu', fullName: 'Dr. Ana Reyes', role: 'adviser', department: 'Computer Science', studentIdOrEmployeeId: 'EMP-5502', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 5, activeGroupsCount: 0,
        specialization: ['Database Systems', 'Data Engineering'],
        expertise: ['SQL', 'NoSQL', 'Database Optimization', 'Data Warehousing'],
        researchInterests: ['Distributed Databases', 'Big Data Architecture', 'Query Optimization'],
        keywords: ['sql', 'nosql', 'data', 'warehousing', 'optimization', 'database'],
        createdAt: new Date().toISOString() 
      },
      // NLP Test Adviser 4: Data Analytics
      { 
        uid: 'dev-adviser-04', email: 'mark.garcia@university.edu', fullName: 'Dr. Mark Garcia', role: 'adviser', department: 'Information Technology', studentIdOrEmployeeId: 'EMP-6603', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 3, activeGroupsCount: 3,
        specialization: ['Data Analytics', 'Statistics'],
        expertise: ['Data Visualization', 'Statistical Analysis', 'Business Intelligence'],
        researchInterests: ['Educational Data Mining', 'Learning Analytics', 'Dashboard Design'],
        keywords: ['analytics', 'big', 'data', 'visualization', 'mining', 'statistics'],
        createdAt: new Date().toISOString() 
      },
      // NLP Test Adviser 5: Networking / Cybersecurity
      { 
        uid: 'dev-adviser-05', email: 'carlo.mendoza@university.edu', fullName: 'Dr. Carlo Mendoza', role: 'adviser', department: 'Computer Science', studentIdOrEmployeeId: 'EMP-7704', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 5, activeGroupsCount: 1,
        specialization: ['Networking', 'Cybersecurity'],
        expertise: ['Network Security', 'Penetration Testing', 'Cryptography'],
        researchInterests: ['IoT Security', 'Blockchain Security', 'Network Protocols'],
        keywords: ['security', 'encryption', 'protocols', 'iot', 'network', 'cybersecurity'],
        createdAt: new Date().toISOString() 
      },

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
    const { role, status, search, page, limit, program, courseId, specialization, major } = req.query;
    let usersList = [];
    let fetchedFromMongo = false;
    let mongoPaginated = false;
    let total;
    let pageNum = page ? parseInt(page, 10) : 1;
    let limitNum = limit ? parseInt(limit, 10) : 10;
    const targetProgram = (program || courseId || '').trim();
    const targetSpec = (specialization || major || '').trim();
    const hasPostQueryFilters = Boolean(
      (search && search.trim()) ||
      (targetProgram && targetProgram.toLowerCase() !== 'all') ||
      (targetSpec && targetSpec.toLowerCase() !== 'all')
    );

    if (!Number.isInteger(pageNum) || pageNum < 1) pageNum = 1;
    if (!Number.isInteger(limitNum) || limitNum < 1) limitNum = 10;

    try {
      if (mongoose.connection.readyState === 1) {
        const mongoFilter = buildUserListCandidateFilter({
          role,
          status,
          ...(hasPostQueryFilters ? { search, program, courseId, specialization, major } : {})
        });
        if (!hasPostQueryFilters && (page || limit)) {
          const [count, pageUsers] = await Promise.all([
            User.countDocuments(mongoFilter),
            User.find(mongoFilter)
              .sort({ _id: 1 })
              .skip((pageNum - 1) * limitNum)
              .limit(limitNum)
              .lean()
          ]);
          total = count;
          usersList = pageUsers;
          mongoPaginated = true;
        } else {
          usersList = await User.find(mongoFilter).lean();
        }
        fetchedFromMongo = true;
      }
    } catch (mongoErr) {
      console.warn('[UserController] MongoDB read warning:', mongoErr.message);
    }

    if (!fetchedFromMongo) {
      if (isDevMockMode) {
        seedMockUsersIfEmpty();
        usersList = Array.from(mockUsersDb.values());
      } else {
        const snapshot = await db.collection('users').get();
        usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      }
    }

    // Academic field normalization for consistent display across all user types
    usersList = usersList.map(u => {
      let programCode = u.programCode;
      let courseId = u.courseId;
      if (!programCode) {
        if (u.program?.includes('Computer Science') || courseId === 'bscs') programCode = 'BSCS';
        else if (u.program?.includes('Information Technology') || courseId === 'bsit' || u.role === 'student') programCode = 'BSIT';
        else programCode = '';
      }

      let majorCode = u.majorCode;
      let specStr = (u.major || u.programSpecialization || '').toUpperCase();
      if (!majorCode && specStr) {
        if (specStr.includes('WMAD')) majorCode = 'WMAD';
        else if (specStr.includes('AMG')) majorCode = 'AMG';
        else if (specStr.includes('SMP')) majorCode = 'SMP';
        else if (specStr.includes('IS')) majorCode = 'IS';
      }

      let sectionName = u.sectionName || u.section || (u.role === 'student' ? 'A' : '');

      return {
        ...u,
        programCode: programCode || (u.role === 'student' ? 'BSIT' : ''),
        program: u.program || (programCode === 'BSCS' ? 'Bachelor of Science in Computer Science' : programCode === 'BSIT' ? 'Bachelor of Science in Information Technology' : ''),
        majorCode: majorCode || (programCode === 'BSIT' && u.role === 'student' ? 'WMAD' : ''),
        programSpecialization: u.programSpecialization || u.major || (majorCode ? `${majorCode}` : ''),
        sectionName: sectionName || (u.role === 'student' ? 'A' : ''),
        section: sectionName || (u.role === 'student' ? 'A' : ''),
      };
    });

    // 1. Role Filter
    if (role && role !== 'all') {
      if (role === 'faculty') {
        const facultyRoles = ['adviser', 'research_coordinator', 'panelist', 'faculty'];
        usersList = usersList.filter(u => facultyRoles.includes(u.role));
      } else {
        usersList = usersList.filter(u => u.role === role);
      }
    }

    // 2. Status Filter
    if (status && status !== 'all') {
      if (status === 'pending') {
        usersList = usersList.filter(
          u =>
            u.role !== 'admin' &&
            u.role !== 'research_coordinator' &&
            u.status !== 'approved' &&
            u.status !== 'active' &&
            u.status !== 'rejected' &&
            u.is_approved !== true &&
            (u.status === 'pending' || u.is_approved === false)
        );
      } else if (status === 'rejected') {
        usersList = usersList.filter(u => u.status === 'rejected');
      } else if (status === 'approved') {
        usersList = usersList.filter(
          u => u.status === 'approved' || u.status === 'active' || u.is_approved === true || u.role === 'admin' || u.role === 'research_coordinator'
        );
      }
    }

    // 3. Program / Course Filter (BSIT / BSCS)
    const normalizedTargetProgram = targetProgram.toUpperCase();
    if (normalizedTargetProgram && normalizedTargetProgram !== 'ALL') {
      usersList = usersList.filter(u => {
        const uProg = (u.programCode || u.courseId || '').toUpperCase();
        if (normalizedTargetProgram === 'BSIT') {
          return uProg === 'BSIT' || u.program?.toUpperCase().includes('INFORMATION TECHNOLOGY');
        }
        if (normalizedTargetProgram === 'BSCS') {
          return uProg === 'BSCS' || u.program?.toUpperCase().includes('COMPUTER SCIENCE');
        }
        return uProg.includes(normalizedTargetProgram) || u.program?.toUpperCase().includes(normalizedTargetProgram);
      });
    }

    // 4. Specialization / Major Filter (BSIT: WMAD, SMP, AMG | BSCS: IS)
    const normalizedTargetSpec = targetSpec.toUpperCase();
    if (normalizedTargetSpec && normalizedTargetSpec !== 'ALL') {
      usersList = usersList.filter(u => {
        const uMajorCode = (u.majorCode || '').toUpperCase();
        const uSpec = (u.programSpecialization || u.major || '').toUpperCase();
        if (normalizedTargetSpec === 'WMAD') {
          return uMajorCode === 'WMAD' || uSpec.includes('WMAD') || uSpec.includes('WEB AND MOBILE');
        }
        if (normalizedTargetSpec === 'SMP') {
          return uMajorCode === 'SMP' || uSpec.includes('SMP') || uSpec.includes('SERVICE MANAGEMENT');
        }
        if (normalizedTargetSpec === 'AMG') {
          return uMajorCode === 'AMG' || uSpec.includes('AMG') || uSpec.includes('ANIMATION');
        }
        if (normalizedTargetSpec === 'IS') {
          return uMajorCode === 'IS' || uSpec.includes('IS') || uSpec.includes('INTELLIGENT SYSTEMS');
        }
        return uMajorCode === normalizedTargetSpec || uSpec.includes(normalizedTargetSpec);
      });
    }

    // 3. Search Filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      usersList = usersList.filter(u => 
        (u.fullName && u.fullName.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.studentIdOrEmployeeId && u.studentIdOrEmployeeId.toLowerCase().includes(q)) ||
        (u.programCode && u.programCode.toLowerCase().includes(q)) ||
        (u.program && u.program.toLowerCase().includes(q)) ||
        (u.majorCode && u.majorCode.toLowerCase().includes(q)) ||
        (u.programSpecialization && u.programSpecialization.toLowerCase().includes(q)) ||
        (u.sectionName && u.sectionName.toLowerCase().includes(q))
      );
    }

    if (total === undefined) total = usersList.length;
    let paginatedList = usersList;
    if (!page && !limit) limitNum = total || 10;

    if ((page || limit) && !mongoPaginated) {
      const startIndex = (pageNum - 1) * limitNum;
      paginatedList = usersList.slice(startIndex, startIndex + limitNum);
    }

    const totalPages = Math.ceil(total / (limitNum || 1)) || 1;

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      count: paginatedList.length,
      data: paginatedList
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

    const validRoles = ['student', 'adviser', 'panelist', 'admin', 'research_coordinator', 'coordinator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role '${role}'. Allowed: ${validRoles.join(', ')}`
      });
    }

    const roleDocUpdates = { role, updatedAt: new Date().toISOString() };
    if (role === 'adviser' || role === 'faculty') {
      roleDocUpdates.role = 'adviser';
      roleDocUpdates.role_id = 'adviser';
      roleDocUpdates.isAvailable = true;
      roleDocUpdates.maxCapacity = 5;
    }

    const updatedProfile = await updateUserProfileStores(uid, roleDocUpdates);
    if (!updatedProfile) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'User profile not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `User role successfully updated to '${roleDocUpdates.role}'.`,
      data: { uid, role: roleDocUpdates.role, updatedAt: updatedProfile.updatedAt || updatedProfile.updated_at }
    });
  } catch (error) {
    return sendUserProfileUpdateError(res, error, 'updateUserRole');
  }
};

/**
 * Update user profile (Admin only)
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = { ...req.body };
    delete updates.uid;
    delete updates._id;
    delete updates.__v;

    // When approving or updating an adviser/faculty, guarantee active adviser status and capacity
    if (updates.role === 'adviser' || updates.role === 'faculty') {
      updates.role = 'adviser';
      updates.role_id = 'adviser';
      if (updates.isAvailable === undefined) updates.isAvailable = true;
      if (updates.maxCapacity === undefined && updates.maxAdvisees === undefined) updates.maxCapacity = 5;
      if (updates.activeGroupsCount === undefined) updates.activeGroupsCount = 0;
    }

    if (updates.maxAdvisees !== undefined || updates.maxCapacity !== undefined) {
      const capacityVal = Math.max(1, parseInt(updates.maxCapacity ?? updates.maxAdvisees, 10) || 5);
      updates.maxCapacity = capacityVal;
      updates.maxAdvisees = capacityVal;
    }

    if (updates.status === 'approved' || updates.is_approved === true) {
      updates.is_approved = true;
      // 'active' grants immediate full login and directory access across the platform
      updates.status = 'active';
    }

    const updatedAt = new Date().toISOString();
    const updatedProfile = await updateUserProfileStores(uid, { ...updates, updatedAt });
    if (!updatedProfile) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'User profile not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `User profile updated.`,
      data: updatedProfile
    });
  } catch (error) {
    return sendUserProfileUpdateError(res, error, 'updateUserProfile');
  }
};

/**
 * Update authenticated user's own profile
 */
export const updateMyProfile = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { 
      first_name, last_name, fullName, college, department, 
      studentIdOrEmployeeId, profile_image,
      studentId, courseId, program_id, program, programCode, specializationId,
      programSpecialization, major, majorCode, section, sectionName, sectionId,
      enrollmentStatus, specialization, expertise, researchInterests, keywords,
      selectedExpertise
    } = req.body;

    const updates = {
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (fullName !== undefined) {
      updates.fullName = fullName;
    } else if (first_name || last_name) {
      updates.fullName = `${first_name || ''} ${last_name || ''}`.trim();
    }
    if (college !== undefined) updates.college = college;
    if (department !== undefined) {
      updates.department = department;
      updates.department_id = department;
    }
    if (studentIdOrEmployeeId !== undefined) updates.studentIdOrEmployeeId = studentIdOrEmployeeId;
    if (studentId !== undefined) updates.studentId = studentId;
    if (courseId !== undefined) updates.courseId = courseId;
    if (program_id !== undefined) updates.program_id = program_id;
    if (program !== undefined) updates.program = program;
    if (programCode !== undefined) updates.programCode = programCode;
    if (specializationId !== undefined) updates.specializationId = specializationId;
    if (programSpecialization !== undefined) updates.programSpecialization = programSpecialization;
    if (major !== undefined) updates.major = major;
    if (majorCode !== undefined) updates.majorCode = majorCode;
    if (section !== undefined) updates.section = section;
    if (sectionName !== undefined) updates.sectionName = sectionName;
    if (sectionId !== undefined) updates.sectionId = sectionId;
    if (enrollmentStatus !== undefined) updates.enrollmentStatus = enrollmentStatus;
    if (profile_image !== undefined) updates.profile_image = profile_image;
    
    // Academic fields (arrays of strings)
    if (Array.isArray(specialization)) updates.specialization = specialization;
    if (Array.isArray(expertise)) updates.expertise = expertise;
    if (Array.isArray(researchInterests)) updates.researchInterests = researchInterests;
    if (Array.isArray(keywords)) updates.keywords = keywords;
    if (Array.isArray(selectedExpertise)) updates.selectedExpertise = selectedExpertise;

    const updatedProfile = await updateUserProfileStores(uid, updates);
    if (!updatedProfile) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'User profile not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedProfile
    });
  } catch (error) {
    return sendUserProfileUpdateError(res, error, 'updateMyProfile');
  }
};

/**
 * Change authenticated user's password
 */
export const changeMyPassword = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const { newPassword } = req.body;

    if (!uid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    if (isDevMockMode || !auth) {
      return res.status(200).json({
        success: true,
        message: 'Password updated successfully (Dev Mode).'
      });
    }

    await auth.updateUser(uid, { password: newPassword });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('[UserController] changeMyPassword error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete a user account (Admin only)
 */
export const deleteUser = async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const email = req.query?.email || req.body?.email;

    // Delete the identity first so a partially completed cleanup cannot leave an active account.
    if (!isDevMockMode && auth) {
      try {
        await auth.deleteUser(uid);
      } catch (authErr) {
        if (authErr.code !== 'auth/user-not-found') {
          console.error('[UserController] Firebase Auth delete failed:', authErr);
          return res.status(503).json({
            success: false,
            error: 'Service Unavailable',
            message: 'Could not delete the Firebase Authentication account.'
          });
        }
      }
    } else if (!isDevMockMode) {
      return res.status(503).json({ success: false, error: 'Service Unavailable', message: 'Firebase Authentication is unavailable.' });
    }

    let deletedFromMongo = false;
    if (mongoose.connection.readyState === 1) {
      try {
        const queryConditions = [
          { uid },
          { email: uid },
        ];
        if (mongoose.isValidObjectId(uid)) {
          queryConditions.push({ _id: uid });
        }
        if (email) {
          queryConditions.push({ email: email.trim().toLowerCase() });
        }
        await User.deleteMany({ $or: queryConditions });
        deletedFromMongo = true;
      } catch (mongoErr) {
        console.error('[UserController] MongoDB delete error:', mongoErr);
        return res.status(503).json({
          success: false,
          error: 'Partial Persistence',
          message: 'Firebase Authentication was deleted, but the MongoDB profile could not be removed.'
        });
      }
    }

    if (isDevMockMode) {
      mockUsersDb.delete(uid);
    } else if (db) {
      try {
        await db.collection('users').doc(uid).delete();
        if (email) {
          const emailSnap = await db.collection('users').where('email', '==', email.trim().toLowerCase()).get();
          const batch = db.batch();
          emailSnap.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (fsErr) {
        console.error('[UserController] Firestore delete error:', fsErr);
        return res.status(503).json({
          success: false,
          error: deletedFromMongo ? 'Partial Persistence' : 'Service Unavailable',
          message: deletedFromMongo
            ? 'Firebase Authentication and MongoDB were deleted, but the Firestore profile could not be removed.'
            : 'The Firestore profile could not be removed.'
        });
      }
    } else if (deletedFromMongo) {
      return res.status(503).json({
        success: false,
        error: 'Partial Persistence',
        message: 'Firebase Authentication and MongoDB were deleted, but Firestore is unavailable for profile cleanup.'
      });
    } else {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'No persistent user profile store is available.'
      });
    }

    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('[UserController] deleteUser error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get section classmates for the currently authenticated student
 * Filters strictly to students in the same program, specialization, and section
 */
export const getClassmates = async (req, res) => {
  try {
    const callerUid = req.user.uid;
    let caller = null;

    if (mongoose.connection.readyState === 1) {
      caller = await User.findOne({ uid: callerUid }).lean();
      if (!caller && mongoose.isValidObjectId(callerUid)) {
        caller = await User.findById(callerUid).lean();
      }
    }
    if (!caller && db) {
      try {
        const docSnap = await db.collection('users').doc(callerUid).get();
        if (docSnap.exists) caller = { uid: docSnap.id, ...docSnap.data() };
      } catch (e) {
        console.warn('[UserController] getClassmates Firestore lookup warning:', e.message);
      }
    }

    if (!caller) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    // Resolve academic scope for the caller
    const courseId = (caller.courseId || (caller.program?.toLowerCase().includes('computer science') ? 'bscs' : 'bsit')).toLowerCase();
    const programCode = caller.programCode || (courseId === 'bscs' ? 'BSCS' : 'BSIT');

    let majorCode = (caller.majorCode || '').toUpperCase();
    const specStr = (caller.major || caller.programSpecialization || '').toUpperCase();
    if (!majorCode && specStr) {
      if (specStr.includes('WMAD') || specStr.includes('WEB AND MOBILE')) majorCode = 'WMAD';
      else if (specStr.includes('AMG') || specStr.includes('ANIMATION')) majorCode = 'AMG';
      else if (specStr.includes('SMP') || specStr.includes('SERVICE MANAGEMENT')) majorCode = 'SMP';
      else if (specStr.includes('IS') || specStr.includes('INTELLIGENT SYSTEMS')) majorCode = 'IS';
    }
    if (!majorCode && programCode === 'BSIT') majorCode = 'WMAD';

    const sectionId = caller.sectionId || '';
    const sectionName = caller.sectionName || caller.section || 'A';

    // Query students from MongoDB & Firestore
    let rawStudents = [];
    if (mongoose.connection.readyState === 1) {
      rawStudents = await User.find({ role: 'student' }).lean();
    }
    if ((!rawStudents || rawStudents.length === 0) && db) {
      const snap = await db.collection('users').where('role', '==', 'student').get();
      rawStudents = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    }

    // Filter strictly to classmates: only students belonging to the caller's program, specialization, and section
    const classmates = rawStudents.filter((s) => {
      // Must be an active / approved student
      const isApproved = s.is_approved === true || s.status === 'active' || s.status === 'approved';
      if (!isApproved) return false;

      // 1. Program match
      const sCourse = (s.courseId || (s.program?.toLowerCase().includes('computer science') ? 'bscs' : 'bsit')).toLowerCase();
      const sProg = (s.programCode || (sCourse === 'bscs' ? 'BSCS' : 'BSIT')).toUpperCase();
      const progMatches = sCourse === courseId || sProg === programCode;
      if (!progMatches) return false;

      // 2. Specialization match
      let sMajor = (s.majorCode || '').toUpperCase();
      const sSpec = (s.major || s.programSpecialization || '').toUpperCase();
      if (!sMajor && sSpec) {
        if (sSpec.includes('WMAD') || sSpec.includes('WEB AND MOBILE')) sMajor = 'WMAD';
        else if (sSpec.includes('AMG') || sSpec.includes('ANIMATION')) sMajor = 'AMG';
        else if (sSpec.includes('SMP') || sSpec.includes('SERVICE MANAGEMENT')) sMajor = 'SMP';
        else if (sSpec.includes('IS') || sSpec.includes('INTELLIGENT SYSTEMS')) sMajor = 'IS';
      }
      if (!sMajor && sProg === 'BSIT') sMajor = 'WMAD';
      if (majorCode && sMajor && sMajor !== majorCode) return false;

      // 3. Section match
      const sSecId = s.sectionId || '';
      const sSecName = (s.sectionName || s.section || '').toUpperCase();
      const userSecName = (sectionName || '').toUpperCase();
      const secMatches =
        (sectionId && sSecId === sectionId) ||
        (userSecName && sSecName === userSecName);
      if (!secMatches && (sectionId || userSecName)) return false;

      return true;
    }).map((s) => ({
      uid: s.uid || s._id,
      fullName: s.fullName || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student Researcher',
      studentIdOrEmployeeId: s.studentIdOrEmployeeId || s.studentId || s.studentNumber || '',
      studentNumber: s.studentIdOrEmployeeId || s.studentId || s.studentNumber || '',
      courseId,
      programCode,
      program: caller.program || (programCode === 'BSCS' ? 'Bachelor of Science in Computer Science' : 'Bachelor of Science in Information Technology'),
      majorCode,
      major: caller.major || caller.programSpecialization || majorCode,
      specializationId: caller.specializationId || majorCode.toLowerCase(),
      sectionId: s.sectionId || sectionId,
      sectionName: s.sectionName || s.section || sectionName,
      status: s.status || 'approved',
      is_approved: true,
      enrollmentStatus: s.enrollmentStatus || 'enrolled',
    }));

    // Query research groups for this section
    let groups = [];
    if (mongoose.connection.readyState === 1) {
      const gFilter = sectionId ? { sectionId } : {};
      groups = await mongoose.connection.collection('researchgroups').find(gFilter).toArray();
    }
    if ((!groups || groups.length === 0) && db) {
      try {
        let gQuery = db.collection('research_groups');
        if (sectionId) {
          gQuery = gQuery.where('sectionId', '==', sectionId);
        }
        const gSnap = await gQuery.get();
        groups = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (ge) {
        console.warn('[UserController] getClassmates Firestore groups warning:', ge.message);
      }
    }

    return res.status(200).json({
      success: true,
      count: classmates.length,
      data: classmates,
      groups: groups.map((g) => ({
        id: g.id || g._id,
        name: g.name,
        sectionId: g.sectionId,
        memberIds: g.memberIds || [],
      })),
      section: {
        id: sectionId,
        name: sectionName,
      },
      course: {
        id: courseId,
        code: programCode,
        name: caller.program || (programCode === 'BSCS' ? 'Bachelor of Science in Computer Science' : 'Bachelor of Science in Information Technology'),
      },
      specialization: {
        id: majorCode.toLowerCase(),
        code: majorCode,
        name: caller.major || majorCode,
      }
    });
  } catch (error) {
    console.error('[UserController] getClassmates error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

