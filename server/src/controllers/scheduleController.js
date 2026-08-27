import mongoose from 'mongoose';
import { db, isDevMockMode, mockFirestoreDb, mockUsersDb } from '../config/firebaseAdmin.js';
import { Schedule as MongoSchedule } from '../models/Schedule.js';
import { generateTimeSlots } from '../services/schedulingService.js';

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
            endTime: doc.endTime || doc.time,
            venue: doc.location,
            panelistIds: doc.panelists ? doc.panelists.map(p => p.id) : [],
            panelistNames: doc.panelists ? doc.panelists.map(p => p.name) : [],
            panelists: doc.panelists || [],
            adviserId: doc.adviserId,
            adviserName: doc.adviserName,
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
      endTime: updatedSchedule.endTime || updatedSchedule.time,
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

/**
 * Update full schedule details
 */
export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, venue, adviserId, adviserName, panelists } = req.body;

    let mongoSuccess = false;
    let updatedSchedule = null;

    if (mongoose.connection.readyState === 1) {
      updatedSchedule = await MongoSchedule.findOneAndUpdate(
        { id },
        { 
          $set: { 
            date, 
            time: startTime, 
            endTime, 
            location: venue, 
            adviserId, 
            adviserName, 
            panelists 
          } 
        },
        { new: true }
      );

      if (updatedSchedule) mongoSuccess = true;
    }

    if (!mongoSuccess) {
      return res.status(503).json({ success: false, error: 'Service Unavailable', message: 'Could not update schedule' });
    }

    return res.status(200).json({
      success: true,
      message: `Schedule updated successfully.`,
      data: updatedSchedule
    });
  } catch (error) {
    console.error('[ScheduleController] updateSchedule error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate schedule preview
 */
export const generateSchedulePreview = async (req, res) => {
  try {
    const { groups, config } = req.body;
    
    // Fetch existing schedules from DB to check conflicts
    let existingSchedules = [];
    if (mongoose.connection.readyState === 1) {
      const mongoDocs = await MongoSchedule.find({ date: config.date, status: { $ne: 'cancelled' } }).lean();
      if (mongoDocs) {
        const groupIds = groups.map(g => g.id);
        existingSchedules = mongoDocs
          .filter(doc => !groupIds.includes(doc.projectId))
          .map(doc => ({
            id: doc.id,
            projectId: doc.projectId,
            projectTitle: doc.projectTitle,
            date: doc.date,
            startTime: doc.time,
            endTime: doc.endTime || doc.time, // Fallback if old data
            venue: doc.location,
            adviserId: doc.adviserId,
            adviserName: doc.adviserName,
            panelistIds: doc.panelists ? doc.panelists.map(p => p.id) : []
          }));
      }
    }

    const { proposedSchedules, errors } = generateTimeSlots(config, groups, existingSchedules);

    return res.status(200).json({
      success: true,
      data: {
        proposedSchedules,
        errors
      }
    });
  } catch (error) {
    console.error('[ScheduleController] generateSchedulePreview error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Bulk create schedules
 */
export const bulkCreateSchedules = async (req, res) => {
  try {
    const { schedules } = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ success: false, error: 'No schedules provided.' });
    }

    let mongoSuccess = false;
    let createdCount = 0;

    if (mongoose.connection.readyState === 1) {
      const projectIds = schedules.map(s => s.projectId);
      const defenseTypes = [...new Set(schedules.map(s => s.defenseType === 'proposal_defense' ? 'proposal' : 'final_defense'))];
      
      // Clear existing schedules for these groups and defense types to prevent duplicates
      await MongoSchedule.deleteMany({ 
        projectId: { $in: projectIds },
        type: { $in: defenseTypes }
      });

      const docsToInsert = schedules.map(s => ({
        id: `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        projectId: s.projectId,
        projectTitle: s.projectTitle,
        date: s.date,
        time: s.startTime, // Keeping 'time' for backward compatibility
        endTime: s.endTime,
        location: s.venue,
        type: s.defenseType === 'proposal_defense' ? 'proposal' : 'final_defense',
        status: 'scheduled',
        adviserId: s.adviserId,
        adviserName: s.adviserName,
        panelists: s.panelists
      }));

      await MongoSchedule.insertMany(docsToInsert);
      mongoSuccess = true;
      createdCount = docsToInsert.length;
    }

    if (!mongoSuccess) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not save schedules to authoritative database.'
      });
    }

    // Existing notification hooks can be triggered here if there is a notification service
    // e.g. await notificationService.notifySchedulesCreated(docsToInsert);

    return res.status(201).json({
      success: true,
      message: `${createdCount} schedules successfully generated.`,
    });

  } catch (error) {
    console.error('[ScheduleController] bulkCreateSchedules error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete a schedule by ID (Admin only)
 */
export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (mongoose.connection.readyState === 1) {
      const result = await MongoSchedule.findOneAndDelete({ id: id });
      if (!result) {
        return res.status(404).json({ success: false, message: 'Schedule not found in MongoDB' });
      }
      return res.status(200).json({ success: true, message: 'Schedule deleted successfully' });
    }
    
    return res.status(503).json({ success: false, message: 'MongoDB not connected' });
  } catch (error) {
    console.error('[ScheduleController] deleteSchedule error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
