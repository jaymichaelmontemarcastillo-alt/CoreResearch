import { afterEach, describe, expect, it } from 'vitest';
import dataCache from './dataCache';

const createDeferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('dataCache', () => {
  afterEach(() => {
    dataCache.clear();
  });

  it('does not let an invalidated in-flight request restore stale data', async () => {
    const key = 'workspace_student';
    const staleRequest = createDeferred();
    const staleResult = dataCache.getOrFetch(key, () => staleRequest.promise);

    dataCache.invalidate(key);

    const freshValue = { id: 'new-workspace' };
    await expect(dataCache.getOrFetch(key, async () => freshValue)).resolves.toEqual(freshValue);

    staleRequest.resolve({ id: 'archived-workspace' });
    await expect(staleResult).resolves.toEqual({ id: 'archived-workspace' });
    expect(dataCache.get(key)).toEqual(freshValue);
  });
});
