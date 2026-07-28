import { db, isDevMockMode, mockFirestoreDb, mockUsersDb } from '../config/firebaseAdmin.js';

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

    const newSchedule = {
      id: `sch-${Date.now()}`,
      projectId: projectId || 'proj-501',
      projectTitle,
      studentName: studentName || 'Student Researcher',
      defenseType: defenseType || 'proposal_defense',
      date,
      startTime,
      endTime: endTime || '11:00',
      venue: venue || 'Conference Room A',
      panelistIds: panelistIds || [],
      panelistNames,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      seedMockSchedulesIfEmpty();
      const map = mockFirestoreDb.get('schedules');
      map.set(newSchedule.id, newSchedule);
    } else {
      await db.collection('schedules').doc(newSchedule.id).set(newSchedule);
    }

    return res.status(201).json({
      success: true,
      message: 'Defense presentation scheduled successfully.',
      data: newSchedule
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

    if (isDevMockMode) {
      seedMockSchedulesIfEmpty();
      const map = mockFirestoreDb.get('schedules');
      list = Array.from(map.values());
    } else {
      const snapshot = await db.collection('schedules').get();
      list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

    let updated = null;

    if (isDevMockMode) {
      seedMockSchedulesIfEmpty();
      const map = mockFirestoreDb.get('schedules');
      const sch = map.get(id);
      if (!sch) {
        return res.status(404).json({ success: false, error: 'Schedule not found' });
      }
      sch.status = status;
      map.set(id, sch);
      updated = sch;
    } else {
      const ref = db.collection('schedules').doc(id);
      await ref.update({ status });
      const doc = await ref.get();
      updated = { id: doc.id, ...doc.data() };
    }

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
