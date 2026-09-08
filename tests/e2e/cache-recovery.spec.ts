import { expect, test } from '@playwright/test';

const publicData = (title: string, updatedAt: number) => ({ settings: { title, icon: '' }, categories: [], cards: [], _meta: { updatedAt } });

for (const remoteVersion of [100, 200]) {
  test(`接受当前存储版本 ${remoteVersion}，不被旧浏览器缓存锁定`, async ({ page }) => {
    let freshReads = 0;
    await page.addInitScript((data) => {
      if (!localStorage.getItem('navilink_public')) localStorage.setItem('navilink_public', JSON.stringify(data));
    }, publicData('旧存储缓存', 200));
    await page.route((url) => url.pathname === '/api/webdav', (route) => {
      if (new URL(route.request().url()).searchParams.get('fresh') === '1') freshReads += 1;
      return route.fulfill({ json: publicData('当前存储内容', remoteVersion) });
    });
    await page.goto('/');
    await expect(page).toHaveTitle('当前存储内容');
    expect(freshReads).toBe(remoteVersion < 200 ? 1 : 0);
    await expect(page.getByRole('status')).toHaveCount(0);
    await page.reload();
    await expect(page).toHaveTitle('当前存储内容');
  });
}

test('旧共享缓存不会覆盖刚保存的数据，失败降级后可手动恢复', async ({ page }) => {
  let failFresh = true;
  let freshReads = 0;
  await page.addInitScript((data) => localStorage.setItem('navilink_public', JSON.stringify(data)), publicData('刚保存的数据', 200));
  await page.route((url) => url.pathname === '/api/webdav', (route) => {
    if (new URL(route.request().url()).searchParams.get('fresh') !== '1') return route.fulfill({ json: publicData('过期共享缓存', 100) });
    freshReads += 1;
    return failFresh ? route.fulfill({ status: 503 }) : route.fulfill({ json: publicData('恢复的数据', 300) });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('正在使用本地缓存');
  await expect(page).toHaveTitle('刚保存的数据');
  const before = await page.getByRole('heading', { name: 'Hello.' }).boundingBox();
  const retry = page.getByRole('button', { name: '重新同步' });
  const retryBounds = await retry.boundingBox();
  expect(retryBounds!.x).toBeGreaterThanOrEqual(0);
  expect(retryBounds!.x + retryBounds!.width).toBeLessThanOrEqual(390);
  failFresh = false;
  await retry.click();
  await expect(page).toHaveTitle('恢复的数据');
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(freshReads).toBe(2);
  expect((await page.getByRole('heading', { name: 'Hello.' }).boundingBox())?.y).toBe(before?.y);
});
