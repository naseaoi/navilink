import { expect, test, type Page } from '@playwright/test';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="black"/></svg>';
const publicData = {
  settings: { title: '交互测试', icon: '' },
  categories: [{ id: 'one', name: '第一分类', order: 0 }, { id: 'two', name: '第二分类', order: 1 }],
  cards: Array.from({ length: 3 }, (_, i) => ({ id: `card-${i}`, categoryId: 'one', title: `测试站点 ${i}`, description: '', url: `https://site${i}.example.com`, icon: '', order: i })),
  _meta: { updatedAt: 1 }
};
const privateData = { admin: { username: 'admin', passwordHash: 'fixture-only' }, _meta: { updatedAt: 1 } };

const prepare = async (page: Page) => {
  await page.route('**/api/auth/verify', (route) => route.fulfill({ json: { ok: true } }));
  await page.route('**/api/webdav?**', (route) => route.fulfill({ json: new URL(route.request().url()).searchParams.get('file') === 'private.json' ? privateData : publicData }));
  await page.route('**/api/icon-proxy?**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
};

test('空图标自动获取 favicon，刷新后使用缓存', async ({ page }) => {
  await prepare(page);
  let requests = 0;
  await page.route('**/api/icon-proxy?**', (route) => {
    requests += 1;
    expect(new URL(route.request().url()).searchParams.get('url')).toContain('/s2/favicons?domain=site');
    return route.fulfill({ contentType: 'image/svg+xml', body: svg });
  });
  await page.goto('/');
  await expect(page.getByRole('img', { name: '测试站点 0' })).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => requests).toBe(3);
  await page.reload();
  await expect(page.getByRole('img', { name: '测试站点 0' })).toHaveAttribute('src', /^blob:/);
  expect(requests).toBe(3);
});

test('搜索支持上下键选择和 ESC 关闭', async ({ page }) => {
  await prepare(page);
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', { name: '搜索站点' });
  await expect(search).toBeFocused();
  await search.fill('测试站点');
  await expect(page.getByRole('option')).toHaveCount(3);
  await search.press('ArrowDown');
  await search.press('ArrowDown');
  await search.press('ArrowUp');
  await search.press('Enter');
  const dialog = page.getByRole('dialog', { name: '即将离开本站' });
  await expect(dialog.getByRole('heading', { name: '测试站点 1' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('卡片表单就地提示错误，弹窗保持输入焦点并支持下拉键盘操作', async ({ page }) => {
  await prepare(page);
  await page.goto('/tat');
  const add = page.getByTitle('新增卡片');
  await add.click();
  const dialog = page.getByRole('dialog', { name: '新增项目' });
  const title = dialog.getByLabel('显示名称');
  await expect(title).toBeFocused();
  await title.pressSequentially('新站点');
  await expect(title).toBeFocused();
  await dialog.getByLabel('目标 URL').fill('invalid');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('HTTP');
  const category = dialog.getByRole('button', { name: '所属分类' });
  await category.focus();
  await category.press('ArrowDown');
  await expect(dialog.getByRole('option', { name: '第一分类' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(category).toContainText('第二分类');
  await category.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(category).toBeFocused();
  await dialog.getByRole('button', { name: '关闭', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: '保存', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(add).toBeFocused();
});

test('公开数据请求超时后降级缓存，并允许重新同步', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript((data) => localStorage.setItem('navilink_public', JSON.stringify(data)), publicData);
  let readStarted = false;
  await page.route('**/api/webdav?**', () => { readStarted = true; });
  await page.goto('/');
  await expect.poll(() => readStarted).toBe(true);
  await page.clock.fastForward(15_100);
  await expect(page.getByRole('status')).toHaveText('正在使用本地缓存');
  await expect(page.getByRole('button', { name: '重新同步' })).toBeEnabled();
  await page.route('**/api/webdav?**', (route) => route.fulfill({ json: publicData }));
  await page.getByRole('button', { name: '重新同步' }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('保存时会话失效会回到登录界面', async ({ page }) => {
  await prepare(page);
  await page.route('**/api/storage/save', (route) => route.fulfill({ status: 401, json: { error: 'Unauthorized' } }));
  await page.goto('/tat');
  await page.getByRole('button', { name: '网站设置', exact: true }).click();
  await page.getByLabel('站点标题').fill('改变标题');
  await page.getByTitle('保存更改').click();
  await expect(page.getByRole('heading', { name: '后台登录' })).toBeVisible();
});

test('保存超时提示结果待确认，保留草稿并释放保存按钮', async ({ page }) => {
  await prepare(page);
  await page.clock.install();
  let saveStarted = false;
  await page.route('**/api/storage/save', () => { saveStarted = true; });
  await page.goto('/tat');
  await page.getByRole('button', { name: '网站设置', exact: true }).click();
  await page.getByLabel('站点标题').fill('保留草稿');
  await page.getByTitle('保存更改').click();
  await expect.poll(() => saveStarted).toBe(true);
  await page.clock.fastForward(120_100);
  await expect(page.getByText('请求超时，保存结果待确认，请重新同步后检查')).toBeVisible();
  await expect(page.getByLabel('站点标题')).toHaveValue('保留草稿');
  await expect(page.getByTitle('保存更改')).toBeEnabled();
});

test('图标队列限制并发，并重试繁忙响应', async ({ page }) => {
  await prepare(page);
  const data = { ...publicData, cards: Array.from({ length: 32 }, (_, i) => ({ ...publicData.cards[0], id: `many-${i}`, title: `站点 ${i}`, icon: `https://icons.example.com/${i}.svg`, order: i })) };
  await page.setViewportSize({ width: 1600, height: 2400 });
  await page.route('**/api/webdav?**', (route) => route.fulfill({ json: data }));
  let active = 0;
  let peak = 0;
  const attempts = new Map<string, number>();
  await page.route('**/api/icon-proxy?**', async (route) => {
    const url = route.request().url();
    const attempt = (attempts.get(url) || 0) + 1;
    attempts.set(url, attempt);
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 30));
    active -= 1;
    if (attempt === 1) await route.fulfill({ status: 503, headers: { 'Retry-After': '0' } });
    else await route.fulfill({ contentType: 'image/svg+xml', body: svg });
  });
  await page.goto('/c/one');
  await expect.poll(() => [...attempts.values()].filter((count) => count === 2).length).toBe(32);
  expect(peak).toBeLessThanOrEqual(8);
  await expect(page.getByRole('img', { name: '站点 31', exact: true })).toHaveAttribute('src', /^blob:/);
});
