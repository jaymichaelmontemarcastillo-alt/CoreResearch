import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';
import { invalidateUserAuthCache } from '../middleware/authMiddleware.js';

const toProfileObject = (profile) => {
  const data = typeof profile.toObject === 'function' ? profile.toObject() : profile;
  const profileData = { ...data };
  delete profileData._id;
  delete profileData.__v;
  return profileData;
};

const partialSyncError = (message) => {
  const error = new Error(message);
  error.code = 'PARTIAL_USER_PROFILE_SYNC';
  return error;
};

export const updateUserProfileStores = async (uid, updates) => {
  if (mongoose.connection.readyState === 1) {
    let updatedUser = await User.findOneAndUpdate(
      { uid },
      { $set: updates },
      { new: true, runValidators: true }
    );

    // If not found in MongoDB, check if it exists in Firestore to recover and upsert
    if (!updatedUser && db && !isDevMockMode) {
      try {
        const fsDoc = await db.collection('users').doc(uid).get();
        if (fsDoc.exists) {
          const fullData = { ...fsDoc.data(), ...updates, uid };
          updatedUser = await User.findOneAndUpdate(
            { uid },
            { $set: fullData },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      } catch (fsErr) {
        console.warn('[userProfilePersistence] Firestore fallback read warning:', fsErr.message);
      }
    }

    if (!updatedUser) return null;

    const profile = toProfileObject(updatedUser);
    if (!isDevMockMode && db) {
      try {
        await db.collection('users').doc(uid).set(profile, { merge: true });
      } catch (error) {
        console.warn(`[userProfilePersistence] Firestore user profile sync warning: ${error.message}`);
      }
    } else if (!isDevMockMode && !db) {
      console.warn('[userProfilePersistence] MongoDB updated, but Firestore Admin is unavailable for synchronization.');
    }
    mockUsersDb.set(uid, profile);
    invalidateUserAuthCache(uid);
    return profile;
  }

  if (isDevMockMode) {
    const existingProfile = mockUsersDb.get(uid);
    if (!existingProfile) return null;
    const profile = { ...existingProfile, ...updates, uid };
    mockUsersDb.set(uid, profile);
    invalidateUserAuthCache(uid);
    return profile;
  }

  if (db) {
    const userRef = db.collection('users').doc(uid);
    const existingProfile = await userRef.get();
    if (!existingProfile.exists) return null;
    const profile = { ...existingProfile.data(), ...updates, uid };
    await userRef.set(profile, { merge: true });
    invalidateUserAuthCache(uid);
    return profile;
  }

  throw new Error('No user profile store is available.');
};
