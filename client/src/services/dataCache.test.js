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

  it('caches null results when negative caching is enabled', async () => {
    let fetchCount = 0;
    const fetchGroup = async () => {
      fetchCount += 1;
      return null;
    };

    await expect(dataCache.getOrFetch('group_student', fetchGroup, undefined, { cacheNull: true })).resolves.toBeNull();
    await expect(dataCache.getOrFetch('group_student', fetchGroup, undefined, { cacheNull: true })).resolves.toBeNull();

    expect(fetchCount).toBe(1);
  });

  it('preserves refetch behavior for null results unless negative caching is enabled', async () => {
    let fetchCount = 0;
    const fetchGroup = async () => {
      fetchCount += 1;
      return null;
    };

    await dataCache.getOrFetch('group_student', fetchGroup);
    await dataCache.getOrFetch('group_student', fetchGroup);

    expect(fetchCount).toBe(2);
  });
});
