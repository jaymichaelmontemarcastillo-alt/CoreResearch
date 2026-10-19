import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCurrentUser = {
  getIdToken: vi.fn(),
};

const authMock = vi.hoisted(() => ({
  auth: {
    currentUser: null as any,
    authStateReady: vi.fn(),
  },
}));

vi.mock('./firebase', () => authMock);

import api from './api';

describe('api service interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.auth.currentUser = null;
    authMock.auth.authStateReady.mockReset();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('core_research_dev_token');
    }
  });

  it('injects Bearer token when currentUser is present', async () => {
    mockCurrentUser.getIdToken.mockResolvedValue('test-firebase-token');
    authMock.auth.currentUser = mockCurrentUser;

    // Simulate request interceptor
    const requestInterceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const config = { headers: {} };
    const result = await requestInterceptor(config);

    expect(mockCurrentUser.getIdToken).toHaveBeenCalledWith(false);
    expect(result.headers.Authorization).toBe('Bearer test-firebase-token');
  });

  it('awaits authStateReady when currentUser is initially null', async () => {
    authMock.auth.currentUser = null;
    authMock.auth.authStateReady.mockImplementation(async () => {
      authMock.auth.currentUser = mockCurrentUser;
    });
    mockCurrentUser.getIdToken.mockResolvedValue('deferred-token');

    const requestInterceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const config = { headers: {} };
    const result = await requestInterceptor(config);

    expect(authMock.auth.authStateReady).toHaveBeenCalled();
    expect(result.headers.Authorization).toBe('Bearer deferred-token');
  });

  it('refreshes token with forceRefresh=true and retries request on 401', async () => {
    mockCurrentUser.getIdToken.mockResolvedValue('fresh-refreshed-token');
    authMock.auth.currentUser = mockCurrentUser;

    const responseInterceptorErr = (api.interceptors.response as any).handlers[0].rejected;

    const mockAdapter = vi.fn().mockResolvedValue({ status: 200, data: { ok: true } });
    const originalRequest = {
      headers: { Authorization: 'Bearer old-expired-token' },
      url: '/schedules',
      baseURL: 'http://127.0.0.1:5000/api',
      adapter: mockAdapter,
    };

    const error401 = {
      config: originalRequest,
      response: { status: 401 },
    };

    await responseInterceptorErr(error401);

    expect(mockCurrentUser.getIdToken).toHaveBeenCalledWith(true);
    expect(originalRequest.headers.Authorization).toBe('Bearer fresh-refreshed-token');
    expect((originalRequest as any)._retry).toBe(true);
    expect(mockAdapter).toHaveBeenCalled();
  });

  it('does not retry infinitely if already marked with _retry', async () => {
    authMock.auth.currentUser = mockCurrentUser;

    const responseInterceptorErr = (api.interceptors.response as any).handlers[0].rejected;

    const originalRequest = {
      headers: { Authorization: 'Bearer invalid-token' },
      _retry: true,
    };

    const error401 = {
      config: originalRequest,
      response: { status: 401 },
    };

    await expect(responseInterceptorErr(error401)).rejects.toBe(error401);
    expect(mockCurrentUser.getIdToken).not.toHaveBeenCalled();
  });
});
