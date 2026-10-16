import assert from 'node:assert/strict';
import test from 'node:test';
import { toDefenseScheduleProjection } from './scheduleProjection.js';

test('maps Mongo schedule fields to the Firestore defense schedule shape', () => {
  const projection = toDefenseScheduleProjection({
    id: 'schedule-1',
    projectId: 'project-1',
    type: 'proposal',
    date: '2026-10-01',
    time: '10:00',
    endTime: '11:00',
    location: 'Room 1',
    panelists: [{ uid: 'panelist-1', fullName: 'Panel One' }],
    memberIds: ['student-1'],
    createdAt: new Date('2026-01-01T00:00:00Z')
  });

  assert.equal(projection.defenseType, 'proposal_defense');
  assert.equal(projection.startTime, '10:00');
  assert.equal(projection.venue, 'Room 1');
  assert.deepEqual(projection.panelistIds, ['panelist-1']);
  assert.deepEqual(projection.panelistNames, ['Panel One']);
  assert.deepEqual(projection.memberIds, ['student-1']);
  assert.equal(projection.createdAt, '2026-01-01T00:00:00.000Z');
});

test('omits undefined optional projection fields', () => {
  const projection = toDefenseScheduleProjection({
    id: 'schedule-2',
    projectId: 'project-2',
    type: 'final_defense',
    panelists: [{}]
  });

  const containsUndefined = value => {
    if (value === undefined) return true;
    if (Array.isArray(value)) return value.some(containsUndefined);
    if (value && typeof value === 'object') return Object.values(value).some(containsUndefined);
    return false;
  };

  assert.equal(containsUndefined(projection), false);
});
