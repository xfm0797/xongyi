# 项目记忆：雄亿仪器网（cn.xongyi.com）

## 项目定位
WordPress 站点「雄亿仪器网」（原 https://www.xongyi.com ，佛山市顺德区雄亿检测仪器有限公司）迁移为 **Hexo 静态站**。
主营：涂料/橡胶检测仪器、实验室通用分析仪器、光学仪器、环境试验箱、电子天平、实验耗材。

## 目录约定
- `output/` —— **原始迁移产物，只读，不要删改**（posts/<slug>/index.md + images/）
- `tools/migrate.py` —— 从 `output/` 重新生成 `source/` 内容；改动输出格式时改这里并重跑
- `scripts/*.js` —— Hexo 启动时自动加载的 helper / generator（**不要放非 JS 文件**）
- `source/_posts/<slug>.md` —— 文章（扁平命名，文件名即 permalink slug）
- `source/images/<slug>/` —— 图片，正文统一用根路径 `/images/<slug>/<file>` 引用
- `source/<slug>/index.md` —— 独立页面（`about-us`、`contact`、`categories`、`search`）
- `themes/xongyi/` —— 自研主题

## 硬性约定
- 站点配置：`permalink: :title/`、`root: /`、`language: zh-CN`、`per_page: 12`、`post_asset_folder: false`
- 卡片封面取自 frontmatter 的 `cover: /images/<slug>/<file>`（由迁移脚本写入）
- 分类中文名 / 图标 / 分组统一维护在 `themes/xongyi/_config.yml` 的 `cat_names`、`cat_desc`、`product_categories`、`news_categories`、`featured_categories`
- 公司信息（电话/地址/邮箱）在主题 `_config.yml` 的 `company` 段，页脚与侧栏 CTA 共用

## 常用命令
```bash
./node_modules/.bin/hexo generate     # 构建
./node_modules/.bin/hexo server -p 4000   # 本地预览
"C:/Users/Administrator/.workbuddy/binaries/python/versions/3.13.12/python.exe" tools/migrate.py
```

## 已知注意点
1. Hexo 的 `categories` 多项 = 层级；要多个独立分类须写 `- [a]` / `- [b]`。
2. 分类/标签模板里 `page.category`、`page.tag` 是字符串。
3. `hexo clean` 在本机（Windows）非常慢，非必要不用。
