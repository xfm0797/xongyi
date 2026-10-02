#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WordPress 导出内容 -> Hexo 规范结构 迁移脚本

输入:  output/posts/<slug>/index.md (+ images/)   192 篇文章
       output/pages/<slug>/index.md (+ images/)   2 个独立页面

输出:  source/_posts/<slug>.md                     文章
       source/<slug>/index.md                      独立页面
       source/images/<slug>/                        全部图片（按 slug 归档）

处理内容:
  1. 规范化 frontmatter（title / date / categories / tags / cover）
  2. 清理 WordPress [caption] 短代码 -> <figure> HTML
  3. 把指向 /wp-content/uploads/... 的外链改为本地图片
  4. 把 images/xxx 相对引用改为根路径 /images/<slug>/xxx
"""
import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'output'
SOURCE = ROOT / 'source'
POSTS_DIR = SOURCE / '_posts'
IMAGES_DIR = SOURCE / 'images'

FRONT_RE = re.compile(r'^---\s*\n(.*?)\n---\s*\n?(.*)$', re.S)
WP_LINK_RE = re.compile(r'\]\((/wp-content/[^)\s]+)\)')
IMG_REF_RE = re.compile(r'\]\((images/[^)\s]+)\)')
BARE_IMG_RE = re.compile(r'!\[([^\]]*)\]\((images/[^)\s]+)\)')
CAPTION_RE = re.compile(r'\\?\[caption([^\]]*?)\\?\](.*?)\\?\[/caption\\?\]', re.S)


def parse_front(text):
    """极简 YAML frontmatter 解析：只处理本站用到的字段。"""
    m = FRONT_RE.match(text)
    if not m:
        return {}, text
    raw, body = m.group(1), m.group(2)

    data = {'title': '', 'date': '', 'categories': [], 'tags': []}
    lines = raw.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        km = re.match(r'^([A-Za-z_]+):\s*(.*)$', line)
        if not km:
            i += 1
            continue
        key, val = km.group(1), km.group(2).strip()
        if key in ('categories', 'tags'):
            items = []
            if val:
                items.append(val.strip('"').strip("'"))
            j = i + 1
            while j < len(lines) and re.match(r'^\s+-\s+', lines[j]):
                items.append(re.sub(r'^\s+-\s+', '', lines[j]).strip().strip('"').strip("'"))
                j += 1
            data[key] = items
            i = j
            continue
        data[key] = val.strip().strip('"')
        i += 1
    return data, body


def build_index(images_dir):
    """返回 {文件名: 文件名}，便于判断某张图是否已下载。"""
    if not images_dir.exists():
        return {}
    return {p.name: p.name for p in images_dir.iterdir() if p.is_file()}


def resolve_wp(basename, index):
    """把 wordpress 图片文件名映射到本地文件；支持缩略图后缀 (-300x196)。"""
    if basename in index:
        return basename
    stem = Path(basename).stem
    ext = Path(basename).suffix.lower()
    # 精确 stem 匹配
    for name in index:
        if Path(name).stem == stem and Path(name).suffix.lower() == ext:
            return name
    # 缩略图匹配：名字以 stem- 开头
    cands = [n for n in index if n.startswith(stem + '-') and Path(n).suffix.lower() == ext]
    if cands:
        return sorted(cands, key=len)[0]
    return None


SIZE_SUFFIX_RE = re.compile(r'-\d{2,4}x\d{2,4}$')


def prefer_full(name, index):
    """若存在去尺寸后缀的原图，优先使用原图，避免页面糊。"""
    if name not in index:
        return name
    stem = Path(name).stem
    ext = Path(name).suffix
    if SIZE_SUFFIX_RE.search(stem):
        full = SIZE_SUFFIX_RE.sub('', stem) + ext
        if full in index:
            return full
    return name


def make_figure(attrs, inner, index, slug):
    """把 [caption ...][![alt](thumb)](/wp-content/full) 说明文字[/caption] 转成 <figure>。"""
    # 提取 markdown 图片
    img_m = re.search(r'!\[([^\]]*)\]\((?:images/)?([^)\s]+)\)', inner)
    if not img_m:
        return None
    alt, src = img_m.group(1), img_m.group(2)
    if not src.startswith('images/') and not src.startswith('/'):
        src = 'images/' + src
    local = index.get(Path(src).name) or src
    local = prefer_full(Path(local).name, index)
    url = '/images/%s/%s' % (slug, local)

    align_m = re.search(r'align=["\']?(\w+)', attrs)
    cls = 'wp-caption'
    if align_m and align_m.group(1) in ('alignleft', 'alignright', 'aligncenter'):
        cls += ' ' + align_m.group(1)

    # 说明文字 = 图片之后、caption 关闭之前的纯文本
    tail = inner[img_m.end():]
    tail = re.sub(r'\]\([^)]*\)', '', tail)          # 去掉外链包裹残留
    tail = re.sub(r'\\', '', tail)
    tail = re.sub(r'[\[\]]', '', tail).strip()
    tail = re.sub(r'\s+', ' ', tail)

    fig = '<figure class="%s">\n  <img src="%s" alt="%s" loading="lazy">\n' % (cls, url, alt)
    if tail:
        fig += '  <figcaption>%s</figcaption>\n' % tail
    fig += '</figure>'
    return fig


def strip_pipes(line):
    s = line.strip()
    if s.startswith('|'):
        s = s[1:]
    if s.endswith('|'):
        s = s[:-1]
    return s.strip()


def unwrap_pseudo_table(body):
    """WordPress 导出时把整块 HTML 塞进了单列表格单元格，这里还原成普通 HTML 段落。"""
    lines = body.split('\n')
    out = []
    i = 0
    n = len(lines)
    while i < n:
        if lines[i].lstrip().startswith('|'):
            j = i
            block = []
            while j < n and lines[j].lstrip().startswith('|'):
                block.append(lines[j])
                j += 1
            if any('<table' in b for b in block):
                for b in block:
                    s = strip_pipes(b)
                    if re.match(r'^:?-{2,}:?$', s):   # 表格分隔行
                        continue
                    if s:
                        out.append(s)
                out.append('')
                i = j
                continue
        out.append(lines[i])
        i += 1
    return '\n'.join(out)


def rewrite_body(body, index, slug, missing):
    body = unwrap_pseudo_table(body)

    # 1) caption 短代码 -> figure
    def cap_sub(m):
        fig = make_figure(m.group(1), m.group(2), index, slug)
        return fig if fig else m.group(0)

    body = CAPTION_RE.sub(cap_sub, body)

    # 2) 外链 /wp-content/... -> 本地图片
    def wp_sub(m):
        wp_path = m.group(1)
        name = Path(wp_path).name
        local = resolve_wp(name, index)
        if local:
            return '](/images/%s/%s)' % (slug, local)
        missing.append(wp_path)
        return m.group(0)

    body = WP_LINK_RE.sub(wp_sub, body)

    # 3) 站内 images/xxx 相对引用 -> 根路径
    def img_sub(m):
        name = Path(m.group(1)).name
        local = index.get(name)
        if local is None:
            local = resolve_wp(name, index)
        if local:
            return '](/images/%s/%s)' % (slug, local)
        missing.append('images/' + name)
        return m.group(0)

    body = IMG_REF_RE.sub(img_sub, body)

    # 4) 清理仍无法本地化的图片/链接，避免死链
    body = re.sub(r'\[!\[[^\]]*\]\((?:images/|/wp-content/)[^)]*\)\]\([^)]*\)', '', body)
    body = re.sub(r'!\[[^\]]*\]\((?:images/|/wp-content/)[^)]*\)', '', body)
    body = re.sub(r'\[([^\]]*)\]\(/wp-content/[^)]*\)', r'\1', body)

    return body


def first_image(body, index, slug):
    m = re.search(r'!\[[^\]]*\]\(/images/%s/([^)\s]+)\)' % re.escape(slug), body)
    if not m:
        m = re.search(r'\]\(/images/%s/([^)\s]+)\)' % re.escape(slug), body)
    if m:
        return prefer_full(m.group(1), index)
    # 兜底：图片目录里第一张
    if index:
        return sorted(index)[0]
    return None


def emit_frontmatter(data, cover):
    out = ['---']
    out.append('title: %s' % yaml_str(data.get('title', '')))
    if data.get('date'):
        out.append('date: %s' % data['date'])
    cats = [c for c in data.get('categories', []) if c]
    if cats:
        # Hexo 中 categories 的多项是「层级」关系；用 [[a],[b]] 形式表达互相独立的多个分类
        out.append('categories:')
        out.extend('  - [%s]' % yaml_str(c) for c in cats)
    tags = [t for t in data.get('tags', []) if t]
    if tags:
        out.append('tags:')
        out.extend('  - %s' % t for t in tags)
    if cover:
        out.append('cover: /images/%s/%s' % (data['_slug'], cover))
    out.append('---')
    return '\n'.join(out) + '\n'


def yaml_str(s):
    s = str(s).replace('"', '\\"')
    return '"%s"' % s


def migrate_kind(kind, out_dir_for):
    src_base = SRC / kind
    count = 0
    for item in sorted(src_base.iterdir()):
        if not item.is_dir():
            continue
        md = item / 'index.md'
        if not md.exists():
            continue
        slug = item.name
        data, body = parse_front(md.read_text(encoding='utf-8'))
        data['_slug'] = slug

        images_src = item / 'images'
        index = build_index(images_src)

        missing = []
        body = rewrite_body(body, index, slug, missing)
        cover = first_image(body, index, slug)

        # 拷贝图片
        if images_src.exists():
            dst = IMAGES_DIR / slug
            dst.mkdir(parents=True, exist_ok=True)
            for f in images_src.iterdir():
                if f.is_file():
                    shutil.copy2(f, dst / f.name)

        out_path = out_dir_for(slug)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        content = emit_frontmatter(data, cover) + '\n' + body.strip() + '\n'
        out_path.write_text(content, encoding='utf-8')

        if missing:
            print('  [missing %2d] %s' % (len(missing), slug))
        count += 1
    return count


def main():
    if not SRC.exists():
        print('未找到 output 目录', file=sys.stderr)
        return 1

    # 清理旧产物（仅限生成目录，安全）
    for p in (POSTS_DIR, IMAGES_DIR):
        if p.exists():
            shutil.rmtree(p)
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    print('迁移文章 ...')
    n_post = migrate_kind('posts', lambda slug: POSTS_DIR / (slug + '.md'))
    print('迁移页面 ...')
    n_page = migrate_kind('pages', lambda slug: SOURCE / slug / 'index.md')

    print('\n完成：%d 篇文章, %d 个页面' % (n_post, n_page))
    return 0


if __name__ == '__main__':
    sys.exit(main())
