import mongoose from 'mongoose';
import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { Document } from '../models/Document.js';

const privilegedRoles = ['admin', 'research_coordinator'];

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

const getFirestoreRecord = async (collectionName, id) => {
  if (isDevMockMode) {
    const record = mockFirestoreDb.get(collectionName)?.get(id);
    return record ? { id, ...record } : null;
  }
  if (!db) return null;

  const snapshot = await db.collection(collectionName).doc(id).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const canAccessProject = async (user, projectId, additionalRecord = null) => {
  if (!user?.uid || !projectId) return false;
  if (privilegedRoles.includes(user.role)) return true;
  if (additionalRecord && isResourceParticipant(additionalRecord, user)) return true;

  const records = additionalRecord ? [additionalRecord] : [];
  const collectionNames = [
    'research_groups',
    'research_projects',
    'manuscript_workspaces',
    'proposals',
    'manuscript_drafts',
  ];

  for (const collectionName of collectionNames) {
    const record = await getFirestoreRecord(collectionName, projectId);
    if (record) records.push(record);
  }

  if (mongoose.connection.readyState === 1) {
    const document = await Document.findOne({ id: projectId }).lean();
    if (document) records.push(document);
  }

  if (records.some((record) => isResourceParticipant(record, user))) return true;

  const groupIds = new Set(records.map((record) => record.groupId).filter(Boolean));
  if (records.some((record) => record.id === projectId)) {
    groupIds.add(projectId);
  }

  for (const groupId of groupIds) {
    const group = await getFirestoreRecord('research_groups', groupId);
    if (group && isResourceParticipant(group, user)) return true;
  }

  if (['adviser', 'panelist'].includes(user.role) && mongoose.connection.readyState === 1) {
    const { Schedule } = await import('../models/Schedule.js');
    const scheduleProjectIds = new Set([
      projectId,
      ...records.map((record) => record.projectId).filter(Boolean),
      ...groupIds,
    ]);
    const schedule = await Schedule.findOne({ projectId: { $in: Array.from(scheduleProjectIds) } }).lean();
    if (schedule) {
      if (user.role === 'adviser' && schedule.adviserId === user.uid) return true;
      if (
        user.role === 'panelist' &&
        Array.isArray(schedule.panelists) &&
        schedule.panelists.some((panelist) => panelist?.id === user.uid || panelist?.uid === user.uid)
      ) return true;
    }
  }

  return false;
};

export const isPrivilegedRole = (role) => privilegedRoles.includes(role);
