import mongoose from 'mongoose';
import { db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';
import { Schedule as MongoSchedule } from '../models/Schedule.js';
import { generateTimeSlots } from '../services/schedulingService.js';
import {
  syncDefenseScheduleProjections,
  toDefenseScheduleProjection
} from '../services/scheduleProjection.service.js';

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
    const {
      id,
      projectId,
      projectTitle,
      studentName,
      defenseType,
      date,
      startTime,
      endTime,
      venue,
      panelistIds: requestedPanelistIds,
      panelists,
      adviserId,
      adviserName,
      memberIds,
      attempt,
      defenseStage,
      notes,
      resultStatus
    } = req.body;
    const panelistIds = requestedPanelistIds || (panelists || []).map(panelist => panelist.id || panelist.uid).filter(Boolean);

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

    const newScheduleId = id || `sch-${Date.now()}`;
    
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
          studentName: studentName || 'Student Researcher',
          memberIds: memberIds || [],
          date,
          time: startTime,
          endTime: endTime || '11:00',
          location: venue || 'Conference Room A',
          type: defenseType === 'proposal_defense' ? 'proposal' : 'final_defense',
          status: 'scheduled',
          adviserId,
          adviserName,
          panelists: panelistsList,
          attempt: attempt || 1,
          defenseStage: defenseStage || (attempt > 1 ? `Re-defense (Attempt ${attempt})` : 'Title Defense'),
          notes,
          resultStatus
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

    const responseData = toDefenseScheduleProjection(createdSchedule);
    try {
      await syncDefenseScheduleProjections([createdSchedule]);
    } catch (syncError) {
      console.error('[ScheduleController] Firestore schedule projection sync failed:', syncError.message);
      return res.status(503).json({
        success: false,
        error: 'Partial Persistence',
        message: 'The schedule was saved in MongoDB, but its Firestore projection could not be synchronized.',
        scheduleId: createdSchedule.id
      });
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

    // Auto-archive past defense schedules
    // If today is Oct 15, schedules for Oct 14 or earlier are automatically marked as archived
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Service Unavailable', message: 'MongoDB is required to read schedules.' });
    }

    const pastSchedules = await MongoSchedule.find({
      date: { $lt: todayStr },
      status: { $ne: 'archived' }
    }).lean();
    if (pastSchedules.length > 0) {
      await MongoSchedule.updateMany(
        { id: { $in: pastSchedules.map(schedule => schedule.id) } },
        { $set: { status: 'archived' } }
      );
      await syncDefenseScheduleProjections(
        pastSchedules.map(schedule => ({ ...schedule, status: 'archived' }))
      );
    }

    const queryFilter = req.query.includeArchived === 'true'
      ? {}
      : { status: { $ne: 'archived' } };
    const mongoDocs = await MongoSchedule.find(queryFilter).lean();
    list = mongoDocs.map(toDefenseScheduleProjection);
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
    const allowedStatuses = ['scheduled', 'rescheduled', 'completed', 'cancelled', 'failed', 'for_redefense', 'archived'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid schedule status.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'MongoDB is required to update schedules.'
      });
    }

    let updatedSchedule;
    try {
      updatedSchedule = await MongoSchedule.findOneAndUpdate(
        { id },
        { $set: { status } },
        { new: true, runValidators: true }
      );
    } catch (mongoErr) {
      console.error('[ScheduleController] MongoDB update schedule error:', mongoErr.message);
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not update schedule in authoritative database.'
      });
    }

    if (!updatedSchedule) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Schedule not found.' });
    }

    try {
      await syncDefenseScheduleProjections([updatedSchedule]);
    } catch (syncError) {
      console.error('[ScheduleController] Firestore schedule projection sync failed:', syncError.message);
      return res.status(503).json({
        success: false,
        error: 'Partial Persistence',
        message: 'The schedule status was saved in MongoDB, but its Firestore projection could not be synchronized.',
        scheduleId: updatedSchedule.id
      });
    }

    return res.status(200).json({
      success: true,
      message: `Schedule status updated to '${status}'.`,
      data: toDefenseScheduleProjection(updatedSchedule)
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
    const { date, startTime, endTime, venue, adviserId, adviserName, panelists, status, attempt, defenseStage, notes, resultStatus } = req.body;
    const allowedStatuses = ['scheduled', 'rescheduled', 'completed', 'cancelled', 'failed', 'for_redefense', 'archived'];

    // Enforce Section 8.1 & 8.3: Group Adviser CANNOT be Panelist
    if (adviserId && Array.isArray(panelists) && panelists.some(p => (p.id || p.uid) === adviserId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Panelist Assignment',
        message: 'Invalid Panelist Assignment: The assigned adviser of this research group cannot serve as a panelist for the same group.'
      });
    }
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid schedule status.' });
    }
    if (panelists !== undefined && !Array.isArray(panelists)) {
      return res.status(400).json({ success: false, error: 'Bad Request', message: 'Panelists must be an array.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Service Unavailable', message: 'MongoDB is required to update schedules.' });
    }

    const updates = {};
    if (date !== undefined) updates.date = date;
    if (startTime !== undefined) updates.time = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (venue !== undefined) updates.location = venue;
    if (adviserId !== undefined) updates.adviserId = adviserId;
    if (adviserName !== undefined) updates.adviserName = adviserName;
    if (panelists !== undefined) {
      updates.panelists = panelists.map(panelist => ({
        id: panelist.id || panelist.uid,
        name: panelist.name || panelist.fullName,
        email: panelist.email || '',
        role: panelist.role || 'panelist'
      }));
    }
    if (status !== undefined) updates.status = status;
    if (attempt !== undefined) updates.attempt = attempt;
    if (defenseStage !== undefined) updates.defenseStage = defenseStage;
    if (notes !== undefined) updates.notes = notes;
    if (resultStatus !== undefined) updates.resultStatus = resultStatus;

    const updatedSchedule = await MongoSchedule.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updatedSchedule) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Schedule not found.' });
    }

    try {
      await syncDefenseScheduleProjections([updatedSchedule]);
    } catch (syncError) {
      console.error('[ScheduleController] Firestore schedule projection sync failed:', syncError.message);
      return res.status(503).json({
        success: false,
        error: 'Partial Persistence',
        message: 'The schedule was updated in MongoDB, but its Firestore projection could not be synchronized.',
        scheduleId: updatedSchedule.id
      });
    }

    return res.status(200).json({
      success: true,
      message: `Schedule updated successfully.`,
      data: toDefenseScheduleProjection(updatedSchedule)
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

    const docsToInsert = schedules.map(s => ({
      id: s.id || `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId: s.projectId,
      projectTitle: s.projectTitle,
      studentName: s.studentName || 'Student Researcher',
      memberIds: s.memberIds || [],
      date: s.date,
      time: s.startTime, // Keeping 'time' for backward compatibility
      endTime: s.endTime,
      location: s.venue,
      type: s.defenseType === 'proposal_defense' ? 'proposal' : 'final_defense',
      status: 'scheduled',
      adviserId: s.adviserId,
      adviserName: s.adviserName,
      panelists: (s.panelists || []).map(panelist => ({
        id: panelist.id || panelist.uid,
        name: panelist.name || panelist.fullName,
        email: panelist.email || '',
        role: panelist.role || 'panelist'
      })),
      attempt: s.attempt || 1,
      defenseStage: s.defenseStage || (s.attempt > 1 ? `Re-defense (Attempt ${s.attempt})` : 'Title Defense'),
      notes: s.notes,
      resultStatus: s.resultStatus
    }));

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Service Unavailable', message: 'MongoDB is required to create schedules.' });
    }

    const projectIds = schedules.map(s => s.projectId);
    const defenseTypes = [...new Set(schedules.map(s => s.defenseType === 'proposal_defense' ? 'proposal' : 'final_defense'))];
    const previousSchedules = await MongoSchedule.find({
      projectId: { $in: projectIds },
      type: { $in: defenseTypes }
    }).lean();
      
    // Replace prior schedules for the same groups and defense types.
    await MongoSchedule.deleteMany({
      projectId: { $in: projectIds },
      type: { $in: defenseTypes }
    });

    const insertedSchedules = await MongoSchedule.insertMany(docsToInsert);

    try {
      await syncDefenseScheduleProjections(insertedSchedules, previousSchedules.map(schedule => schedule.id));
    } catch (syncError) {
      console.error('[ScheduleController] Firestore bulk schedule projection sync failed:', syncError.message);
      return res.status(503).json({
        success: false,
        error: 'Partial Persistence',
        message: 'Schedules were saved in MongoDB, but their Firestore projections could not be synchronized.',
        scheduleIds: insertedSchedules.map(schedule => schedule.id)
      });
    }

    // Dispatch notifications to Students, Advisers, and Panelists
    const responseSchedules = insertedSchedules.map(toDefenseScheduleProjection);
    sendDefenseNotifications(responseSchedules).catch(err => {
      console.error('[ScheduleController] Failed to dispatch bulk notifications:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: `${responseSchedules.length} schedules successfully generated.`,
      data: responseSchedules
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
      try {
        await syncDefenseScheduleProjections([], [id]);
      } catch (syncError) {
        console.error('[ScheduleController] Firestore schedule projection delete failed:', syncError.message);
        return res.status(503).json({
          success: false,
          error: 'Partial Persistence',
          message: 'The schedule was deleted from MongoDB, but its Firestore projection could not be removed.',
          scheduleId: id
        });
      }
      return res.status(200).json({ success: true, message: 'Schedule deleted successfully' });
    }
    
    return res.status(503).json({ success: false, message: 'MongoDB not connected' });
  } catch (error) {
    console.error('[ScheduleController] deleteSchedule error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
