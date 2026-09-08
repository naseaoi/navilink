import { expect, test, type Page } from '@playwright/test';

const prepareAdmin = async (page: Page) => {
  let publicData = { settings: { title: '草稿测试', icon: '' }, categories: [], cards: [], _meta: { updatedAt: 1 } };
  const privateData = { admin: { username: 'admin', passwordHash: 'fixture-only' }, _meta: { updatedAt: 1 } };
  let logouts = 0;
  await page.route('**/api/auth/verify', (route) => route.fulfill({ json: { ok: true, mustChangePassword: false } }));
  await page.route('**/api/auth/logout', (route) => { logouts += 1; return route.fulfill({ json: { ok: true } }); });
  await page.route((url) => url.pathname === '/api/webdav', (route) => route.fulfill({ json: new URL(route.request().url()).searchParams.get('file') === 'private.json' ? privateData : publicData }));
  await page.route('**/api/storage/save', (route) => {
    publicData = { ...route.request().postDataJSON().publicData, _meta: { updatedAt: 2 } };
    return route.fulfill({ json: { publicData, privateData } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Logo', exact: true }).click({ clickCount: 3 });
  await expect(page.getByRole('heading', { name: '卡片管理', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '网站设置', exact: true }).click();
  await page.getByLabel('站点标题').fill('未保存的草稿');
  return { logouts: () => logouts };
};

test('返回首页可取消并保留草稿，确认后离开', async ({ page }) => {
  await prepareAdmin(page);
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await expect(page.getByRole('heading', { name: '放弃未保存更改', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByLabel('站点标题')).toHaveValue('未保存的草稿');
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await page.getByRole('button', { name: '确认', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('浏览器后退可取消，再次确认后退', async ({ page }) => {
  await prepareAdmin(page);
  await page.evaluate(() => history.back());
  await expect(page.getByRole('heading', { name: '放弃未保存更改', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page).toHaveURL('/tat');
  await expect(page.getByLabel('站点标题')).toHaveValue('未保存的草稿');
  await page.evaluate(() => history.back());
  await page.getByRole('button', { name: '确认', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('移动端退出登录须确认，取消不发送退出请求', async ({ page }) => {
  const state = await prepareAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '打开菜单' }).click();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '放弃未保存更改', exact: true })).toBeVisible();
  expect(state.logouts()).toBe(0);
  const bounds = await page.getByRole('heading', { name: '放弃未保存更改', exact: true }).locator('..').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: test.info().outputPath('mobile-confirm.png') });
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await page.getByRole('button', { name: '确认', exact: true }).click();
  await expect(page.getByRole('heading', { name: '后台登录' })).toBeVisible();
  expect(state.logouts()).toBe(1);
});

test('刷新提示可取消，保存后不再提示', async ({ page }) => {
  await prepareAdmin(page);
  const dialogPromise = page.waitForEvent('dialog');
  await page.evaluate(() => { setTimeout(() => window.location.reload(), 0); });
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(page.getByLabel('站点标题')).toHaveValue('未保存的草稿');
  const closeDialog = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  await (await closeDialog).dismiss();
  expect(page.isClosed()).toBe(false);
  await expect(page.getByLabel('站点标题')).toHaveValue('未保存的草稿');
  await page.getByTitle('保存更改').click();
  await expect(page.getByText('设置保存成功', { exact: true })).toBeVisible();
  let subsequentDialogs = 0;
  page.on('dialog', async (nextDialog) => { subsequentDialogs += 1; await nextDialog.dismiss(); });
  await page.reload();
  await expect(page.getByRole('heading', { name: '卡片管理', exact: true })).toBeVisible();
  expect(subsequentDialogs).toBe(0);
});

test('切换到不同凭据的存储后回到登录页', async ({ page }) => {
  await prepareAdmin(page);
  await page.getByTitle('保存更改').click();
  await expect(page.getByText('设置保存成功', { exact: true })).toBeVisible();
  let switched = false;
  await page.route('**/api/storage/mode', (route) => {
    if (route.request().method() === 'PUT') switched = true;
    return route.fulfill({ json: { mode: switched ? 'webdav' : 'local', available: { local: true, webdav: true } } });
  });
  await page.route('**/api/storage/status', (route) => route.fulfill({ json: { local: {}, webdav: {}, available: { local: true, webdav: true } } }));
  await page.route((url) => url.pathname === '/api/webdav' && url.searchParams.get('file') === 'private.json', (route) => (
    switched ? route.fulfill({ status: 401, json: { error: 'Unauthorized' } }) : route.fallback()
  ));
  await page.getByRole('button', { name: '数据存储', exact: true }).click();
  await page.getByRole('button', { name: '本地存储', exact: true }).click();
  await page.getByRole('button', { name: 'WebDAV', exact: true }).click();
  await expect(page.getByRole('heading', { name: '后台登录' })).toBeVisible();
  expect(switched).toBe(true);
});
