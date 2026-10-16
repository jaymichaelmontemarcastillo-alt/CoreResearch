import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';

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
    const updatedUser = await User.findOneAndUpdate(
      { uid },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updatedUser) return null;

    const profile = toProfileObject(updatedUser);
    if (!isDevMockMode && !db) {
      throw partialSyncError('MongoDB was updated, but Firestore is unavailable for user profile synchronization.');
    }
    if (!isDevMockMode) {
      try {
        await db.collection('users').doc(uid).set(profile, { merge: true });
      } catch (error) {
        throw partialSyncError(`MongoDB was updated, but the Firestore user profile could not be synchronized: ${error.message}`);
      }
    }
    mockUsersDb.set(uid, profile);
    return profile;
  }

  if (isDevMockMode) {
    const existingProfile = mockUsersDb.get(uid);
    if (!existingProfile) return null;
    const profile = { ...existingProfile, ...updates, uid };
    mockUsersDb.set(uid, profile);
    return profile;
  }

  if (db) {
    const userRef = db.collection('users').doc(uid);
    const existingProfile = await userRef.get();
    if (!existingProfile.exists) return null;
    const profile = { ...existingProfile.data(), ...updates, uid };
    await userRef.set(profile, { merge: true });
    return profile;
  }

  throw new Error('No user profile store is available.');
};
