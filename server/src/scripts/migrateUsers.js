import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { db } from '../config/firebaseAdmin.js';
import { connectDB } from '../config/db.js';

const migrateUsers = async () => {
  console.log('[Migration] Starting Users Migration from Firebase to MongoDB...');
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.error('[Migration] ERROR: MongoDB not connected.');
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;

  try {
    console.log('[Migration] Fetching users from Firebase...');
    const usersSnap = await db.collection('users').get();
    
    if (usersSnap.empty) {
      console.log('[Migration] No users found in Firebase.');
      process.exit(0);
    }

    console.log(`[Migration] Found ${usersSnap.size} users in Firebase. Migrating...`);

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      
      try {
        await User.findOneAndUpdate(
          { uid: doc.id }, // Match by Firebase UID
          {
            $set: {
              uid: doc.id,
              email: data.email || '',
              fullName: data.fullName || '',
              role: data.role || 'student',
              department: data.department || '',
              status: data.status || 'active',
              specialization: data.specialization || [],
              researchInterests: data.researchInterests || [],
              expertise: data.expertise || [],
              selectedExpertise: data.selectedExpertise || [],
              keywords: data.keywords || [],
              is_approved: data.is_approved !== false, // Default true unless explicitly false
              is_active: data.is_active !== false,
              createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
              updatedAt: data.updatedAt ? new Date(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt) : new Date(),
            }
          },
          { upsert: true, new: true, runValidators: false } // runValidators false to bypass strict required fields if old data is messy
        );
        successCount++;
        console.log(`  -> Migrated user: ${data.fullName || data.email || doc.id}`);
      } catch (err) {
        console.error(`  -> Failed to migrate user ${doc.id}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n[Migration] Users Migration Complete!`);
    console.log(`  - Successfully Migrated: ${successCount}`);
    console.log(`  - Failed/Skipped: ${errorCount}`);

    process.exit(0);
  } catch (error) {
    console.error('[Migration] Fatal Error during user migration:', error);
    process.exit(1);
  }
};

migrateUsers();
