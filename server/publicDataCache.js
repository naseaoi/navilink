export const createPublicDataCache = (ttlMs) => {
  const entries = Object.fromEntries(['local', 'webdav'].map((mode) => [mode, {
    data: null, expiresAt: 0, generation: 0, pending: null
  }]));

  const store = (mode, data) => {
    const entry = entries[mode];
    entry.generation += 1;
    entry.pending = null;
    entry.data = data;
    entry.expiresAt = Date.now() + ttlMs;
  };

  const invalidate = () => {
    Object.values(entries).forEach((entry) => {
      entry.generation += 1;
      entry.pending = null;
      entry.data = null;
      entry.expiresAt = 0;
    });
  };

  const read = async (mode, load, { forceRefresh = false } = {}) => {
    const entry = entries[mode];
    if (!forceRefresh && entry.data && entry.expiresAt > Date.now()) return entry.data;
    if (entry.pending) return entry.pending;
    const generation = entry.generation;
    const pending = Promise.resolve().then(load).then((data) => {
      if (generation !== entry.generation) return undefined;
      entry.data = data;
      entry.expiresAt = Date.now() + ttlMs;
      return data;
    }, (error) => {
      if (generation !== entry.generation) return undefined;
      throw error;
    });
    entry.pending = pending;
    try {
      return await pending;
    } finally {
      if (entry.pending === pending) entry.pending = null;
    }
  };

  return { store, read, invalidate };
};
