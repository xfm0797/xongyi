'use strict';

/**
 * 生成站内搜索索引 /search.json
 * 每篇文章输出：标题、链接、封面、分类、日期、纯文本摘要
 */

function stripText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

hexo.extend.generator.register('search_index', function (locals) {
  const root = hexo.config.root || '/';

  function toUrl(path) {
    let p = String(path || '').replace(/index\.html$/, '');
    if (p.charAt(0) !== '/') p = '/' + p;
    if (root !== '/' && p.indexOf(root) !== 0) {
      p = root.replace(/\/$/, '') + p;
    }
    return p;
  }

  const posts = locals.posts
    .sort('-date')
    .filter(function (post) {
      return post.published !== false;
    })
    .map(function (post) {
      const cats = [];
      if (post.categories) {
        post.categories.each(function (c) {
          cats.push(c.name);
        });
      }
      const text = stripText(post.content);
      return {
        title: post.title || '',
        url: toUrl(post.path),
        cover: post.cover ? toUrl(post.cover) : '',
        categories: cats,
        date: post.date ? post.date.format('YYYY-MM-DD') : '',
        text: text.slice(0, 200)
      };
    });

  return {
    path: 'search.json',
    data: JSON.stringify({ count: posts.length, posts: posts })
  };
});
