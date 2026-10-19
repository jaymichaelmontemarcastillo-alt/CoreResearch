import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUserListCandidateFilter } from './userListQuery.js';

test('pushes role and pending-approval constraints into the Mongo query', () => {
  const filter = buildUserListCandidateFilter({ role: 'faculty', status: 'pending' });

  assert.deepEqual(filter, {
    $and: [
      { role: { $in: ['adviser', 'research_coordinator', 'panelist', 'faculty'] } },
      { role: { $nin: ['admin', 'research_coordinator'] } },
      { status: { $nin: ['approved', 'active', 'rejected'] } },
      { is_approved: { $ne: true } },
      { $or: [{ status: 'pending' }, { is_approved: false }] }
    ]
  });
});

test('escapes search text and includes legacy fields used by profile normalization', () => {
  const filter = buildUserListCandidateFilter({ search: '.*' });
  const search = filter.$and[0].$or;

  assert(search.some(condition => condition.fullName?.source === '\\.\\*'));
  assert(search.some(condition => condition.courseId?.source === '\\.\\*'));
  assert(search.some(condition => condition.section?.source === '\\.\\*'));
});

test('includes aliases for program codes derived from legacy profile fields', () => {
  const filter = buildUserListCandidateFilter({ program: 'BSCS' });
  const programFilter = filter.$and[0].$or;

  assert(programFilter.some(condition => condition.courseId === 'bscs'));
  assert(programFilter.some(condition => condition.program instanceof RegExp));
});

test('includes legacy specialization names as candidate matches', () => {
  const filter = buildUserListCandidateFilter({ specialization: 'WMAD' });
  const specializationFilter = filter.$and[0].$or;

  assert(specializationFilter.some(
    condition => condition.programSpecialization?.source === 'WEB AND MOBILE'
  ));
  assert(specializationFilter.some(
    condition => condition.major?.source === 'WEB AND MOBILE'
  ));
  assert(specializationFilter.some(condition => condition.role === 'student'));
});
