# Alano

这是一个基于 Hexo 和 GitHub Pages 的极简暗色个人博客。

## 本地预览

第一次运行先安装依赖：

```bash
npm install
```

启动本地预览：

```bash
npm run server
```

打开 <http://localhost:4000> 查看效果。修改文章、页面或配置后，通常刷新浏览器即可；如果页面没有更新，可以停止命令后重新运行 `npm run server`。

发布前也可以先生成一次静态文件，确认没有构建错误：

```bash
npm run build
```

## 修改站点信息

主要站点信息在 `_config.yml`：

- `title`：网站标题。
- `subtitle`：首页副标题。
- `description`：网站描述。
- `author`：作者名称。
- `language` 和 `timezone`：语言和时区。
- `url`：发布到 GitHub Pages 后的网站地址，例如 `https://yourname.github.io`。

导航和社交链接在 `themes/carbon-minimal/_config.yml`。常见需要修改的是 `social.GitHub`，把它改成你的 GitHub 主页地址。

`日志` 页面在 `source/logs/index.md`，适合放日常想法、片段记录和非技术随笔；它不会出现在首页技术文章列表里。

`日程` 页面在 `source/schedule/index.md`，赛事数据在 `source/data/competitions.json`。当前数据来自学校 2025 年学科竞赛项目清单 PDF，包含全部 134 项竞赛的名称、主办单位、竞赛级别和 A/B1/B2/B3 认定类别。PDF 不包含报名开始、报名截止和正式比赛时间，因此这些时间字段需要后续根据赛事官网通知补充。

如果使用用户或组织主页仓库，仓库名通常是 `yourname.github.io`，`url` 写 `https://yourname.github.io`。如果使用项目仓库，`url` 通常写 `https://yourname.github.io/repository-name`。

## 写文章

新建文章：

```bash
npm run hexo -- new "my-post"
```

文章会生成到 `source/_posts/`。打开对应 Markdown 文件，修改顶部 front matter 和正文：

```yaml
---
title: 我的文章标题
date: 2026-06-11 23:45:00
categories:
  - Engineering
tags:
  - Notes
excerpt: 这段文字会作为文章摘要显示。
---
```

正文直接写 Markdown。写完后运行 `npm run server` 本地检查，确认没问题再提交并推送到 GitHub。

## 替换封面和头像

图片放在 `source/images/`：

- `avatar.png`：头像，也会作为站点图标使用。
- `hero-cover.png`：首页顶部封面。

最简单的做法是准备同名 PNG 文件，直接替换 `source/images/avatar.png` 和 `source/images/hero-cover.png`。替换后运行 `npm run server`，在首页确认图片比例和裁切效果。

## 发布到 GitHub Pages

项目已经包含自动发布工作流：`.github/workflows/pages.yml`。它会在推送到 `main` 分支时运行，执行 `npm ci`、`npm run build`，然后把 `public/` 发布到 GitHub Pages。

首次发布需要在 GitHub 仓库里做这些设置：

1. 创建 GitHub 仓库，并把本项目推送到 `main` 分支。
2. 把 `_config.yml` 里的 `url` 改成最终访问地址。
3. 打开仓库 `Settings -> Pages`。
4. 在 `Build and deployment` 里，把 `Source` 设为 `GitHub Actions`。
5. 打开仓库 `Actions` 页面，确认 `Deploy Hexo site to Pages` 工作流运行成功。

工作流文件已经声明了 GitHub Pages 发布需要的权限：

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

之后每次把文章或配置推送到 `main` 分支，GitHub Actions 都会自动构建并发布网站。

## 浏览量和评论

文章页已经接入 Busuanzi 浏览量统计，页面里会显示每篇文章的总浏览量。

评论区使用 Giscus。启用前需要在 GitHub 仓库开启 Discussions，并在 <https://giscus.app/> 生成配置，然后把 `themes/carbon-minimal/_config.yml` 里的 `comments.enabled` 改为 `true`，并填入：

- `repo`
- `repo_id`
- `category`
- `category_id`

## 竞赛日程

日程页会读取 `source/data/competitions.json`：

- `registrationStart`：报名开始时间。
- `registrationEnd`：报名截止时间。
- `contestStart`：正式比赛开始时间。
- `contestEnd`：正式比赛结束时间。
- `referenceRegistrationStart` / `referenceRegistrationEnd`：今年未通知时使用的 2025 年报名参考时间。
- `referenceContestStart` / `referenceContestEnd`：今年未通知时使用的 2025 年正式比赛参考时间。
- `officialUrl`：赛事官网或通知页面。

只要今年日期字段有值，日程页会按官网已确认时间显示；如果今年日期为空但 2025 参考字段有值，日历会用同月同日标出，并显示“2025参考 / 今年暂未通知”。没有任何日期的赛事会显示在“待官网确认”状态里，点击赛事名称也能查看主办单位、竞赛级别、学校认定类别和官网入口。

日程页右侧的“我的事务”保存在浏览器本地 `localStorage`，适合记录个人提醒、DDL 和临时安排；它不会写入仓库，也不会同步到其他设备。

如果修改了 `source/data/competitions.json`，建议运行：

```powershell
npm run clean
npm run build
```

这样可以避免 Hexo 缓存继续输出旧的 `public/data/competitions.json`。

`.github/workflows/update-competition-schedule.yml` 预留了每日定时更新流程。当前脚本不会臆造官网日期；当你为某些赛事补充 `officialUrl` 后，可以在 `tools/update_competitions.py` 里为对应官网添加解析逻辑，让 GitHub Actions 定时更新 JSON 并自动部署。
