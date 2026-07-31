import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { prepareSaveData } from '../api/_shared/saveData.js';

const publicData = {
  settings: { title: 'NaviLink', icon: '', footerText: '' },
  categories: [{ id: 'cat_1', name: 'Tools', order: 0 }],
  cards: [{
    id: 'card_1',
    categoryId: 'cat_1',
    title: 'Example',
    description: '',
    url: 'https://example.com',
    icon: '',
    order: 0
  }]
};

const privateData = {
  admin: { username: 'admin', passwordHash: 'admin12345' }
};

describe('save data helpers', () => {
  it('rejects stale public data saves', async () => {
    await assert.rejects(() => prepareSaveData({
      currentPublic: { ...publicData, _meta: { updatedAt: 2 } },
      currentPrivate: { ...privateData, _meta: { updatedAt: 1 } },
      publicData,
      privateData,
      expected: { publicUpdatedAt: 1, privateUpdatedAt: 1 }
    }), /public data changed/);
  });

  it('prepares valid save payloads', async () => {
    const result = await prepareSaveData({
      currentPublic: { ...publicData, _meta: { updatedAt: 1 } },
      currentPrivate: { ...privateData, _meta: { updatedAt: 1 } },
      publicData,
      privateData,
      expected: { publicUpdatedAt: 1, privateUpdatedAt: 1 }
    });
    assert.equal(result.publicData.cards[0].url, 'https://example.com/');
    assert.equal(result.privateData.admin.username, 'admin');
    assert.match(result.privateData.admin.passwordHash, /^scrypt\$/);
  });
});
