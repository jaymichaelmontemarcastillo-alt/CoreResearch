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
 * Send real-time in-app notifications to Students, Advisers, and Panelists
 */
const sendDefenseNotifications = async (schedules) => {
  if (!Array.isArray(schedules) || schedules.length === 0) return;

  for (const s of schedules) {
    try {
      const scheduleId = s.id || `sch-${Date.now()}`;
      const title = s.projectTitle || 'Research Defense';
      const dateStr = s.date || '';
      const timeStr = s.startTime || s.time || '';
      const venueStr = s.venue || s.location ? ` at ${s.venue || s.location}` : '';
      const defType = (s.defenseType === 'final_defense' || s.type === 'final_defense') ? 'Final Defense' : 'Proposal Defense';

      // 1. Resolve student members
      let studentIds = s.memberIds || [];
      let adviserId = s.adviserId;
      let panelistIds = s.panelistIds || (s.panelists || []).map(p => p.id || p.uid).filter(Boolean);

      // If studentIds is empty, query Firestore or MongoDB research_groups
      if ((!studentIds || studentIds.length === 0) && s.projectId) {
        if (db) {
          try {
            const groupDoc = await db.collection('research_groups').doc(s.projectId).get();
            if (groupDoc.exists) {
              const gData = groupDoc.data();
              studentIds = gData.memberIds || [];
              if (!adviserId) adviserId = gData.adviserId;
            }
          } catch (e) {
            console.warn('[ScheduleController] Firestore group lookup warning:', e.message);
          }
        }
      }

      const notifsToCreate = [];

      // A. Notifications for student members
      if (Array.isArray(studentIds)) {
        for (const sid of studentIds) {
          if (!sid) continue;
          notifsToCreate.push({
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userId: sid,
            title: `${defType} Scheduled`,
            message: `Your ${defType.toLowerCase()} presentation for "${title}" is scheduled on ${dateStr} at ${timeStr}${venueStr}.`,
            type: 'schedule',
            read: false,
            link: '/schedules',
            linkUrl: '/schedules',
            relatedId: scheduleId,
            createdAt: new Date().toISOString()
          });
        }
      }

      // B. Notification for group adviser
      if (adviserId) {
        notifsToCreate.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: adviserId,
          title: `Advisee ${defType} Scheduled`,
          message: `The ${defType.toLowerCase()} presentation for your advisee group "${title}" is scheduled on ${dateStr} at ${timeStr}${venueStr}.`,
          type: 'schedule',
          read: false,
          link: '/schedules',
          linkUrl: '/schedules',
          relatedId: scheduleId,
          createdAt: new Date().toISOString()
        });
      }

      // C. Notifications for assigned panelists
      if (Array.isArray(panelistIds)) {
        for (const pid of panelistIds) {
          if (!pid || pid === adviserId) continue;
          notifsToCreate.push({
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userId: pid,
            title: `Defense Panelist Assignment`,
            message: `You have been assigned as a panelist for "${title}" on ${dateStr} at ${timeStr}${venueStr}.`,
            type: 'schedule',
            read: false,
            link: '/schedules',
            linkUrl: '/schedules',
            relatedId: scheduleId,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Write to Firestore / Mock DB
      if (db) {
        const batch = db.batch();
        for (const n of notifsToCreate) {
          batch.set(db.collection('notifications').doc(n.id), n);
        }
        await batch.commit();
      } else if (isDevMockMode) {
        if (!mockFirestoreDb.has('notifications')) mockFirestoreDb.set('notifications', new Map());
        const map = mockFirestoreDb.get('notifications');
        for (const n of notifsToCreate) {
          map.set(n.id, n);
        }
      }
      console.log(`[ScheduleController] Created ${notifsToCreate.length} defense notifications for schedule ${scheduleId}`);
    } catch (notifErr) {
      console.error('[ScheduleController] sendDefenseNotifications error:', notifErr.message);
    }
  }
};

/**
 * Schedule defense presentation (Admin only)
 */
export const createSchedule = async (req, res) => {
  try {
    const { projectId, projectTitle, studentName, defenseType, date, startTime, endTime, venue, panelistIds, adviserId, adviserName, memberIds } = req.body;

    if (!projectTitle || !date || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'projectTitle, date, and startTime are required.'
      });
    }

    // Enforce Section 8.1 & 8.3: Group Adviser CANNOT be Panelist
    if (adviserId && Array.isArray(panelistIds) && panelistIds.includes(adviserId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Panelist Assignment',
        message: 'Invalid Panelist Assignment: The assigned adviser of this research group cannot serve as a panelist for the same group.'
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
      panelists: createdSchedule.panelists,
      adviserId,
      adviserName,
      memberIds: memberIds || [],
      status: createdSchedule.status,
      createdAt: createdSchedule.createdAt
    };

    // Sync to Firestore schedules and defense_schedules
    if (db) {
      try {
        await Promise.all([
          db.collection('schedules').doc(newScheduleId).set(responseData, { merge: true }),
          db.collection('defense_schedules').doc(newScheduleId).set(responseData, { merge: true })
        ]);
      } catch (e) {
        console.warn('[ScheduleController] Firestore create sync warning:', e.message);
      }
    }

    // Dispatch notifications to Students, Adviser, and Panelists
    sendDefenseNotifications([responseData]).catch(err => {
      console.error('[ScheduleController] Failed to dispatch notifications:', err.message);
    });

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

    // Auto-archive past defense schedules
    // If today is Oct 15, schedules for Oct 14 or earlier are automatically marked as archived
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    try {
      if (mongoose.connection.readyState === 1) {
        // Auto-archive past schedules in MongoDB
        await MongoSchedule.updateMany(
          { date: { $lt: todayStr }, status: { $ne: 'archived' } },
          { $set: { status: 'archived' } }
        );

        // By default, do not return archived schedules unless explicitly requested
        const queryFilter = req.query.includeArchived === 'true' 
          ? {} 
          : { status: { $ne: 'archived' } };

        const mongoDocs = await MongoSchedule.find(queryFilter).lean();
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
        }
      }
    } catch (mongoErr) {
      console.warn('[ScheduleController] MongoDB get schedules warning:', mongoErr.message);
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

    if (db) {
      try {
        await Promise.all([
          db.collection('schedules').doc(id).set({ status, updatedAt: new Date().toISOString() }, { merge: true }),
          db.collection('defense_schedules').doc(id).set({ status, updatedAt: new Date().toISOString() }, { merge: true })
        ]);
      } catch (e) {
        console.warn('[ScheduleController] Firestore status sync warning:', e.message);
      }
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

    // Enforce Section 8.1 & 8.3: Group Adviser CANNOT be Panelist
    if (adviserId && Array.isArray(panelists) && panelists.some(p => (p.id || p.uid) === adviserId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Panelist Assignment',
        message: 'Invalid Panelist Assignment: The assigned adviser of this research group cannot serve as a panelist for the same group.'
      });
    }

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

    // Sync to Firestore / Dev store
    try {
      if (db) {
        const updatePayload = {
          date,
          time: startTime,
          startTime,
          endTime,
          venue,
          location: venue,
          adviserId,
          adviserName,
          panelists: panelists || [],
          panelistIds: (panelists || []).map(p => p.id || p.uid).filter(Boolean),
          panelistNames: (panelists || []).map(p => p.name || p.fullName).filter(Boolean),
          updatedAt: new Date().toISOString()
        };
        await Promise.all([
          db.collection('schedules').doc(id).set(updatePayload, { merge: true }),
          db.collection('defense_schedules').doc(id).set(updatePayload, { merge: true })
        ]);
        mongoSuccess = true;
      } else if (isDevMockMode) {
        seedMockSchedulesIfEmpty();
        const map = mockFirestoreDb.get('schedules');
        if (map && map.has(id)) {
          const existing = map.get(id);
          map.set(id, { ...existing, date, startTime, endTime, venue, adviserId, adviserName, panelists });
        }
        mongoSuccess = true;
      }
    } catch (fsErr) {
      console.warn('[ScheduleController] Firestore sync error:', fsErr.message);
    }

    if (!mongoSuccess && !updatedSchedule) {
      return res.status(503).json({ success: false, error: 'Service Unavailable', message: 'Could not update schedule' });
    }

    return res.status(200).json({
      success: true,
      message: `Schedule updated successfully.`,
      data: updatedSchedule || { id, date, startTime, endTime, venue, adviserId, adviserName, panelists }
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
      const mongoDocs = await MongoSchedule.find({ date: config.date, status: { $nin: ['cancelled', 'archived'] } }).lean();
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

    // Enforce Section 8.1 & 8.3: Group Adviser CANNOT be Panelist
    for (const s of schedules) {
      if (s.adviserId && Array.isArray(s.panelists) && s.panelists.some(p => (p.id || p.uid) === s.adviserId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Panelist Assignment',
          message: `Invalid Panelist Assignment: The assigned adviser (${s.adviserName || s.adviserId}) cannot serve as a panelist for group "${s.projectTitle || s.projectId}".`
        });
      }
    }

    let mongoSuccess = false;
    let createdCount = 0;

    const docsToInsert = schedules.map(s => ({
      id: s.id || `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId: s.projectId,
      projectTitle: s.projectTitle,
      date: s.date,
      time: s.startTime, // Keeping 'time' for backward compatibility
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.venue,
      venue: s.venue,
      type: s.defenseType === 'proposal_defense' ? 'proposal' : 'final_defense',
      defenseType: s.defenseType || 'proposal_defense',
      status: 'scheduled',
      adviserId: s.adviserId,
      adviserName: s.adviserName,
      panelists: s.panelists || [],
      panelistIds: (s.panelists || []).map(p => p.id || p.uid).filter(Boolean),
      panelistNames: (s.panelists || []).map(p => p.name || p.fullName).filter(Boolean),
      memberIds: s.memberIds || [],
      createdAt: new Date().toISOString()
    }));

    if (mongoose.connection.readyState === 1) {
      const projectIds = schedules.map(s => s.projectId);
      const defenseTypes = [...new Set(schedules.map(s => s.defenseType === 'proposal_defense' ? 'proposal' : 'final_defense'))];
      
      // Clear existing schedules for these groups and defense types to prevent duplicates
      await MongoSchedule.deleteMany({ 
        projectId: { $in: projectIds },
        type: { $in: defenseTypes }
      });

      await MongoSchedule.insertMany(docsToInsert);
      mongoSuccess = true;
      createdCount = docsToInsert.length;
    }

    // Also sync to Firestore / Dev store
    try {
      if (db) {
        const batch = db.batch();
        docsToInsert.forEach(d => {
          const docRef1 = db.collection('schedules').doc(d.id);
          const docRef2 = db.collection('defense_schedules').doc(d.id);
          batch.set(docRef1, d, { merge: true });
          batch.set(docRef2, d, { merge: true });
        });
        await batch.commit();
        mongoSuccess = true;
        createdCount = docsToInsert.length;
      } else if (isDevMockMode) {
        seedMockSchedulesIfEmpty();
        const map = mockFirestoreDb.get('schedules') || new Map();
        docsToInsert.forEach(d => map.set(d.id, d));
        mockFirestoreDb.set('schedules', map);
        mongoSuccess = true;
        createdCount = docsToInsert.length;
      }
    } catch (fsErr) {
      console.warn('[ScheduleController] Firestore bulk sync warning:', fsErr.message);
    }

    if (!mongoSuccess) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not save schedules to authoritative database.'
      });
    }

    // Dispatch notifications to Students, Advisers, and Panelists
    sendDefenseNotifications(docsToInsert).catch(err => {
      console.error('[ScheduleController] Failed to dispatch bulk notifications:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: `${createdCount} schedules successfully generated.`,
      data: docsToInsert
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
      if (db) {
        try {
          await Promise.all([
            db.collection('schedules').doc(id).delete(),
            db.collection('defense_schedules').doc(id).delete()
          ]);
        } catch (e) {
          console.warn('[ScheduleController] Firestore delete sync warning:', e.message);
        }
      }
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
