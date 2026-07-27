import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPublicDataCacheControl, isCacheablePublicDataRequest } from '../api/_shared/httpCache.js';

describe('public data cache policy', () => {
  it('uses bounded shared cache values', () => {
    assert.equal(
      getPublicDataCacheControl({ PUBLIC_DATA_CDN_TTL_SECONDS: '30' }),
      'public, max-age=0, must-revalidate, s-maxage=30'
    );
    assert.equal(
      getPublicDataCacheControl({ PUBLIC_DATA_CDN_TTL_SECONDS: '999' }),
      'public, max-age=0, must-revalidate, s-maxage=15'
    );
  });

  it('bypasses shared caches for explicit fresh reads', () => {
    assert.equal(isCacheablePublicDataRequest({ method: 'GET', file: 'public.json' }), true);
    assert.equal(isCacheablePublicDataRequest({ method: 'GET', file: 'public.json', fresh: '1' }), false);
    assert.equal(isCacheablePublicDataRequest({ method: 'GET', file: 'private.json' }), false);
    assert.equal(isCacheablePublicDataRequest({ method: 'PUT', file: 'public.json' }), false);
  });
});
