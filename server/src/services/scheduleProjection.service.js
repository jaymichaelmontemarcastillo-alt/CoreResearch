import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { toDefenseScheduleProjection } from './scheduleProjection.js';

export { toDefenseScheduleProjection };

export const syncDefenseScheduleProjections = async (schedules, deletedIds = []) => {
  const operations = [
    ...deletedIds.map(id => ({ id, deleted: true })),
    ...schedules.map(schedule => ({
      id: schedule.id,
      data: toDefenseScheduleProjection(schedule)
    }))
  ];

  if (db && !isDevMockMode) {
    for (let index = 0; index < operations.length; index += 450) {
      const batch = db.batch();
      operations.slice(index, index + 450).forEach(operation => {
        const ref = db.collection('defense_schedules').doc(operation.id);
        if (operation.deleted) {
          batch.delete(ref);
        } else {
          batch.set(ref, operation.data, { merge: true });
        }
      });
      await batch.commit();
    }
    return;
  }

  if (isDevMockMode) {
    const schedulesById = mockFirestoreDb.get('defense_schedules') || new Map();
    operations.forEach(operation => {
      if (operation.deleted) {
        schedulesById.delete(operation.id);
      } else {
        schedulesById.set(operation.id, operation.data);
      }
    });
    mockFirestoreDb.set('defense_schedules', schedulesById);
    return;
  }

  throw new Error('Firestore is unavailable for defense schedule projection synchronization.');
};
