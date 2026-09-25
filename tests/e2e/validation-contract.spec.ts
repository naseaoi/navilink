import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import { validatePublicDataForSave, dataLimits } from '../../services/validation';
import type { PublicData } from '../../types';

const require = createRequire(import.meta.url);
const { validatePublicData }: { validatePublicData: (data: PublicData) => PublicData } = require('../../api/_shared/validation.js');

test('浏览器和服务端对数据边界使用相同约束', () => {
  const initial: PublicData = {
    settings: { title: '导航', icon: '' }, categories: [{ id: 'one', name: '分类', order: 0 }],
    cards: [{ id: 'card', categoryId: 'one', title: '站点', description: '', url: 'https://example.com', icon: '', order: 0 }]
  };
  expect(validatePublicDataForSave(initial)).toBeNull();
  expect(() => validatePublicData(initial)).not.toThrow();
  const cases: Array<(data: PublicData) => void> = [
    (data) => { data.cards = Array.from({ length: dataLimits.MAX_CARDS + 1 }, (_, i) => ({ ...data.cards[0], id: `card-${i}` })); },
    (data) => { data.categories = Array.from({ length: dataLimits.MAX_CATEGORIES + 1 }, (_, i) => ({ ...data.categories[0], id: `category-${i}` })); },
    (data) => { data.cards[0].url = `https://example.com/${'x'.repeat(dataLimits.MAX_URL_LENGTH)}`; },
    (data) => { data.cards[0].order = 1.5; },
    (data) => { data.cards[0].title = 'x'.repeat(dataLimits.MAX_TITLE_LENGTH + 1); },
    (data) => { data.cards.push({ ...data.cards[0], id: ' card ' }); },
    (data) => { data.categories[0].icon = 'unknown-icon'; },
    (data) => { data.cards[0].categoryId = 'missing'; },
    (data) => { data.settings.icon = 'x'.repeat(dataLimits.MAX_URL_LENGTH + 1); },
    (data) => { data._meta = { updatedAt: 0 }; }
  ];
  for (const mutate of cases) {
    const data = structuredClone(initial);
    mutate(data);
    expect(validatePublicDataForSave(data)).toBeTruthy();
    expect(() => validatePublicData(data)).toThrow();
  }
});
