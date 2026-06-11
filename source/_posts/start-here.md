---
title: 从这里开始
date: 2026-06-11 23:45:00
categories:
  - Blog
tags:
  - Hexo
  - GitHub Pages
cover: /images/hero-green.jpg
excerpt: 用 Markdown 写文章，用 Hexo 生成静态网页，再交给 GitHub Pages 免费托管。
---

这是博客的第一篇文章。以后你只需要在 `source/_posts/` 里新增 Markdown 文件，然后运行：

```bash
npm run build
```

Hexo 会把文章生成到 `public/` 目录。推送到 GitHub 后，GitHub Actions 会自动发布到 GitHub Pages。

## 写作格式

每篇文章顶部都有一段 front matter，用来记录标题、日期、分类和标签：

```yaml
---
title: 我的文章标题
date: 2026-06-11 23:45:00
categories:
  - Engineering
tags:
  - Notes
---
```

正文直接写 Markdown。代码块、列表、引用、链接都会被自动转换成网页。

新建下一篇文章时，用项目自带的 Hexo 脚本：

```bash
npm run hexo -- new "my-post"
```

## 下一步

把 `_config.yml` 里的 `title`、`author`、`url` 改成你的信息；把 `themes/carbon-minimal/_config.yml` 里的 GitHub 链接改成你的主页。
