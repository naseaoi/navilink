# 发布文档

发布版本以 Git tag 为准，`package.json` 作为仓库内版本元数据，二者要一致。

## 版本规则

- 发布 tag 使用 `vX.Y.Z`，例如 `v1.2.0`。
- `package.json` 的 `version` 使用不带 `v` 的版本号，例如 `1.2.0`。
- Docker 镜像由 GitHub Actions 自动发布到 GHCR。
- 应用构建时会注入 `VITE_APP_VERSION` 和 `VITE_GIT_SHA`。
- `services/iconCache.ts` 的 `DB_VERSION` 是 IndexedDB 结构版本，不参与发布版本同步。

## 发布前检查

1. 查看工作区状态：

```bash
git status --short
```

2. 拉取远端主分支和 tag：

```bash
git fetch origin main --tags
```

3. 确认当前分支基于最新主分支：

```bash
git branch --show-current
git log --oneline --decorate -5
```

4. 根据变更范围确定新版本：

```text
patch: 修复问题或小幅优化
minor: 新功能或可见行为调整
major: 破坏性变更
```

## 发布流程

1. 更新 `package.json` 版本号：

```bash
npm version <patch|minor|major> --no-git-tag-version
```

2. 校验和构建：

```bash
npm run version:check -- vX.Y.Z
npm run build
```

3. 提交版本更新：

```bash
git add package.json package-lock.json
git commit -m "发布 vX.Y.Z"
```

4. 创建 annotated tag：

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
```

5. 推送主分支和 tag：

```bash
git push origin main
git push origin vX.Y.Z
```

6. 检查 GitHub Actions：

```text
确认 Docker workflow 完成。
确认 GHCR 产生 vX.Y.Z、latest、sha 标签。
确认 GitHub Release 已生成。
```
