# NaviLink - 极简导航站

NaviLink 是一个现代化的、极简风格的导航网站。它采用卡片式设计，支持亮色/暗色模式自动切换，并支持多种部署方式（Vercel、Docker、VPS）。

![Screenshot](https://picsum.photos/800/400?blur=2) 
*(示例图片)*

## 功能特性

*   **极简设计**：卡片式布局，专注于内容展示。
*   **灵活存储**：
    *   **本地模式**：直接存储在服务器本地文件系统中（适合 Docker/VPS）。
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

## 部署方式 2：Docker (VPS/NAS)

适合拥有自己服务器（如 Ubuntu、CentOS）或 NAS（群晖、Unraid）的用户。数据将默认保存在容器挂载的目录中。

### 1. 运行 Docker 容器

**使用本地存储（最简单）：**

```bash
docker run -d \
  --name navilink \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  navilink-image
```

*注意：请先自行构建镜像 `docker build -t navilink-image .` 或者等待 Docker Hub 镜像发布。*

**使用 WebDAV 同步：**

如果你在 Docker 中部署，但仍想把数据存到坚果云/Nextcloud，可以添加环境变量：

```bash
docker run -d \
  --name navilink \
  -p 3000:3000 \
  -e WEBDAV_URL="https://dav.jianguoyun.com/dav/" \
  -e WEBDAV_USERNAME="你的账号" \
  -e WEBDAV_PASSWORD="你的密码" \
  navilink-image
```

### 2. 使用 Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3'
services:
  navilink:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    restart: always
    # 如果需要 WebDAV，取消下面注释并填入信息
    # environment:
    #   - WEBDAV_URL=...
    #   - WEBDAV_USERNAME=...
    #   - WEBDAV_PASSWORD=...
```

然后运行：
```bash
docker-compose up -d --build
```

---

## 部署方式 3：VPS 手动部署 (Node.js)

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

*注意：如果未设置 `WEBDAV_URL`，系统将自动切换到**本地文件存储模式**。*

## 访问与管理

*   **首页**：`http://localhost:3000`
*   **后台管理**：`http://localhost:3000/tat` 
    *   初始账号：`admin`
    *   初始密码：`admin123`
    *   *请务必在后台修改密码！*

## License

MIT