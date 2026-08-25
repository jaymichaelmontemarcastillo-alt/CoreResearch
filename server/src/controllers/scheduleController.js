import mongoose from 'mongoose';
import { db, isDevMockMode, mockFirestoreDb, mockUsersDb } from '../config/firebaseAdmin.js';
import { Schedule as MongoSchedule } from '../models/Schedule.js';

// Pre-seed mock defense schedules if store is empty
const seedMockSchedulesIfEmpty = () => {
  if (!mockFirestoreDb.has('schedules')) {
    const initialSchedules = [
      {
        id: 'sch-301',
        projectId: 'proj-501',
        projectTitle: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        studentName: 'Alex Rivera',
        defenseType: 'proposal_defense',
        date: '2026-08-14',
        startTime: '10:00',
        endTime: '11:30',
        venue: 'Room 402, Engineering Hall (Hybrid Zoom Link: https://zoom.us/j/9981245)',
        panelistIds: ['dev-panelist-01', 'dev-panelist-02'],
        panelistNames: ['Prof. Marcus Chen', 'Prof. Sofia Gomez'],
        status: 'scheduled',
        createdAt: new Date().toISOString()
      }
    ];

    const map = new Map();
    initialSchedules.forEach(s => map.set(s.id, s));
    mockFirestoreDb.set('schedules', map);
  }
};

/**
 * Schedule defense presentation (Admin only)
 */
export const createSchedule = async (req, res) => {
  try {
    const { projectId, projectTitle, studentName, defenseType, date, startTime, endTime, venue, panelistIds } = req.body;

    if (!projectTitle || !date || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'projectTitle, date, and startTime are required.'
      });
    }

    let panelistNames = [];
    if (Array.isArray(panelistIds)) {
      if (isDevMockMode) {
        panelistNames = panelistIds.map(pid => {
          const u = mockUsersDb.get(pid);
          return u ? u.fullName : 'Panelist';
        });
      } else {
        const docs = await Promise.all(panelistIds.map(pid => db.collection('users').doc(pid).get()));
        panelistNames = docs.map(d => d.exists ? d.data().fullName : 'Panelist');
      }
    }

    const newScheduleId = `sch-${Date.now()}`;
    
    // [FINAL PRODUCTION ARCHITECTURE]
    // Strictly write to MongoDB. Hard fail if unavailable.
    let mongoSuccess = false;
    let createdSchedule = null;

    try {
      if (mongoose.connection.readyState === 1) {
        const panelistsList = panelistIds ? panelistIds.map((pid, idx) => ({
          id: pid,
          name: panelistNames[idx] || 'Panelist',
          email: '',
          role: 'panelist'
        })) : [];

        createdSchedule = await MongoSchedule.create({
          id: newScheduleId,
          projectId: projectId || 'proj-501',
          projectTitle,
          date,
          time: startTime,
          location: venue || 'Conference Room A',
          type: defenseType === 'proposal_defense' ? 'proposal' : 'final_defense',
          status: 'scheduled',
          panelists: panelistsList
        });
        mongoSuccess = true;
      }
    } catch (mongoErr) {
      console.error('[ScheduleController] MongoDB create schedule error:', mongoErr.message);
    }

    if (!mongoSuccess) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not write schedule to authoritative database. Operation aborted.'
      });
    }

    // Map back for response compatibility
    const responseData = {
      id: createdSchedule.id,
      projectId: createdSchedule.projectId,
      projectTitle: createdSchedule.projectTitle,
      studentName: studentName || 'Student Researcher',
      defenseType: createdSchedule.type === 'proposal' ? 'proposal_defense' : 'final_defense',
      date: createdSchedule.date,
      startTime: createdSchedule.time,
      endTime: endTime || '11:00',
      venue: createdSchedule.location,
      panelistIds: createdSchedule.panelists.map(p => p.id),
      panelistNames: createdSchedule.panelists.map(p => p.name),
      status: createdSchedule.status,
      createdAt: createdSchedule.createdAt
    };

    return res.status(201).json({
      success: true,
      message: 'Defense presentation scheduled successfully.',
      data: responseData
    });
  } catch (error) {
    console.error('[ScheduleController] createSchedule error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get defense schedules list
 */
export const getSchedules = async (req, res) => {
  try {
    let list = [];
    let fetchedFromMongo = false;

    try {
      if (mongoose.connection.readyState === 1) {
        const mongoDocs = await MongoSchedule.find().lean();
        if (mongoDocs) {
          list = mongoDocs.map(doc => ({
            id: doc.id,
            projectId: doc.projectId,
            projectTitle: doc.projectTitle,
            studentName: 'Student Researcher', // Unused in new schema
            defenseType: doc.type === 'proposal' ? 'proposal_defense' : 'final_defense',
            date: doc.date,
            startTime: doc.time,
            endTime: doc.time,
            venue: doc.location,
            panelistIds: doc.panelists ? doc.panelists.map(p => p.id) : [],
            panelistNames: doc.panelists ? doc.panelists.map(p => p.name) : [],
            status: doc.status,
            createdAt: doc.createdAt
          }));
          fetchedFromMongo = true;
        }
      }
    } catch (mongoErr) {
      console.warn('[ScheduleController] MongoDB get schedules warning:', mongoErr.message);
    }

    if (!fetchedFromMongo) {
      // [TEMPORARY MIGRATION COMPATIBILITY]
      if (isDevMockMode) {
        seedMockSchedulesIfEmpty();
        const map = mockFirestoreDb.get('schedules');
        list = Array.from(map.values());
      } else {
        const snapshot = await db.collection('schedules').get();
        list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    }

    list.sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    console.error('[ScheduleController] getSchedules error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update schedule status
 */
export const updateScheduleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // [FINAL PRODUCTION ARCHITECTURE]
    // Strictly write to MongoDB. Hard fail if unavailable.
    let mongoSuccess = false;
    let updatedSchedule = null;

    try {
      if (mongoose.connection.readyState === 1) {
        updatedSchedule = await MongoSchedule.findOneAndUpdate(
          { id: id },
          { $set: { status } },
          { new: true }
        );

        if (updatedSchedule) {
          mongoSuccess = true;
        }
      }
    } catch (mongoErr) {
      console.error('[ScheduleController] MongoDB update schedule error:', mongoErr.message);
    }

    if (!mongoSuccess) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not update schedule in authoritative database. Operation aborted.'
      });
    }

    // Map back for response compatibility
    const updated = {
      id: updatedSchedule.id,
      projectId: updatedSchedule.projectId,
      projectTitle: updatedSchedule.projectTitle,
      studentName: 'Student Researcher', // Unused in new schema
      defenseType: updatedSchedule.type === 'proposal' ? 'proposal_defense' : 'final_defense',
      date: updatedSchedule.date,
      startTime: updatedSchedule.time,
      endTime: updatedSchedule.time,
      venue: updatedSchedule.location,
      panelistIds: updatedSchedule.panelists ? updatedSchedule.panelists.map(p => p.id) : [],
      panelistNames: updatedSchedule.panelists ? updatedSchedule.panelists.map(p => p.name) : [],
      status: updatedSchedule.status,
      createdAt: updatedSchedule.createdAt
    };

    return res.status(200).json({
      success: true,
      message: `Schedule status updated to '${status}'.`,
      data: updated
    });
  } catch (error) {
    console.error('[ScheduleController] updateScheduleStatus error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
