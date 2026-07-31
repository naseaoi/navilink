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
    expect(requestedUrls.some((url) => ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(url).hostname))).toBe(false);
    expect((await compressedAsset).headers()['content-encoding']).toMatch(/^(br|gzip)$/);
    const health = await page.request.get('/healthz');
    expect(health.ok()).toBe(true);
    expect(health.headers()['cache-control']).toBe('no-store');
    expect(await health.json()).toEqual({ ok: true });
  });

  test('缓存降级提示悬浮显示且不移动首页布局', async ({ page }) => {
    const cachedData = {
      settings: { title: '缓存首页', icon: '' },
      categories: [{ id: 'cached', name: '缓存分类', order: 0 }],
      cards: [],
      _meta: { updatedAt: 10 }
    };
    let releaseRemoteRequest = () => {};
    let markRemoteRequested = () => {};
    const remoteGate = new Promise<void>((resolve) => { releaseRemoteRequest = resolve; });
    const remoteRequested = new Promise<void>((resolve) => { markRemoteRequested = resolve; });
    await page.addInitScript((data) => {
      localStorage.setItem('navilink_public', JSON.stringify(data));
    }, cachedData);
    await page.route((url) => url.pathname === '/api/webdav' && url.searchParams.get('file') === 'public.json', async (route) => {
      markRemoteRequested();
      await remoteGate;
      await route.fulfill({ status: 503, json: { error: 'unavailable' } });
    });

    await page.goto('/');
    await remoteRequested;
    const hero = page.getByRole('heading', { name: 'Hello.' });
    await expect(hero).toBeVisible();
    await expect(page.getByText('正在使用本地缓存', { exact: true })).toHaveCount(0);
    const before = await hero.boundingBox();

    releaseRemoteRequest();
    await expect(page.getByRole('status')).toHaveText('正在使用本地缓存');
    const after = await hero.boundingBox();

    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after?.y).toBe(before?.y);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileStatus = await page.getByRole('status').boundingBox();
    const mobileHero = await hero.boundingBox();
    expect(mobileStatus).not.toBeNull();
    expect(mobileHero).not.toBeNull();
    expect((mobileStatus?.y || 0) + (mobileStatus?.height || 0)).toBeLessThan(mobileHero?.y || 0);
  });

  test('相同图标只发起一次代理请求', async ({ page }) => {
    const sharedIcon = 'https://assets.example.com/shared-icon.png';
    const publicData = {
      settings: { title: '图标请求测试', icon: '' },
      categories: [{ id: 'shared', name: '共享图标', order: 0 }],
      cards: [
        { id: 'one', categoryId: 'shared', title: '站点一', description: '', url: 'https://one.example.com', icon: sharedIcon, order: 0 },
        { id: 'two', categoryId: 'shared', title: '站点二', description: '', url: 'https://two.example.com', icon: sharedIcon, order: 1 }
      ],
      _meta: { updatedAt: 1 }
    };
    const requestedIcons: string[] = [];
    await page.route((url) => url.pathname === '/api/webdav' && url.searchParams.get('file') === 'public.json', (route) => (
      route.fulfill({ json: publicData })
    ));
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/icon-proxy') requestedIcons.push(url.searchParams.get('url') || '');
    });

    await page.goto('/');
    await expect(page.getByText('站点一', { exact: true })).toBeVisible();
    await expect(page.getByText('站点二', { exact: true })).toBeVisible();
    await expect.poll(() => requestedIcons.filter((url) => url === sharedIcon).length).toBe(1);
  });

  test('大分类分批渲染卡片', async ({ page }) => {
    const categoryId = 'large-category';
    const cards = Array.from({ length: 60 }, (_, index) => ({
      id: `large-card-${index}`,
      categoryId,
      title: `大型分类卡片 ${index + 1}`,
      description: '',
      url: `https://example.com/item-${index + 1}`,
      icon: '',
      order: index
    }));
    await page.route((url) => url.pathname === '/api/webdav' && url.searchParams.get('file') === 'public.json', (route) => route.fulfill({
      json: {
        settings: { title: '大分类', icon: '' },
        categories: [{ id: categoryId, name: '大型分类', order: 0 }],
        cards,
        _meta: { updatedAt: 300 }
      }
    }));

    await page.goto(`/c/${categoryId}`);
    await expect(page.locator('.animate-card-enter')).toHaveCount(48);
    await page.getByRole('button', { name: '加载更多' }).click();
    await expect(page.locator('.animate-card-enter')).toHaveCount(60);
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

  test('切换存储模式时接受所选存储的旧版本数据', async ({ page }) => {
    const cachedData = {
      settings: { title: '浏览器缓存版本', icon: '' },
      categories: [{ id: 'cached', name: '缓存分类', order: 0 }],
      cards: [],
      _meta: { updatedAt: 200 }
    };
    const webdavData = {
      settings: { title: 'WebDAV 旧版本', icon: '' },
      categories: [{ id: 'webdav', name: 'WebDAV 分类', order: 0 }],
      cards: [],
      _meta: { updatedAt: 100 }
    };
    let freshPublicReads = 0;
    await page.addInitScript((data) => {
      localStorage.setItem('navilink_public', JSON.stringify(data));
    }, cachedData);
    await page.route((url) => url.pathname === '/api/webdav' && url.searchParams.get('file') === 'public.json', (route) => {
      if (new URL(route.request().url()).searchParams.get('fresh') === '1') freshPublicReads += 1;
      return route.fulfill({ json: webdavData });
    });
    await page.route('**/api/storage/mode', (route) => route.fulfill({
      json: {
        mode: route.request().method() === 'PUT' ? 'webdav' : 'local',
        available: { local: true, webdav: true }
      }
    }));
    await page.route('**/api/storage/status', (route) => route.fulfill({
      json: {
        local: { publicUpdatedAt: 200, privateUpdatedAt: 200 },
        webdav: { publicUpdatedAt: 100, privateUpdatedAt: 100 },
        available: { local: true, webdav: true }
      }
    }));

    await page.goto('/tat');
    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('密码').fill('e2e-password-123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('heading', { name: '卡片管理', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '数据存储', exact: true }).click();
    await page.getByRole('button', { name: '本地存储', exact: true }).click();
    await page.getByRole('button', { name: 'WebDAV', exact: true }).click();

    await expect(page).toHaveTitle('WebDAV 旧版本');
    expect(freshPublicReads).toBe(1);
  });

  test('新增卡片保存后重新加载仍存在', async ({ page }) => {
    const storageRequests: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith('/api/storage/')) storageRequests.push(path);
    });
    await page.goto('/tat');
    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('密码').fill('e2e-password-123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('heading', { name: '卡片管理', exact: true })).toBeVisible();
    expect(storageRequests).toHaveLength(0);
    await page.getByRole('button', { name: '数据存储', exact: true }).click();
    await expect.poll(() => storageRequests.length).toBe(2);
    await page.getByRole('button', { name: '卡片管理', exact: true }).click();
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
