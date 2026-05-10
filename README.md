# NaviLink

一个现代化、极简风格的个人导航站。卡片式布局，零数据库依赖，支持本地文件 / WebDAV 双存储模式。

## 功能特性

- 卡片式响应式布局，桌面端多列 / 移动端自适应
- 亮色 / 暗色 / 跟随系统 三种主题模式
- 全局搜索（`Cmd+K` / `Ctrl+K`）
- 内置管理后台：卡片 CRUD、拖拽排序、分类管理、站点设置
- 双存储模式：本地 JSON 文件 或 WebDAV 云同步
- 登录限流、scrypt 密码哈希、HMAC Token 鉴权
- 支持 Vercel / Docker / VPS 多种部署方式

## 技术栈

| 前端 | 后端 | 构建 |
|:---|:---|:---|
| React 18 + TypeScript | Express 4 (Node.js) | Vite 5 |
| Tailwind CSS 3 | JSON 文件存储 / WebDAV | Docker 多阶段构建 |
| react-router-dom v6 | scrypt + HMAC-SHA256 鉴权 | GitHub Actions GHCR 镜像发布 |

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

## 部署

### Vercel（推荐）

1. Fork 本仓库到你的 GitHub
2. 登录 [Vercel](https://vercel.com/)，导入项目
3. 配置环境变量（`AUTH_SECRET` 必填，WebDAV 相关变量按需填写）
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
| `CORS_ORIGINS` | 否 | 空（允许所有） | 允许的跨域来源，逗号分隔 |
| `LOGIN_WINDOW_MS` | 否 | `60000` | 登录限流时间窗口（毫秒） |
| `LOGIN_MAX_ATTEMPTS` | 否 | `5` | 窗口内最大登录失败次数 |

未设置 `WEBDAV_URL` 时自动使用本地文件存储模式。Vercel 环境下 `AUTH_SECRET` 为必填，生产环境建议配置 `AUTH_SECRET` 与 `CORS_ORIGINS`。

## 使用说明

开发模式：

- 首页：`http://localhost:5173`
- 管理后台：`http://localhost:5173/tat`

生产模式：

- 首页：`http://localhost:3000`
- 管理后台：`http://localhost:3000/tat`

默认账号：`admin` / `admin123`

- 首次登录会强制要求修改默认密码

## 项目结构

```
navilink/
├── server.js              # Express 生产服务器
├── index.html             # SPA 入口
├── App.tsx                # 主应用组件（路由、主题）
├── types.ts               # TypeScript 类型定义
├── components/
│   ├── UI.tsx             # 通用 UI 组件库
│   ├── PublicView.tsx     # 导航首页
│   ├── AdminDashboard.tsx # 管理后台
│   ├── public/            # 首页子组件
│   └── admin/             # 后台子组件
├── services/
│   └── webdavService.ts   # 前端 API 调用封装
├── api/                   # Vercel Serverless Functions
├── data/                  # 运行时数据（gitignore）
└── .github/workflows/     # CI/CD
```

## License

[MIT](LICENSE)
