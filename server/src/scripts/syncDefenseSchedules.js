import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { db, isDevMockMode } from '../config/firebaseAdmin.js';
import { Schedule } from '../models/Schedule.js';
import { syncDefenseScheduleProjections } from '../services/scheduleProjection.service.js';

const syncExistingSchedules = async () => {
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is required to backfill defense schedule projections.');
  }
  if (!db || isDevMockMode) {
    throw new Error('A live Firebase Admin connection is required to backfill defense schedule projections.');
  }

  let batch = [];
  let syncedCount = 0;
  const cursor = Schedule.find().lean().cursor();
  for await (const schedule of cursor) {
    batch.push(schedule);
    if (batch.length === 450) {
      await syncDefenseScheduleProjections(batch);
      syncedCount += batch.length;
      batch = [];
    }
  }
  if (batch.length > 0) {
    await syncDefenseScheduleProjections(batch);
    syncedCount += batch.length;
  }

  console.log(`[ScheduleProjection] Synchronized ${syncedCount} MongoDB schedules to Firestore.`);
};

syncExistingSchedules()
  .catch(error => {
    console.error('[ScheduleProjection] Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
