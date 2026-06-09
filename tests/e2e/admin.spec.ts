import { expect, type Page, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const login = async (page: Page, password = 'admin123') => {
  await page.goto('/tat');
  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
};

const saveChanges = async (page: Page) => {
  await page.getByTitle('保存更改').click();
  await expect(page.getByText('设置保存成功')).toBeVisible();
};

test('默认密码修改不受历史无效卡片阻塞', async ({ page }) => {
  await page.route('**/api/webdav?file=public.json', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          settings: { title: '我的导航', icon: '', footerText: '' },
          categories: [{ id: 'cat_1', name: '常用工具', order: 0 }],
          cards: [{ id: 'bad_card', categoryId: 'cat_1', title: '2', description: '', url: 'https://', icon: '', order: 0 }],
          _meta: { updatedAt: 1 }
        }
      });
      return;
    }
    await route.continue();
  });

  await login(page);
  await page.getByLabel('重置密码').fill('admin12345');
  await page.getByTitle('保存更改').click();
  await expect(page.getByText('设置保存成功')).toBeVisible();
  await expect(page.getByText('URL 无效')).toBeHidden();
});

test('管理员可新增卡片', async ({ page }) => {
  await login(page, 'admin12345');
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
  await expect(page.getByRole('button', { name: /Example Example https:\/\/example\.com\// })).toBeVisible();
});

test('管理员可删除卡片', async ({ page }) => {
  await login(page, 'admin12345');
  await page.getByRole('button', { name: '卡片管理' }).click();
  const card = page.locator('[data-card-id]').filter({ has: page.getByRole('heading', { name: 'Example' }) });
  await card.click();
  await card.getByRole('button', { name: '删除 Example' }).click();
  await expect(page.getByText('删除卡片')).toBeVisible();
  await page.getByRole('button', { name: '确认' }).click();
  await expect(page.getByText('Example')).toBeHidden();
  await saveChanges(page);
});

test('管理员可新增并删除分类', async ({ page }) => {
  await login(page, 'admin12345');
  await page.getByRole('button', { name: '分类管理' }).click();
  await page.getByRole('button', { name: '新增' }).click();
  await page.getByLabel('分类名称').fill('资料库');
  await page.getByRole('button', { name: '确认 新分类' }).click();
  await expect(page.getByText('资料库')).toBeVisible();
  await page.getByRole('button', { name: '删除 资料库' }).click();
  await expect(page.getByText('删除分类')).toBeVisible();
  await page.getByRole('button', { name: '确认' }).click();
  await expect(page.getByText('资料库')).toBeHidden();
  await saveChanges(page);
});

test('存储模式切换会提示放弃未保存更改', async ({ page }) => {
  await page.route('**/api/storage/mode', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { mode: 'local', available: { local: true, webdav: true } } });
      return;
    }
    await route.fulfill({ json: { mode: 'webdav', available: { local: true, webdav: true } } });
  });
  await page.route('**/api/storage/status', async (route) => {
    await route.fulfill({
      json: {
        local: { publicUpdatedAt: Date.now(), privateUpdatedAt: Date.now() },
        webdav: { publicUpdatedAt: Date.now(), privateUpdatedAt: Date.now() },
        available: { local: true, webdav: true }
      }
    });
  });

  await login(page, 'admin12345');
  await page.getByRole('button', { name: '网站设置' }).click();
  await page.getByLabel('站点标题').fill('未保存标题');
  await page.getByRole('button', { name: '数据存储' }).click();
  await page.getByRole('button', { name: '本地存储', exact: true }).click();
  await page.getByRole('button', { name: 'WebDAV', exact: true }).click();
  await expect(page.getByText('放弃未保存更改')).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();
});

test('保存冲突会提示刷新后再保存', async ({ page }) => {
  await page.route('**/api/storage/save', async (route) => {
    await route.fulfill({
      status: 409,
      json: { error: 'public data changed', code: 'VERSION_CONFLICT' }
    });
  });

  await login(page, 'admin12345');
  await page.getByRole('button', { name: '网站设置' }).click();
  await page.getByLabel('站点标题').fill('冲突标题');
  await page.getByTitle('保存更改').click();
  await expect(page.getByText('数据已被其他位置更新，请刷新后再保存')).toBeVisible();
});

test('移动端后台菜单可打开并切换页面', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'admin12345');
  await page.getByRole('button', { name: '打开菜单' }).click();
  await expect(page.getByRole('button', { name: '退出登录' })).toBeVisible();
  await page.getByRole('button', { name: '分类管理' }).click();
  await expect(page.getByRole('heading', { name: '分类管理' })).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭菜单' })).toBeHidden();
});

test('退出登录后需要重新认证', async ({ page }) => {
  await login(page, 'admin12345');
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page.getByRole('heading', { name: '后台登录' })).toBeVisible();
});
