/*
 * Ornevo — Infinite scroll loop (ADR-0006, simplified)
 *
 * Strategy: clone <main> and <footer> as siblings (one copy above, one copy
 * below the original) WITHOUT moving or wrapping the original. Original
 * Alpine bindings stay intact because their nodes are never removed/moved.
 * Clones are sanitized (stripped of x-data, ids, names, etc.) so Alpine's
 * MutationObserver ignores them when they are inserted.
 *
 * On scroll, when scrollY leaves the original's range, we teleport scrollY
 * by ±H so the user always views the original. Visually seamless because
 * clones are pixel-identical to the original at the moment of the wrap.
 *
 * Boots on `alpine:initialized` so we know Alpine has already bound the
 * original DOM. `load` is a safety net in case Alpine ever fails to dispatch.
 */
(function () {
  'use strict';

  var FOCUSABLE = 'a,button,input,select,textarea,[tabindex],iframe,audio,video';
  var ALPINE_ATTRS = ['x-data', 'x-init', 'x-bind', 'x-model', 'x-ref', 'x-show', 'x-cloak', 'x-on', 'x-text', 'x-if', 'x-for', 'x-transition', 'x-effect', 'x-html'];

  function readConfig() {
    var node = document.querySelector('[data-orn-infinite-loop-root]');
    if (!node) return null;
    var bool = function (k) { return node.dataset[k] === 'true'; };
    var num = function (k, def) {
      var p = parseInt(node.dataset[k], 10);
      return isNaN(p) ? def : p;
    };
    return {
      enabled: bool('enabled'),
      disableOnReduceMotion: bool('disableOnReduceMotion'),
      disableBelowBreakpoint: num('disableBelowBreakpoint', 0),
      boundaryBuffer: num('boundaryBuffer', 64),
      debugOverlay: bool('debugOverlay'),
    };
  }

  function shouldEnable(cfg) {
    if (!cfg || !cfg.enabled) return false;
    if (window.Shopify && window.Shopify.designMode) return false;
    if (cfg.disableOnReduceMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (cfg.disableBelowBreakpoint > 0 && window.innerWidth < cfg.disableBelowBreakpoint) return false;
    return true;
  }

  function sanitizeClone(el) {
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
    el.setAttribute('data-nosnippet', '');
    el.classList.add('orn-loop-clone');

    el.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    el.querySelectorAll('[name]').forEach(function (n) { n.removeAttribute('name'); });
    el.querySelectorAll('form').forEach(function (f) {
      f.removeAttribute('action');
      f.setAttribute('onsubmit', 'return false');
    });
    el.querySelectorAll('video,audio').forEach(function (v) {
      v.removeAttribute('autoplay');
      try { v.pause(); } catch (e) { /* noop */ }
      v.muted = true;
    });
    el.querySelectorAll('img').forEach(function (img) { img.setAttribute('loading', 'lazy'); });
    el.querySelectorAll(FOCUSABLE).forEach(function (n) { n.setAttribute('tabindex', '-1'); });
    el.querySelectorAll('script').forEach(function (s) { s.remove(); });

    el.querySelectorAll('*').forEach(function (n) {
      ALPINE_ATTRS.forEach(function (a) { n.removeAttribute(a); });
      // Strip every Alpine-namespaced attribute (x-on:click, @click, :class, x-bind:foo, …)
      Array.prototype.slice.call(n.attributes).forEach(function (attr) {
        var name = attr.name;
        if (name.indexOf('x-') === 0 || name.charAt(0) === '@' || name.charAt(0) === ':') {
          n.removeAttribute(name);
        }
      });
      n.removeAttribute('data-section-id');
    });

    return el;
  }

  function init(cfg) {
    var main = document.querySelector('main');
    var footer = document.querySelector('body > footer');
    if (!main || !footer) return null;

    // Sanitize BEFORE inserting → Alpine MO never sees x-data on these nodes.
    var mainAbove = sanitizeClone(main.cloneNode(true));
    var footerAbove = sanitizeClone(footer.cloneNode(true));
    var mainBelow = sanitizeClone(main.cloneNode(true));
    var footerBelow = sanitizeClone(footer.cloneNode(true));

    // Layout: [...header-group, mainAbove, footerAbove, MAIN, FOOTER, mainBelow, footerBelow, ...]
    main.parentNode.insertBefore(footerAbove, main);
    main.parentNode.insertBefore(mainAbove, footerAbove);
    footer.parentNode.insertBefore(mainBelow, footer.nextSibling);
    footer.parentNode.insertBefore(footerBelow, mainBelow.nextSibling);

    var clones = [mainAbove, footerAbove, mainBelow, footerBelow];

    function origTop() { return main.offsetTop; }
    function H() { return main.offsetHeight + footer.offsetHeight; }
    function topBound() { return origTop() - cfg.boundaryBuffer; }
    function bottomBound() { return origTop() + H() + cfg.boundaryBuffer; }

    var debugEl = null;
    if (cfg.debugOverlay) {
      debugEl = document.createElement('div');
      debugEl.className = 'orn-loop-debug';
      document.body.appendChild(debugEl);
    }
    function paintDebug() {
      if (!debugEl) return;
      debugEl.textContent =
        'scrollY: ' + Math.round(window.scrollY) + '\n' +
        'origTop: ' + origTop() + '\n' +
        'H: ' + H() + '\n' +
        'topBound: ' + topBound() + '\n' +
        'bottomBound: ' + bottomBound();
    }

    function placeInitial() {
      window.scrollTo({ top: origTop(), behavior: 'instant' });
      var hash = location.hash;
      if (hash && hash.length > 1) {
        var el = document.querySelector(hash);
        if (el) {
          var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }
      }
    }

    var pending = false;
    function checkBounds() {
      var y = window.scrollY;
      var h = H();
      if (h <= 0) return;
      if (y < topBound()) {
        window.scrollTo({ top: y + h, behavior: 'instant' });
      } else if (y > bottomBound()) {
        window.scrollTo({ top: y - h, behavior: 'instant' });
      }
      paintDebug();
    }
    function onScroll() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; checkBounds(); });
    }

    var resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (cfg.disableBelowBreakpoint > 0 && window.innerWidth < cfg.disableBelowBreakpoint) {
          destroy();
          return;
        }
        // Re-clamp scrollY into the original range so we don't end up stranded in a clone.
        var y = window.scrollY;
        var h = H();
        var top = origTop();
        if (h > 0 && (y < top || y > top + h)) {
          var offset = ((y - top) % h + h) % h;
          window.scrollTo({ top: top + offset, behavior: 'instant' });
        }
        paintDebug();
      }, 150);
    }

    function onHashChange() {
      var hash = location.hash;
      if (!hash || hash.length < 2) return;
      var el = document.querySelector(hash);
      if (!el) return;
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }

    function destroy() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('hashchange', onHashChange);
      clones.forEach(function (c) { c.remove(); });
      if (debugEl) debugEl.remove();
    }

    placeInitial();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('hashchange', onHashChange);
    paintDebug();

    return { destroy: destroy };
  }

  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    if ('scrollRestoration' in history) {
      try { history.scrollRestoration = 'manual'; } catch (e) { /* noop */ }
    }
    var cfg = readConfig();
    if (!shouldEnable(cfg)) return;
    init(cfg);
  }

  // Wait for Alpine to finish initializing the original DOM. `load` is a fallback
  // in case Alpine is missing or never dispatches the event for some reason.
  document.addEventListener('alpine:initialized', boot, { once: true });
  window.addEventListener('load', boot, { once: true });

  window.OrnInfiniteLoop = { boot: boot, readConfig: readConfig };
})();
