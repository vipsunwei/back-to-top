// ==UserScript==
// @name         回到顶部 · 进度环按钮
// @namespace    https://github.com/vipsunwei/back-to-top
// @version      1.6.0
// @description  为任意网页添加带滚动进度环的悬浮“回到顶部”按钮，向下滚动后自动出现。兼容 YouTube 等 SPA 站点。
// @author       sunwei
// @license      MIT
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
  const PREFIX = 'btp-vs-';
  const BTN_ID = PREFIX + 'root';
  const RING_ID = PREFIX + 'progress';
  const GRAD_ID = PREFIX + 'grad';
  const OWNED = '1';

  const preexisting = document.getElementById(BTN_ID);
  if (preexisting && preexisting.dataset.btpVs === OWNED) return;

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionQuery.matches;
  function onMotionChange(e) { reduceMotion = e.matches; }
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);

  const C = 2 * Math.PI * 24;

  const CSS_TEXT = `
button#${BTN_ID} { position:fixed; right:24px; bottom:24px; z-index:2147483646; width:56px; height:56px; padding:0; border:1px solid rgba(255,255,255,.14); background:rgba(17,24,39,.72); backdrop-filter:blur(10px) saturate(160%); -webkit-backdrop-filter:blur(10px) saturate(160%); border-radius:50%; cursor:pointer; display:grid; place-items:center; opacity:0; visibility:hidden; transform:translateY(20px) scale(.9); transition:opacity .28s ease,transform .28s cubic-bezier(.22,1,.36,1),box-shadow .2s ease,background .2s ease,visibility .28s; box-shadow:0 8px 24px rgba(0,0,0,.35); color:#f8fafc; pointer-events:none; }
button#${BTN_ID}.${PREFIX}visible { opacity:1; visibility:visible; transform:translateY(0) scale(1); pointer-events:auto; }
button#${BTN_ID}:hover { background:rgba(31,41,55,.85); box-shadow:0 10px 30px rgba(99,102,241,.45); }
button#${BTN_ID}:focus-visible { outline:2px solid #a5b4fc; outline-offset:3px; }
button#${BTN_ID} svg { display:block; width:100%; height:100%; }
#${PREFIX}track { stroke:rgba(255,255,255,.16); }
#${RING_ID} { stroke:url(#${GRAD_ID}); transition:stroke-dashoffset .15s linear; }
#${PREFIX}arrow { stroke:#f8fafc; }
@media (prefers-reduced-motion:reduce) { button#${BTN_ID},#${RING_ID} { transition:none; } }
`;

  let styleNode = null;
  let styleSheet = null;

  function styled() {
    if (styleSheet) return document.adoptedStyleSheets.includes(styleSheet);
    return !!(styleNode && styleNode.isConnected && styleNode.sheet);
  }

  function injectStyle() {
    if (styled()) return;
    if (styleNode && styleNode.isConnected) return;
    if (!styleNode && typeof CSSStyleSheet === 'function' && 'replaceSync' in CSSStyleSheet.prototype
      && 'adoptedStyleSheets' in Document.prototype) {
      try {
        if (!styleSheet) {
          styleSheet = new CSSStyleSheet();
          styleSheet.replaceSync(CSS_TEXT);
        }
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
        return;
      } catch (_) { styleSheet = null; }
    }
    const node = document.createElement('style');
    node.dataset.btpVs = OWNED;
    node.textContent = CSS_TEXT;
    (document.head || document.documentElement).appendChild(node);
    styleNode = node;
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
    btn.dataset.btpVs = OWNED;
    btn.setAttribute('aria-label', '回到顶部');
    btn.title = '回到顶部';

    const svg = svgEl('svg', { viewBox: '0 0 56 56', 'aria-hidden': 'true' });
    const defs = svgEl('defs', {});
    const grad = svgEl('linearGradient', { id: GRAD_ID, x1: '0', y1: '0', x2: '1', y2: '1' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#818cf8' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#f472b6' }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(svgEl('circle', { id: PREFIX + 'track', cx: '28', cy: '28', r: '24', fill: 'none', 'stroke-width': '3' }));
    svg.appendChild(svgEl('circle', {
      id: RING_ID, cx: '28', cy: '28', r: '24', fill: 'none', 'stroke-width': '3',
      'stroke-linecap': 'round', transform: 'rotate(-90 28 28)',
      'stroke-dasharray': C.toFixed(2), 'stroke-dashoffset': C.toFixed(2),
    }));
    svg.appendChild(svgEl('path', {
      id: PREFIX + 'arrow', d: 'M28 15 L28 40 M19 24 L28 15 L37 24', fill: 'none',
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
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || (document.body ? document.body.scrollTop : 0) || 0;
  }

  function scrollMetrics() {
    const root = activeScrollRoot.isConnected ? activeScrollRoot : pageScrollRoot();
    const isPage = root === pageScrollRoot();
    const top = isPage ? getWindowScroll() : root.scrollTop;
    const max = root.scrollHeight - root.clientHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
    return { progress, top };
  }

  function buttonAlive() {
    return !!btn && btn.isConnected && !!progressEl && progressEl.isConnected;
  }

  function healthy() {
    return buttonAlive() && styled();
  }

  function ensure() {
    if (healthy()) return;
    injectStyle();
    if (!styled()) return;
    if (buttonAlive()) return;
    const squatter = document.querySelector('button#' + BTN_ID + '[data-btp-vs]');
    if (squatter && squatter.dataset.btpVs === OWNED) squatter.remove();
    const fresh = createButton();
    attach(fresh);
    document.documentElement.appendChild(fresh);
  }

  function attach(button) {
    btn = button;
    progressEl = button.querySelector('#' + RING_ID);
    button.addEventListener('click', scrollToTop);
  }

  function scrollToTop() {
    const behavior = reduceMotion ? 'auto' : 'smooth';
    const root = activeScrollRoot.isConnected ? activeScrollRoot : pageScrollRoot();
    try { root.scrollTo({ top: 0, left: 0, behavior }); } catch (_) { root.scrollTop = 0; }
  }

  let ticking = false;
  function update() {
    ticking = false;
    ensure();
    if (!healthy()) return;
    const { progress, top } = scrollMetrics();
    progressEl.style.strokeDashoffset = (C * (1 - progress)).toFixed(2);
    btn.classList.toggle(PREFIX + 'visible', top > THRESHOLD);
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function onScroll(event) {
    const target = event && event.target;
    activeScrollRoot = target === document || target === document.documentElement || target === document.body
      ? pageScrollRoot()
      : target;
    schedule();
  }

  function watch() {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true });
  }

  function init() {
    if (!document.body) return;
    update();
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('popstate', schedule);
    window.addEventListener('hashchange', schedule);
    watch();
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
