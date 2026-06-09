import { expect, type Page, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const login = async (page: Page, password = 'admin123') => {
  await page.goto('/tat');
  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
};

test('管理员可修改默认密码并新增卡片', async ({ page }) => {
  await login(page);
  await expect(page.getByText('当前账号仍在使用默认密码')).toBeVisible();

  await page.getByLabel('重置密码').fill('admin12345');
  await page.getByTitle('保存更改').click();
  await expect(page.getByText('设置保存成功')).toBeVisible();

  await page.getByRole('button', { name: '卡片管理' }).click();
  await page.getByTitle('新增卡片').click();
  await page.getByLabel('显示名称').fill('Example');
  await page.getByLabel('目标 URL').fill('https://example.com');
  await page.getByRole('button', { name: '保存' }).last().click();
  await page.getByTitle('保存更改').click();
  await expect(page.getByText('设置保存成功')).toBeVisible();

  await page.getByRole('button', { name: '返回首页' }).click();
  await page.getByRole('button', { name: /搜索网站或工具/ }).click();
  await page.getByPlaceholder('搜索网站或工具...').fill('Example');
  await expect(page.getByText('Example')).toBeVisible();
});

test('退出登录后需要重新认证', async ({ page }) => {
  await login(page, 'admin12345');
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page.getByRole('heading', { name: '后台登录' })).toBeVisible();
});
