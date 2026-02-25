# NaviLink

NaviLink 是一个现代化的、极简风格的导航网站。它采用卡片式设计，支持亮色/暗色模式自动切换，并支持多种部署方式（Vercel、VPS）。

## 功能特性

*   **极简设计**：卡片式布局，专注于内容展示。
*   **灵活存储**：
    *   **本地模式**：直接存储在服务器本地文件系统中（适合 VPS）。
    *   **WebDAV 模式**：通过 WebDAV 协议同步到云端（适合 Vercel 或希望数据分离的场景）。
*   **响应式布局**：完美适配桌面端和移动端。
*   **自动暗色模式**：根据系统设置自动切换深色主题。
*   **后台管理**：内置管理后台，无需修改代码即可管理分类和链接。

---

## 部署方式 1：Vercel (推荐)

最简单的方式，无需服务器。

1.  **Fork 本仓库** 到您的 GitHub。
2.  登录 [Vercel](https://vercel.com/)，导入项目。
3.  在 **Environment Variables** 设置中，添加 WebDAV 配置（见下文环境变量表）。
4.  点击 **Deploy**。

---

## GitHub 自动构建 Docker 镜像

仓库已包含 GitHub Actions 工作流：`.github/workflows/docker-image.yml`。

触发规则：

*   推送到 `main` 或 `master`
*   推送 `v*` 标签（如 `v1.0.2`）
*   手动触发（Actions -> Run workflow）

产物：

*   镜像会自动推送到 `ghcr.io/<owner>/<repo>`
*   默认分支会额外打 `latest` 标签
*   同时包含分支名/标签名和 `sha` 标签

首次使用请确认仓库设置允许 Actions 写入 Packages（`GITHUB_TOKEN`）。

---

## 部署方式 2：VPS 手动部署 (Node.js)

1.  确保服务器安装了 Node.js 18+。
2.  克隆代码并安装依赖：
    ```bash
    git clone https://github.com/your-repo/navilink.git
    cd navilink
    npm install
    ```
3.  构建前端：
    ```bash
    npm run build
    ```
4.  启动服务：
    ```bash
    npm start
    ```
    *建议使用 pm2 管理进程：`pm2 start server.js --name navilink`*

---

## 环境变量说明

| 变量名 | 必填 (WebDAV模式) | 说明 |
| :--- | :--- | :--- |
| `WEBDAV_URL` | 是 | WebDAV 服务器地址 |
| `WEBDAV_USERNAME` | 是 | WebDAV 用户名 |
| `WEBDAV_PASSWORD` | 是 | WebDAV 密码/应用密码 |
| `WEBDAV_PATH` | 否 | 存储路径，默认为 `/navilink` |
| `DATA_DIR` | 否 | 本地存储路径 (仅本地模式)，默认为 `./data` |
| `PORT` | 否 | 服务端口，默认为 `3000` |
| `AUTH_SECRET` | 是 | 管理后台鉴权密钥，用于签发访问 Token |
| `CORS_ORIGINS` | 否 | 允许跨域来源，逗号分隔；为空时允许所有来源 |
| `LOGIN_WINDOW_MS` | 否 | 登录限流时间窗口（毫秒），默认 `60000` |
| `LOGIN_MAX_ATTEMPTS` | 否 | 单窗口最大登录失败次数，默认 `5` |

*注意：如果未设置 `WEBDAV_URL`，系统将自动切换到**本地文件存储模式**。*  
*注意：`AUTH_SECRET` 必须设置，否则管理后台无法登录。*
*注意：生产环境建议配置 `CORS_ORIGINS`，例如 `https://nav.example.com`。*

## 访问与管理

*   **首页**：`http://localhost:3000`
*   **后台管理**：`http://localhost:3000/tat` 
    *   初始账号：`admin`
    *   初始密码：`admin123`
    *   首次登录若仍为默认密码，系统会强制要求先修改密码再进行其他管理操作

## License

MIT
