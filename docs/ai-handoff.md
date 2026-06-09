# AI 交接文档

## 当前状态

本项目是 Vite + React + TypeScript 前端，配套 Express 本地服务与 Vercel Serverless API。存储支持本地 JSON 和 WebDAV。

最近已完成两轮优化提交：

- `9bf1c24 优化安全校验与工程化`
- `d2a170c 完善登录态与存储保存流程`

当前主线重点已处理：

- `/api/webdav` 只允许 `GET` / `PUT`，写入和 private 数据访问必须鉴权。
- 生产依赖和开发依赖审计已清零。
- 后端增加运行时数据校验。
- 登录态已改为 HttpOnly Cookie，前端不再保存 token。
- 后台保存改为 `POST /api/storage/save` 批量保存 public/private 数据。
- 保存时基于 `_meta.updatedAt` 做冲突检测，冲突返回 `409`。
- 批量保存已加强一致性：本地使用临时文件和备份回滚，WebDAV 写失败时回滚已提交文件。
- `server.js` 已拆分出认证、存储、本地读写、图标代理模块。
- Express 与 Vercel 登录流程已统一到共享登录服务。
- 图标代理增加限流、失败缓存，只接受 `image/*`。
- 已加入 ESLint、Node 内置单元测试、Playwright E2E、GitHub Actions。

## 关键文件

- `server.js`：Express 服务入口，只负责配置、静态资源、路由装配。
- `server/authRoutes.js`：Express 认证路由，负责登录、登出、校验 Cookie。
- `server/storageRoutes.js`：Express 存储路由，负责 WebDAV、本地存储、批量保存、同步。
- `server/localStorage.js`：本地 JSON 读写、存储模式、状态查询。
- `server/iconProxy.js`：图标代理、SSRF 拦截、限流、失败缓存。
- `api/_shared/auth.js`：Token、Cookie、密码 hash 共享逻辑。
- `api/_shared/authService.js`：共享登录流程，负责限流、账号校验、密码升级、Cookie 签发。
- `api/_shared/validation.js`：后端运行时数据校验。
- `api/_shared/saveData.js`：批量保存前的数据校验和版本冲突检测。
- `api/storage/save.js`：Vercel 批量保存入口。
- `services/authSession.ts`：前端登录态本地标记和登出请求。
- `services/webdavService.ts`：前端 API 调用封装。
- `playwright.config.ts`：E2E 配置，本机优先使用系统 Chrome。
- `tests/e2e/admin.spec.ts`：后台核心流程 E2E。

## 验证命令

已通过以下命令：

```bash
npm run lint
npm run test
npm run typecheck
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

E2E 说明：

- 本地 Win10 环境下 Playwright Chromium 下载曾遇到 SSL 传输错误。
- `playwright.config.ts` 已配置优先使用 `C:\Program Files\Google\Chrome\Application\chrome.exe`。
- CI 中仍执行 `npx playwright install --with-deps chromium`。
- E2E 使用 `tmp/e2e-data`，该目录已加入 `.gitignore`。

## 运行注意

本地开发：

```bash
npm run dev
```

生产构建和启动：

```bash
npm run build
npm start
```

后台路径：

- `/tat`

默认账号：

- `admin` / `admin123`

首次登录后会要求修改默认密码。

## 已知注意事项

- `AUTH_SECRET` 在 Express 本地模式未配置时会自动生成并写入 `data/.auth_secret`。
- Vercel 环境必须配置 `AUTH_SECRET` 和 WebDAV 变量。
- 前端仍保留少量 localStorage 标记，用于保存登录过期时间和默认密码提示状态；认证凭据已不再放 localStorage。
- `getAuthToken` 仍兼容 Bearer token，方便旧客户端或调试调用。
- `CORS_ORIGINS` 生产环境建议显式配置。

## 建议后续优化

1. **WebDAV 冲突检测增强**

   当前基于 `_meta.updatedAt`。后续可结合 WebDAV ETag / If-Match，提高多端并发编辑准确性。

2. **Cookie 安全策略可配置**

   当前 Cookie 使用 `HttpOnly; SameSite=Lax`，生产或 Vercel 下加 `Secure`。如未来跨域部署后台，可增加 `COOKIE_SAMESITE`、`COOKIE_DOMAIN` 配置。

3. **完善 E2E 覆盖**

   当前覆盖登录、改密码、新增卡片、搜索、退出。建议继续补：

   - 删除卡片
   - 分类新增/删除
   - 存储模式切换确认
   - 保存冲突提示
   - 移动端后台菜单

4. **图标代理更强 SSRF 防护**

   当前已做 DNS 内网拦截和重定向检查。后续可改为连接前后绑定解析 IP，降低 DNS rebinding 风险。

5. **前端状态管理拆分**

   `AdminDashboard.tsx` 仍承担较多状态编排。建议拆出：

   - `useAdminDraft`
   - `useStorageStatus`
   - `useToasts`
   - `useConfirmDialog`

6. **README 同步**

   README 需要更新以下内容：

   - HttpOnly Cookie 登录态
   - `/api/storage/save`
   - E2E 测试命令
   - 新增的 `server/` 模块结构

7. **发布流程补齐**

   如果要发新版，更新 `package.json` version 和 `docs/release.md`，并检查 `.github/workflows` 是否符合实际发布策略。
