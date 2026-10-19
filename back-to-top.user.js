// ==UserScript==
// @name         回到顶部 · 进度环按钮
// @namespace    https://github.com/vipsunwei/back-to-top
// @version      1.5.1
// @description  为任意网页添加带滚动进度环的悬浮“回到顶部”按钮，向下滚动后自动出现。兼容 YouTube 等 SPA 站点。
// @author       sunwei
// @match        http://*/*
// @match        https://*/*
// @match        file://*/*
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const THRESHOLD = 300;
  const STYLE_ID = 'btp-style';
  const BTN_ID = 'btp-root';
  if (document.getElementById(BTN_ID)) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = 2 * Math.PI * 24;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#btp-root { position:fixed; right:24px; bottom:24px; z-index:2147483646; width:56px; height:56px; padding:0; border:1px solid rgba(255,255,255,.14); background:rgba(17,24,39,.72); backdrop-filter:blur(10px) saturate(160%); -webkit-backdrop-filter:blur(10px) saturate(160%); border-radius:50%; cursor:pointer; display:grid; place-items:center; opacity:0; transform:translateY(20px) scale(.9); transition:opacity .28s ease,transform .28s cubic-bezier(.22,1,.36,1),box-shadow .2s ease,background .2s ease; box-shadow:0 8px 24px rgba(0,0,0,.35); color:#f8fafc; pointer-events:none; }
#btp-root.btp-visible { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
#btp-root:hover { background:rgba(31,41,55,.85); box-shadow:0 10px 30px rgba(99,102,241,.45); }
#btp-root:focus-visible { outline:2px solid #a5b4fc; outline-offset:3px; }
#btp-root svg { display:block; width:100%; height:100%; }
#btp-track { stroke:rgba(255,255,255,.16); }
#btp-progress { stroke:url(#btp-grad); transition:stroke-dashoffset .15s linear; }
#btp-arrow { stroke:#f8fafc; }
@media (prefers-reduced-motion:reduce) { #btp-root,#btp-progress { transition:none; } }
`;
    (document.head || document.documentElement).appendChild(style);
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    for (const key in attrs) el.setAttribute(key, attrs[key]);
    return el;
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.setAttribute('aria-label', '回到顶部');
    btn.title = '回到顶部';

    const svg = svgEl('svg', { viewBox: '0 0 56 56', 'aria-hidden': 'true' });
    const defs = svgEl('defs', {});
    const grad = svgEl('linearGradient', { id: 'btp-grad', x1: '0', y1: '0', x2: '1', y2: '1' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#818cf8' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#f472b6' }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(svgEl('circle', { id: 'btp-track', cx: '28', cy: '28', r: '24', fill: 'none', 'stroke-width': '3' }));
    svg.appendChild(svgEl('circle', {
      id: 'btp-progress', cx: '28', cy: '28', r: '24', fill: 'none', 'stroke-width': '3',
      'stroke-linecap': 'round', transform: 'rotate(-90 28 28)',
      'stroke-dasharray': C.toFixed(2), 'stroke-dashoffset': C.toFixed(2),
    }));
    svg.appendChild(svgEl('path', {
      id: 'btp-arrow', d: 'M28 15 L28 40 M19 24 L28 15 L37 24', fill: 'none',
      'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }));
    btn.appendChild(svg);
    return btn;
  }

  let btn = null;
  let progressEl = null;
  let activeScrollRoot = document.scrollingElement || document.documentElement;

  function pageScrollRoot() {
    return document.scrollingElement || document.documentElement;
  }

  function getWindowScroll() {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function scrollMetrics() {
    const root = activeScrollRoot.isConnected ? activeScrollRoot : pageScrollRoot();
    const isPage = root === pageScrollRoot();
    const top = isPage ? getWindowScroll() : root.scrollTop;
    const max = root.scrollHeight - root.clientHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
    return { progress, top };
  }

  let ticking = false;
  function update() {
    ticking = false;
    const { progress, top } = scrollMetrics();
    if (progressEl) progressEl.style.strokeDashoffset = (C * (1 - progress)).toFixed(2);
    if (btn) btn.classList.toggle('btp-visible', top > THRESHOLD);
  }

  function onScroll(event) {
    const target = event && event.target;
    activeScrollRoot = target === document || target === document.documentElement || target === document.body
      ? pageScrollRoot()
      : target;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function scrollToTop() {
    const behavior = reduceMotion ? 'auto' : 'smooth';
    const root = activeScrollRoot.isConnected ? activeScrollRoot : pageScrollRoot();
    try { root.scrollTo({ top: 0, left: 0, behavior }); } catch (_) {}
  }

  function attach(button) {
    btn = button;
    progressEl = button.querySelector('#btp-progress');
    button.addEventListener('click', scrollToTop);
  }

  function ensure() {
    if (!document.body) return;
    injectStyle();
    let button = document.getElementById(BTN_ID);
    if (!button) {
      button = createButton();
      attach(button);
      document.documentElement.appendChild(button);
    }
    update();
  }

  function waitForBody(callback) {
    if (document.body) { callback(); return; }
    let tries = 0;
    const timer = setInterval(function () {
      if (document.body) { clearInterval(timer); callback(); }
      else if (++tries > 200) clearInterval(timer);
    }, 50);
  }

  function watch() {
    if (!document.body) return;
    const observer = new MutationObserver(function () {
      const button = document.getElementById(BTN_ID);
      if (!button || !button.isConnected) ensure();
    });
    observer.observe(document.body, { childList: true });
  }

  function init() {
    ensure();
    update();
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    watch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { waitForBody(init); });
  } else {
    waitForBody(init);
  }
})();
