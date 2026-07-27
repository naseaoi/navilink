import { expect, test } from '@playwright/test';

test.describe.serial('核心流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/icon-proxy?**', (route) => route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="black"/></svg>'
    }));
  });

  test('空存储首次打开会显示默认导航', async ({ page }) => {
    const requestedUrls: string[] = [];
    page.on('request', (request) => requestedUrls.push(request.url()));
    const compressedAsset = page.waitForResponse((response) => response.url().includes('/assets/react-vendor-'));
    await page.goto('/');
    await expect(page).toHaveTitle('我的导航');
    await expect(page.getByText('Google', { exact: true })).toBeVisible();
    expect(requestedUrls.some((url) => new URL(url).pathname.startsWith('/api/auth'))).toBe(false);
    await expect.poll(() => requestedUrls.filter((url) => new URL(url).pathname === '/api/icon-proxy').length).toBe(2);
    expect(requestedUrls).not.toContain('https://www.google.com/favicon.ico');
    expect(requestedUrls).not.toContain('https://github.com/favicon.ico');
    expect((await compressedAsset).headers()['content-encoding']).toMatch(/^(br|gzip)$/);
  });

  test('默认密码登录后必须修改密码', async ({ page }) => {
    await page.goto('/tat');
    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByText('当前账号仍在使用默认密码', { exact: false })).toBeVisible();
    await page.getByLabel('重置密码').fill('e2e-password-123');
    await page.getByTitle('保存更改').click();
    await expect(page.getByText('设置保存成功', { exact: true })).toBeVisible();
    await expect(page.getByText('当前账号仍在使用默认密码', { exact: false })).toHaveCount(0);
  });

  test('新增卡片保存后重新加载仍存在', async ({ page }) => {
    await page.goto('/tat');
    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('密码').fill('e2e-password-123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('heading', { name: '卡片管理', exact: true })).toBeVisible();
    await page.getByTitle('新增卡片').click();
    await page.getByLabel('显示名称').fill('E2E 示例');
    await page.getByLabel('目标 URL').fill('https://example.com/e2e');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.getByTitle('保存更改').click();
    await expect(page.getByText('设置保存成功', { exact: true })).toBeVisible();
    await page.goto('/');
    await expect(page.getByText('E2E 示例', { exact: true })).toBeVisible();
  });
});
