'use strict';

/**
 * 雄亿仪器网 - Hexo 辅助函数（helper）
 * 放在站点根目录 scripts/ 下，由 Hexo 自动加载。
 */

// ---------------------------------------------------------------- 分类图标
const ICON_PATHS = {
  'paint-detection':
    '<path d="M12 3s5.5 6.4 5.5 10.2A5.5 5.5 0 0 1 6.5 13.2C6.5 9.4 12 3 12 3z"/>',
  'general-analysis':
    '<path d="M9 3h6M10.5 3v6.2L5.4 18A2 2 0 0 0 7.2 21h9.6a2 2 0 0 0 1.8-3L13.5 9.2V3"/><path d="M8 15h8"/>',
  'optical-experiments':
    '<path d="M2.5 12S6 6.2 12 6.2 21.5 12 21.5 12 18 17.8 12 17.8 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  'climate-experiment':
    '<path d="M14.5 14.3V4.8a2.5 2.5 0 1 0-5 0v9.5a4.5 4.5 0 1 0 5 0z"/><path d="M12 8v7"/>',
  'oil-detection':
    '<path d="M6 4h12M8 4v13a4 4 0 0 0 8 0V4"/><path d="M8 13h8"/>',
  'electronic-balance':
    '<path d="M12 4v16M8 20h8M12 7l8 4H4z"/><path d="M6.5 11 4 16.5h5zM17.5 11 15 16.5h5z"/>',
  'rubber-testing':
    '<path d="M3 16c2.5 0 3.5-8 6-8s3.5 8 6 8 2.5-4 3-4"/><path d="M3 20h18"/>',
  'consumable-supplies':
    '<path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5v-7z"/><path d="M3 8.5 12 14l9-5.5M12 14v7"/>',
  'product':
    '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>',
  'hot-product':
    '<path d="M12 22c4 0 7-2.7 7-6.7 0-3.6-2.6-6-4.5-8.2C12.9 5.3 12 3 12 3s-.8 2.6-2.5 4.7C7.4 10 5 12.3 5 15.3 5 19.3 8 22 12 22z"/><path d="M12 22c-1.7 0-3-1.2-3-2.9 0-1.5 1.2-2.5 2-3.7.6-.9.9-2 .9-2s1.6 2 2.2 3.1c.5 1 .9 1.9.9 2.8 0 1.6-1.3 2.7-3 2.7z"/>',
  'company-news':
    '<path d="M4 5h12v14H4z"/><path d="M16 9h4v8a2 2 0 0 1-2 2h-2"/><path d="M7 9h6M7 12h6M7 15h4"/>',
  'trade-news':
    '<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v5h-5"/>',
  news:
    '<path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M14 9a4 4 0 0 1 0 6"/>'
};

const SVG_OPEN =
  '<svg class="xy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

hexo.extend.helper.register('cat_icon', function (name) {
  const body = ICON_PATHS[name];
  if (!body) {
    return SVG_OPEN + ICON_PATHS.product + '</svg>';
  }
  return SVG_OPEN + body + '</svg>';
});

// ---------------------------------------------------------------- 分类查询
// 只取「顶级」分类（无 parent），避免同名子分类干扰
function findTopCategory(ctx, name) {
  const cats = ctx.site && ctx.site.categories;
  if (!cats || typeof cats.each !== 'function') return null;
  let top = null;
  let any = null;
  cats.each(function (c) {
    if (c.name !== name) return;
    if (!any) any = c;
    if (!c.parent) top = c;
  });
  return top || any;
}

function buildCatMap(ctx) {
  if (ctx.__xyCatMap) return ctx.__xyCatMap;
  const map = {};
  const cats = ctx.site && ctx.site.categories;
  if (cats && typeof cats.each === 'function') {
    cats.each(function (c) {
      if (!map[c.name] || (!c.parent && map[c.name].parent)) {
        map[c.name] = c;
      }
    });
  }
  ctx.__xyCatMap = map;
  return map;
}

hexo.extend.helper.register('cat_name', function (name) {
  const names = (this.theme && this.theme.cat_names) || {};
  return names[name] || name;
});

hexo.extend.helper.register('cat_desc', function (name) {
  const descs = (this.theme && this.theme.cat_desc) || {};
  return descs[name] || '';
});

hexo.extend.helper.register('cat_url', function (name) {
  const cat = buildCatMap(this)[name];
  return cat ? this.url_for(cat.path) : this.url_for('/archives/');
});

hexo.extend.helper.register('cat_count', function (name) {
  const cat = findTopCategory(this, name);
  return cat ? cat.length : 0;
});

// 取某分类下的文章列表
hexo.extend.helper.register('cat_posts', function (name, limit) {
  const cat = findTopCategory(this, name);
  if (!cat) return [];
  let q = cat.posts.sort('-date');
  if (limit) q = q.limit(limit);
  return q.toArray();
});

// ---------------------------------------------------------------- 文章辅助
// 规范化的站内链接：去掉结尾的 index.html，保证根路径开头
hexo.extend.helper.register('xy_url', function (path) {
  if (!path) return this.url_for('/');
  let p = String(path).replace(/index\.html$/, '');
  if (p.charAt(0) !== '/') p = '/' + p;
  return this.url_for(p);
});

hexo.extend.helper.register('cover_url', function (post) {
  if (!post) return '';
  if (post.cover) return this.url_for(post.cover);
  return '';
});

// 文章首图（用于无 cover 时的兜底）
hexo.extend.helper.register('first_image', function (post) {
  if (!post) return '';
  if (post.cover) return this.url_for(post.cover);
  const html = post.content || '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
});

// 摘要：去掉标签与图片，截取前 n 个字符
hexo.extend.helper.register('plain_excerpt', function (post, len) {
  if (!post) return '';
  const n = len || 60;
  let text = post.excerpt || post.content || '';
  text = text.replace(/<figure[\s\S]*?<\/figure>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  text = text.replace(/\[[^\]]*\]\([^)]*\)/g, ' ');
  text = text.replace(/[#>*`_\\]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > n ? text.slice(0, n) + '…' : text;
});

// 文章主分类（用于卡片角标）：优先非 hot-product 的第一项
hexo.extend.helper.register('primary_category', function (post) {
  if (!post || !post.categories) return null;
  const cats = [];
  if (typeof post.categories.each === 'function') {
    post.categories.each(function (c) { cats.push(c); });
  }
  if (!cats.length) return null;
  const main = cats.filter(function (c) {
    return c.name !== 'hot-product';
  });
  return (main.length ? main : cats)[0];
});

// 文章是否属于某分类
hexo.extend.helper.register('in_category', function (post, name) {
  if (!post || !post.categories) return false;
  let hit = false;
  post.categories.each(function (c) {
    if (c.name === name) hit = true;
  });
  return hit;
});

// 同分类相关产品
hexo.extend.helper.register('related_posts', function (post, limit) {
  const n = limit || 4;
  if (!post) return [];

  const catNames = [];
  if (post.categories) {
    post.categories.each(function (c) { catNames.push(c.name); });
  }

  const seen = {};
  seen[post._id] = true;
  const same = [];
  const others = [];

  this.site.posts.sort('-date').each(function (p) {
    if (seen[p._id]) return;
    seen[p._id] = true;
    let hit = false;
    if (p.categories) {
      p.categories.each(function (c) {
        if (catNames.indexOf(c.name) !== -1) hit = true;
      });
    }
    if (hit) same.push(p);
    else others.push(p);
  });

  return same.concat(others).slice(0, n);
});
