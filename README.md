# NaviLink

一个现代化、极简风格的个人导航站。卡片式布局，零数据库依赖，支持本地文件 / WebDAV 双存储模式。

## 功能特性

- 卡片式响应式布局，桌面端多列 / 移动端自适应
- 亮色 / 暗色 / 跟随系统 三种主题模式
- 全局搜索（`Cmd+K` / `Ctrl+K`）
- 内置管理后台：卡片 CRUD、拖拽排序、分类管理、站点设置
- 双存储模式：本地 JSON 文件 或 WebDAV 云同步
- HttpOnly Cookie 登录态、登录限流、scrypt 密码哈希、HMAC Token 鉴权
- 批量保存接口：统一保存公开数据和私有数据，支持版本冲突提示
- 公开数据短时缓存与本地优先渲染，WebDAV 异常时保留最近可用数据
- Express 静态资源协商压缩、健康检查和优雅退出
- 安全图标代理：协议校验、内网地址拦截、固定 DNS 解析、超时和响应大小限制
- 支持 Vercel / Docker / VPS 多种部署方式

## 技术栈

| 前端 | 后端 | 构建 |
|:---|:---|:---|
| React 18 + TypeScript | Express 4 (Node.js) | Vite 6 |
| Tailwind CSS 3 | JSON 文件存储 / WebDAV | Docker 多阶段构建 |
| react-router-dom v6 | scrypt + HMAC-SHA256 鉴权 | TypeScript 类型检查 + GitHub Actions |

## 快速开始

### 环境要求

- Node.js >= 18
- npm

### 本地开发

```bash
git clone https://github.com/<your-username>/navilink.git
cd navilink
npm install
npm run dev
```

`npm run dev` 会同时启动：

- Vite 前端开发服务器：`http://localhost:5173`
- 本地 API / 数据服务：`http://localhost:3000`

### 生产构建

```bash
npm run build
npm start
```

`npm run build` 会依次执行 ESLint、Node 单元测试、TypeScript 类型检查和 Vite 生产构建。

如只需检查类型：

```bash
npm run typecheck
```

常用验证命令：

```bash
npm run lint
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

## 部署

### Vercel（推荐）

1. Fork 本仓库到你的 GitHub
2. 登录 [Vercel](https://vercel.com/)，导入项目
3. 配置环境变量（`AUTH_SECRET`、`WEBDAV_URL`、`WEBDAV_USERNAME`、`WEBDAV_PASSWORD` 必填）
4. 点击 Deploy

> Vercel 环境下存储模式锁定为 WebDAV，本地存储和数据同步功能不可用。

### Docker

```bash
docker run -d \
  --name navilink \
  -p 3000:3000 \
  -e AUTH_SECRET="your-strong-secret" \
  -v /opt/navilink/data:/app/data \
  --restart unless-stopped \
  ghcr.io/<your-username>/navilink:latest
```

容器使用 UID/GID `1000` 的非 root 用户运行。绑定宿主机目录前，请确保 `/opt/navilink/data` 对 UID `1000` 可写。容器健康检查访问 `/healthz`。

如需 WebDAV 模式，追加环境变量：

```bash
-e WEBDAV_URL="https://dav.example.com" \
-e WEBDAV_USERNAME="user" \
-e WEBDAV_PASSWORD="pass"
```

更新镜像：

```bash
docker pull ghcr.io/<your-username>/navilink:latest
docker rm -f navilink
# 重新执行上面的 docker run 命令
```

### VPS 手动部署

```bash
git clone https://github.com/<your-username>/navilink.git
cd navilink
npm install
npm run build
npm start
```

建议使用 pm2 管理进程：

```bash
pm2 start server.js --name navilink
```

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|:---|:---|:---|:---|
| `AUTH_SECRET` | 否 | 自动生成 | Token 签名密钥；生产环境强烈建议显式设置 |
| `PORT` | 否 | `3000` | 服务端口 |
| `DATA_DIR` | 否 | `./data` | 本地数据存储路径 |
| `WEBDAV_URL` | WebDAV 模式 | - | WebDAV 服务器地址 |
| `WEBDAV_USERNAME` | WebDAV 模式 | - | WebDAV 用户名 |
| `WEBDAV_PASSWORD` | WebDAV 模式 | - | WebDAV 密码 |
| `WEBDAV_PATH` | 否 | `navilink` | WebDAV 存储路径 |
| `WEBDAV_ALLOW_HTTP` | 否 | `false` | 是否允许 HTTP WebDAV，仅限可信内网调试 |
| `WEBDAV_TIMEOUT_MS` | 否 | `10000` | WebDAV 请求超时（毫秒，最大 `60000`） |
| `WEBDAV_MAX_RESPONSE_BYTES` | 否 | `10485760` | WebDAV 响应体上限（最大 20 MiB） |
| `PUBLIC_DATA_CACHE_TTL_MS` | 否 | `15000` | Express 公开数据内存缓存时间（毫秒，最大 `300000`） |
| `PUBLIC_DATA_CDN_TTL_SECONDS` | 否 | `15` | Vercel/CDN 公开数据共享缓存时间（秒，最大 `300`） |
| `CORS_ORIGINS` | 否 | 空（允许所有） | 允许的跨域来源，逗号分隔 |
| `LOGIN_WINDOW_MS` | 否 | `60000` | 登录限流时间窗口（毫秒） |
| `LOGIN_MAX_ATTEMPTS` | 否 | `5` | 窗口内最大登录失败次数 |
| `TRUST_PROXY` | 否 | `loopback` | Express 可信代理范围，公网反向代理部署时按网络拓扑配置 |
| `COOKIE_SAMESITE` | 否 | `Lax` | Cookie SameSite 策略，支持 `Lax` / `Strict` / `None` |
| `COOKIE_DOMAIN` | 否 | - | Cookie Domain |
| `COOKIE_SECURE` | 否 | 自动 | 是否强制 Secure Cookie，`COOKIE_SAMESITE=None` 时会自动启用 |

未设置 `WEBDAV_URL` 时，Express / Docker / VPS 模式自动使用本地文件存储。Vercel 环境下 `AUTH_SECRET` 和 WebDAV 相关变量为必填。生产环境建议配置 `AUTH_SECRET` 与 `CORS_ORIGINS`。

## 安全说明

- WebDAV 凭据只在服务端读取，不会注入前端构建产物。
- `/api/webdav` 只允许访问 `public.json` 和 `private.json`。
- `/api/storage/save` 会同时保存 `public.json` 和 `private.json`，并基于更新时间与 WebDAV ETag 检测冲突。
- `private.json` 不会降级写入浏览器 `localStorage`。
- 登录凭据使用 HttpOnly Cookie 保存，前端不保存认证 token。
- `/api/icon-proxy` 会校验协议、拦截内网地址、绑定解析 IP、限制重定向次数、设置超时并限制响应体大小。
- 登录限流在 Express 服务和 Vercel Serverless 入口都已启用。

## 使用说明

开发模式：

- 首页：`http://localhost:5173`
- 管理后台：`http://localhost:5173/tat`

生产模式：

- 首页：`http://localhost:3000`
- 管理后台：`http://localhost:3000/tat`
- 健康检查：`http://localhost:3000/healthz`

默认账号：`admin` / `admin123`

- 首次登录会强制要求修改默认密码，修改前服务端拒绝数据写入、同步和存储模式操作

## 项目结构

```
navilink/
├── server.js              # Express 生产服务器
├── server/                # Express 路由和本地服务模块
│   ├── authRoutes.js      # 认证路由
│   ├── storageRoutes.js   # 存储路由
│   ├── localStorage.js    # 本地 JSON 和存储模式
│   └── iconProxy.js       # 图标代理
├── index.html             # SPA 入口
├── App.tsx                # 主应用组件（路由、数据编排）
├── types.ts               # TypeScript 类型定义
├── components/
│   ├── UI.tsx             # 通用 UI 组件库
│   ├── PublicView.tsx     # 导航首页
│   ├── AdminDashboard.tsx # 管理后台
│   ├── public/            # 首页子组件
│   └── admin/             # 后台子组件
├── hooks/
│   ├── usePageMeta.ts     # 页面标题和 favicon 同步
│   └── useTheme.ts        # 主题状态管理
├── services/
│   ├── authSession.ts     # 前端登录态存取
│   ├── iconCache.ts       # 图标缓存
│   └── webdavService.ts   # 前端 API 调用封装
├── api/                   # Vercel Serverless Functions
│   └── _shared/           # 后端共享鉴权、限流、数据和 WebDAV 工具
├── tests/                 # Node 单元测试和 Playwright E2E
├── playwright.config.ts   # Chromium E2E 配置
├── data/                  # 运行时数据（gitignore）
└── .github/workflows/     # CI/CD
```

## CI/CD

- `.github/workflows/ci.yml`：执行生产构建和 Chromium E2E，失败时上传 Playwright 报告。
- `.github/workflows/docker-image.yml`：构建并发布 GHCR Docker 镜像。

## License

[MIT](LICENSE)
