import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMock = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'user-1' } },
  db: {}
}));
const firestoreMock = vi.hoisted(() => ({
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn()
}));
const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
}));

vi.mock('../firebase/firebase', () => firebaseMock);
vi.mock('firebase/firestore', () => firestoreMock);
vi.mock('./api', () => ({ default: apiMock }));

import { userService } from './user.service';

describe('userService.updateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes self-profile changes through the backend without a Firestore write', async () => {
    await userService.updateUser('user-1', { fullName: 'Updated Name' });

    expect(apiMock.patch).toHaveBeenCalledWith(
      '/users/me',
      expect.objectContaining({ fullName: 'Updated Name' })
    );
    expect(firestoreMock.setDoc).not.toHaveBeenCalled();
    expect(firestoreMock.updateDoc).not.toHaveBeenCalled();
  });

  it('routes other-user changes through the admin endpoint and propagates failures', async () => {
    apiMock.patch.mockRejectedValue(new Error('API unavailable'));

    await expect(userService.updateUser('user-2', { role: 'adviser' }))
      .rejects.toThrow('API unavailable');

    expect(apiMock.patch).toHaveBeenCalledWith(
      '/users/user-2',
      expect.objectContaining({ role: 'adviser' })
    );
    expect(firestoreMock.setDoc).not.toHaveBeenCalled();
    expect(firestoreMock.updateDoc).not.toHaveBeenCalled();
  });
});
