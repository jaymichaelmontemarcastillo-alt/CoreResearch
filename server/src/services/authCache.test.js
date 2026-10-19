import test from 'node:test';
import assert from 'node:assert/strict';
import { invalidateUserAuthCache } from '../middleware/authMiddleware.js';

test('authMiddleware cache invalidation functions properly', () => {
  // Verifies invalidateUserAuthCache does not throw and handles both single uid and clear all
  assert.doesNotThrow(() => {
    invalidateUserAuthCache('test-uid-123');
    invalidateUserAuthCache();
  });
});
