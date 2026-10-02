/* ============================================================
   雄亿仪器网 · xongyi 主题脚本
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.XY || {};

  /* ---------------------------------------------------------
     移动端导航
     --------------------------------------------------------- */
  function initNav() {
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('nav');
    if (!toggle || !nav) return;

    function close() {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // 移动端：带子菜单的父项点击展开，而不是跳转
    nav.querySelectorAll('.nav__item.has-sub > .nav__link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (window.innerWidth > 820) return;
        e.preventDefault();
        var item = link.parentNode;
        var willOpen = !item.classList.contains('is-open');
        nav.querySelectorAll('.nav__item.has-sub').forEach(function (it) {
          it.classList.remove('is-open');
        });
        if (willOpen) item.classList.add('is-open');
      });
    });

    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      close();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) close();
    });
  }

  /* ---------------------------------------------------------
     返回顶部
     --------------------------------------------------------- */
  function initToTop() {
    var btn = document.getElementById('toTop');
    if (!btn) return;

    function onScroll() {
      if (window.scrollY > 420) btn.removeAttribute('hidden');
      else btn.setAttribute('hidden', '');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------------------------------------------------
     图片放大预览
     --------------------------------------------------------- */
  function initLightbox() {
    if (CFG.lightbox === false) return;
    var box = document.getElementById('lightbox');
    if (!box) return;

    var imgEl = box.querySelector('.lightbox__img');
    var btnClose = box.querySelector('.lightbox__close');
    var btnPrev = box.querySelector('.lightbox__nav--prev');
    var btnNext = box.querySelector('.lightbox__nav--next');
    var sources = [];
    var index = 0;

    function collect() {
      var scope = document.getElementById('postContent') || document.querySelector('.post-content');
      if (!scope) return [];
      var out = [];
      scope.querySelectorAll('img').forEach(function (im) {
        var src = im.getAttribute('src');
        if (src && out.indexOf(src) === -1) out.push(src);
      });
      return out;
    }

    function show(i) {
      if (!sources.length) return;
      index = (i + sources.length) % sources.length;
      imgEl.setAttribute('src', sources[index]);
      imgEl.setAttribute('alt', '');
    }

    function open(src) {
      sources = collect();
      var i = sources.indexOf(src);
      show(i < 0 ? 0 : i);
      box.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      box.setAttribute('hidden', '');
      document.body.style.overflow = '';
      imgEl.setAttribute('src', '');
    }

    document.addEventListener('click', function (e) {
      var img = e.target.closest ? e.target.closest('.post-content img, .page-content img') : null;
      if (!img) return;
      var link = img.closest('a');
      var src = img.getAttribute('src');
      var target = (link && link.getAttribute('href')) || src;
      e.preventDefault();
      open(src);
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { show(index - 1); });
    btnNext.addEventListener('click', function () { show(index + 1); });
    box.addEventListener('click', function (e) {
      if (e.target === box) close();
    });

    document.addEventListener('keydown', function (e) {
      if (box.hasAttribute('hidden')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  /* ---------------------------------------------------------
     产品搜索
     --------------------------------------------------------- */
  function initSearch() {
    var form = document.getElementById('searchPage');
    if (!form || CFG.search === false) return;

    var input = document.getElementById('searchInput');
    var results = document.getElementById('searchResults');
    var status = document.getElementById('searchStatus');
    var emptyEl = document.getElementById('searchEmpty');
    var data = null;

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function card(p) {
      var media = p.cover
        ? '<img src="' + esc(p.cover) + '" alt="' + esc(p.title) + '" loading="lazy">'
        : '<span class="pcard__ph"><svg class="xy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></svg></span>';
      var chip = p.categories && p.categories.length
        ? '<span class="chip">' + esc(p.categories[0]) + '</span>'
        : '';
      return '' +
        '<article class="pcard">' +
        '<a class="pcard__media" href="' + esc(p.url) + '">' + media + '</a>' +
        '<div class="pcard__body">' +
        '<h3 class="pcard__title"><a href="' + esc(p.url) + '">' + esc(p.title) + '</a></h3>' +
        '<p class="pcard__desc">' + esc((p.text || '').slice(0, 60)) + '</p>' +
        '<div class="pcard__foot">' + chip +
        '<span class="pcard__more">查看详情<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>' +
        '</div></div></article>';
    }

    function render(q) {
      q = (q || '').trim().toLowerCase();
      if (!q) {
        status.textContent = '';
        results.innerHTML = '';
        emptyEl.setAttribute('hidden', '');
        return;
      }
      var words = q.split(/\s+/).filter(Boolean);
      var hits = data.posts.filter(function (p) {
        var hay = (p.title + ' ' + (p.categories || []).join(' ') + ' ' + (p.text || '')).toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) !== -1; });
      });
      status.textContent = '共找到 ' + hits.length + ' 个结果';
      if (!hits.length) {
        results.innerHTML = '';
        emptyEl.removeAttribute('hidden');
        return;
      }
      emptyEl.setAttribute('hidden', '');
      results.innerHTML = hits.slice(0, 60).map(card).join('');
    }

    function search(q) {
      input.value = q || '';
      if (!data) {
        status.textContent = '正在加载产品数据…';
        fetch(CFG.searchUrl || '/search.json')
          .then(function (r) { return r.json(); })
          .then(function (json) {
            data = json;
            render(q);
          })
          .catch(function () {
            status.textContent = '产品数据加载失败，请刷新页面重试。';
          });
      } else {
        render(q);
      }
      if (window.history && window.history.replaceState) {
        var url = window.location.pathname + (q ? '?q=' + encodeURIComponent(q) : '');
        window.history.replaceState(null, '', url);
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      search(input.value);
    });

    input.addEventListener('input', function () {
      clearTimeout(input._t);
      input._t = setTimeout(function () { search(input.value); }, 220);
    });

    form.querySelectorAll('.js-hot').forEach(function (b) {
      b.addEventListener('click', function () {
        search(b.getAttribute('data-q'));
        input.focus();
      });
    });

    var params = new URLSearchParams(window.location.search);
    var initial = params.get('q') || '';
    if (initial) search(initial);
  }

  /* ---------------------------------------------------------
     启动
     --------------------------------------------------------- */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initNav();
    initToTop();
    initLightbox();
    initSearch();
  });
})();
