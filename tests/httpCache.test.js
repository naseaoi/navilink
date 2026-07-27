import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPublicDataCacheControl } from '../api/_shared/httpCache.js';

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
});
