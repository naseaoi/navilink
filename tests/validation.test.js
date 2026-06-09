import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateDataFilePayload, validateLoginPayload } from '../api/_shared/validation.js';

const publicData = {
  settings: { title: 'NaviLink', icon: '', footerText: 'Footer' },
  categories: [{ id: 'cat_1', name: 'Tools', icon: 'wrench', order: 0 }],
  cards: [{
    id: 'card_1',
    categoryId: 'cat_1',
    title: 'GitHub',
    description: 'Code',
    url: 'https://github.com',
    icon: '',
    order: 0
  }]
};

describe('validation helpers', () => {
  it('normalizes public data', () => {
    const result = validateDataFilePayload('public.json', publicData);
    assert.equal(result.settings.title, 'NaviLink');
    assert.equal(result.categories[0].icon, 'wrench');
    assert.equal(result.cards[0].url, 'https://github.com/');
  });

  it('rejects unknown category icons', () => {
    assert.throws(() => validateDataFilePayload('public.json', {
      ...publicData,
      categories: [{ ...publicData.categories[0], icon: 'unknown-icon' }]
    }), /icon is invalid/);
  });

  it('rejects unsafe card URLs', () => {
    assert.throws(() => validateDataFilePayload('public.json', {
      ...publicData,
      cards: [{ ...publicData.cards[0], url: 'javascript:alert(1)' }]
    }), /http or https/);
  });

  it('rejects short new passwords', () => {
    assert.throws(() => validateDataFilePayload('private.json', {
      admin: { username: 'admin', passwordHash: 'short' }
    }), /at least 8/);
  });

  it('trims login payload', () => {
    assert.equal(validateLoginPayload({ username: ' admin ', password: ' admin123 ' }).username, 'admin');
  });
});
