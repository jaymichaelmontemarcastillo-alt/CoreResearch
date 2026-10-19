import mongoose from 'mongoose';
import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { Document } from '../models/Document.js';

const privilegedRoles = ['admin', 'research_coordinator', 'coordinator'];

const hasUid = (values, uid) => Array.isArray(values) && values.includes(uid);

const isResourceParticipant = (record, user) => {
  const uid = user.uid;
  if (
    record.studentId === uid ||
    record.submittedByUid === uid ||
    record.ownerId === uid ||
    record.ownerUid === uid ||
    record.adviserId === uid ||
    record.adviser === uid ||
    record.reviewerId === uid ||
    record.authorUid === uid ||
    hasUid(record.memberIds, uid) ||
    hasUid(record.authors, uid) ||
    hasUid(record.panelistIds, uid) ||
    hasUid(record.adviserIds, uid)
  ) {
    return true;
  }

  if (Array.isArray(record.panelists) && hasUid(record.panelists, uid)) return true;

  for (const field of ['members', 'panelists']) {
    if (Array.isArray(record[field]) && record[field].some((member) =>
      member?.uid === uid || member?.id === uid || member?.studentId === uid
    )) {
      return true;
    }
  }

  return false;
};

const withTimeout = (promise, ms = 2000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), ms))
  ]);
};

const getFirestoreRecord = async (collectionName, id) => {
  try {
    if (isDevMockMode) {
      const record = mockFirestoreDb.get(collectionName)?.get(id);
      return record ? { id, ...record } : null;
    }
    if (!db) return null;

    const snapshot = await withTimeout(db.collection(collectionName).doc(id).get(), 1500);
    return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (err) {
    return null;
  }
};

export const canAccessProject = async (user, projectId, additionalRecord = null) => {
  if (!user?.uid || !projectId) return false;
  if (privilegedRoles.includes(user.role)) return true;
  if (additionalRecord && isResourceParticipant(additionalRecord, user)) return true;

  const records = additionalRecord ? [additionalRecord] : [];

  // 1. Check MongoDB Document (fast and resilient)
  let mongoDoc = null;
  if (mongoose.connection.readyState === 1) {
    try {
      mongoDoc = await Document.findOne({ id: projectId }).lean();
      if (mongoDoc) records.push(mongoDoc);
    } catch (e) {}
  }

  if (records.some((record) => isResourceParticipant(record, user))) return true;

  // 2. Resolve group and schedule from MongoDB (fast & authoritative)
  const groupIds = new Set(records.map((record) => record.groupId).filter(Boolean));
  if (records.some((record) => record.id === projectId)) {
    groupIds.add(projectId);
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const ownerIds = [
        ...records.map((r) => r.ownerId),
        ...records.map((r) => r.ownerUid),
        ...(mongoDoc?.authors || [])
      ].filter(Boolean);

      const orClauses = [];
      if (groupIds.size > 0) {
        orClauses.push({ id: { $in: Array.from(groupIds) } });
      }
      if (ownerIds.length > 0) {
        orClauses.push({ memberIds: { $in: ownerIds } });
        orClauses.push({ 'members.uid': { $in: ownerIds } });
        orClauses.push({ 'members.id': { $in: ownerIds } });
      }

      if (orClauses.length > 0) {
        const matchedGroups = await mongoose.connection.db.collection('researchgroups').find({ $or: orClauses }).toArray();
        for (const mg of matchedGroups) {
          const isRelatedToDoc = (
            (mg.id && groupIds.has(mg.id)) ||
            (mongoDoc && ownerIds.some(oid => hasUid(mg.memberIds, oid) || mg.members?.some(m => m?.uid === oid || m?.id === oid))) ||
            (records.some(r => r.groupId === mg.id || r.id === mg.id || r.workspaceId === mg.workspaceId))
          );

          if (isRelatedToDoc) {
            records.push(mg);
            if (mg.id) groupIds.add(mg.id);

            // Backfill MongoDB document if missing groupId or full authors
            if (mongoDoc && (!mongoDoc.groupId || !mongoDoc.authors || mongoDoc.authors.length <= 1)) {
              const allMembers = Array.isArray(mg.memberIds) ? mg.memberIds : [];
              await Document.updateOne(
                { id: mongoDoc.id },
                { $set: { groupId: mg.id, authors: allMembers, adviser: mg.adviserId || mongoDoc.adviser } }
              );
            }
          }
        }
      }
    } catch (e) {}
  }

  if (records.some((record) => isResourceParticipant(record, user))) return true;

  // 3. Early Schedule check for adviser and panelist via MongoDB
  if (['adviser', 'panelist'].includes(user.role) && mongoose.connection.readyState === 1) {
    try {
      const { Schedule } = await import('../models/Schedule.js');
      const scheduleProjectIds = new Set([
        projectId,
        ...records.map((record) => record.projectId).filter(Boolean),
        ...groupIds,
      ]);
      const schedule = await Schedule.findOne({ projectId: { $in: Array.from(scheduleProjectIds) } }).lean();
      if (schedule) {
        if (user.role === 'adviser' && (schedule.adviserId === user.uid || schedule.adviser === user.uid)) return true;
        if (
          user.role === 'panelist' &&
          Array.isArray(schedule.panelists) &&
          schedule.panelists.some((panelist) => panelist?.id === user.uid || panelist?.uid === user.uid)
        ) return true;
      }
    } catch (e) {}
  }

  // 4. Fallback to Firestore checks concurrently with low timeout if MongoDB has no record
  const collectionNames = [
    'research_groups',
    'research_projects',
    'manuscript_workspaces',
    'proposals',
    'manuscript_drafts',
    'documents'
  ];

  try {
    const firestoreResults = await Promise.allSettled(
      collectionNames.map((col) => getFirestoreRecord(col, projectId))
    );
    for (const res of firestoreResults) {
      if (res.status === 'fulfilled' && res.value) {
        records.push(res.value);
        if (res.value.groupId) groupIds.add(res.value.groupId);
      }
    }
  } catch (e) {}

  if (db && !isDevMockMode) {
    try {
      const wsPromise = db.collection('manuscript_workspaces').where('documentId', '==', projectId).limit(1).get();
      const wsSnap = await withTimeout(wsPromise, 800);
      if (!wsSnap.empty) {
        const wsDoc = wsSnap.docs[0];
        const wsData = { id: wsDoc.id, ...wsDoc.data() };
        records.push(wsData);
        if (wsData.groupId) groupIds.add(wsData.groupId);
      }
    } catch (e) {}
  }

  if (records.some((record) => isResourceParticipant(record, user))) return true;

  if (groupIds.size > 0) {
    try {
      const groupResults = await Promise.allSettled(
        Array.from(groupIds).map((gid) => getFirestoreRecord('research_groups', gid))
      );
      for (const res of groupResults) {
        if (res.status === 'fulfilled' && res.value && isResourceParticipant(res.value, user)) {
          return true;
        }
      }
    } catch (e) {}
  }

  return false;
};

export const isPrivilegedRole = (role) => privilegedRoles.includes(role);
