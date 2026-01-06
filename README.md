# NaviLink - 极简导航站

NaviLink 是一个现代化的、极简风格的导航网站。它采用卡片式设计，支持亮色/暗色模式自动切换，并使用 WebDAV 进行数据同步。

![Screenshot](https://picsum.photos/800/400?blur=2) 
*(示例图片)*

## 功能特性

*   **极简设计**：卡片式布局，专注于内容展示。
*   **WebDAV 同步**：数据存储在您自己的 WebDAV 服务器（如坚果云、Nextcloud 等），安全可控。
*   **响应式布局**：完美适配桌面端和移动端。
*   **自动暗色模式**：根据系统设置自动切换深色主题。
*   **后台管理**：内置管理后台，无需修改代码即可管理分类和链接。
*   **隐私保护**：后台地址隐藏（默认后缀 `/tat`），支持免登录。

## 部署指南 (Vercel)

本项目设计为直接部署在 Vercel 等 Serverless 平台上。

1.  **Fork 本仓库** 到您的 GitHub。
2.  登录 [Vercel](https://vercel.com/)，点击 "Add New..." -> "Project"。
3.  选择您刚才 Fork 的仓库并导入。
4.  在 **Environment Variables** (环境变量) 设置中，添加以下 WebDAV 配置：

    | 变量名 | 说明 | 示例 |
    | :--- | :--- | :--- |
    | `WEBDAV_URL` | WebDAV 服务器地址 | `https://dav.jianguoyun.com/dav/` |
    | `WEBDAV_USERNAME` | WebDAV 用户名 | `myemail@example.com` |
    | `WEBDAV_PASSWORD` | WebDAV 密码/应用密码 | `abcdefg12345` |
    | `WEBDAV_PATH` | 数据存储路径 (可选) | `/navilink` (默认) |

5.  点击 **Deploy**。

部署完成后，您可以访问您的域名：
*   **首页**：查看导航。
*   **后台**：访问 `https://your-domain.vercel.app/tat` 进入管理后台（初始账号 `admin`，密码 `admin123`，请尽快修改）。

## 开发指南

### 本地运行

```bash
npm install
npm run start
```

如果没有配置环境变量，本地将运行在 **Mock 模式**，数据存储在浏览器的 LocalStorage 中。

### 技术栈

*   React
*   Tailwind CSS
*   Lucide React (图标)
*   WebDAV Client (Fetch API)

## License

MIT