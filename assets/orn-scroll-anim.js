/*
 * Ornevo — scroll-triggered reveals (GSAP + ScrollTrigger).
 *
 * Fail-open design: content is visible by default. This JS sets the
 * initial hidden state via gsap.set() ONLY after GSAP has loaded
 * successfully, then animates to visible. If GSAP fails to load (CDN
 * blocked, network error), nothing happens and the original visible
 * state is preserved.
 *
 * Skip conditions:
 *   - Shopify.designMode (theme editor re-renders break ScrollTriggers)
 *   - prefers-reduced-motion: reduce
 *   - No targets present
 *
 * Selector explicitly excludes `.orn-loop-clone` descendants so the
 * infinite-loop's sibling clones never get bound to ScrollTriggers.
 */
(function () {
  'use strict';

  var GSAP_URL = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js';
  var ST_URL = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js';

  var TARGET_SELECTOR = '[data-orn-reveal]:not(.orn-loop-clone [data-orn-reveal])';

  function shouldSkip() {
    if (window.Shopify && window.Shopify.designMode === true) return true;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    return false;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-orn-cdn="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('Failed to load ' + src)); });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.dataset.ornCdn = src;
      s.addEventListener('load', function () { s.dataset.loaded = 'true'; resolve(); });
      s.addEventListener('error', function () { reject(new Error('Failed to load ' + src)); });
      document.head.appendChild(s);
    });
  }

  function ensureGsap() {
    if (window.gsap && window.ScrollTrigger) return Promise.resolve();
    var p = window.gsap ? Promise.resolve() : loadScript(GSAP_URL);
    return p.then(function () {
      if (window.ScrollTrigger) return;
      return loadScript(ST_URL);
    });
  }

  function presetFor(el) {
    return el.getAttribute('data-orn-reveal') || 'fade-up';
  }

  // Initial hidden states (only applied AFTER GSAP loads).
  var INITIAL = {
    'fade-up':   { opacity: 0, y: 28 },
    'fade-in':   { opacity: 0 },
    'scale-up':  { opacity: 0, scale: 0.96 },
  };

  function staggerChildrenOf(el) {
    return el.querySelectorAll(':scope > *:not([aria-hidden="true"])');
  }

  function setInitial(nodes) {
    nodes.forEach(function (el) {
      var preset = presetFor(el);
      if (preset === 'stagger-children') {
        var kids = staggerChildrenOf(el);
        if (kids && kids.length) {
          window.gsap.set(kids, { opacity: 0, y: 16 });
        }
        return;
      }
      var s = INITIAL[preset];
      if (s) window.gsap.set(el, s);
    });
  }

  function animateOne(el) {
    var preset = presetFor(el);
    var trigger = { trigger: el, start: 'top 85%', once: true };

    if (preset === 'fade-up') {
      window.gsap.to(el, {
        opacity: 1, y: 0,
        duration: 0.8, ease: 'power3.out', overwrite: 'auto',
        scrollTrigger: trigger,
      });
      return;
    }
    if (preset === 'fade-in') {
      window.gsap.to(el, {
        opacity: 1,
        duration: 0.8, ease: 'power3.out', overwrite: 'auto',
        scrollTrigger: trigger,
      });
      return;
    }
    if (preset === 'scale-up') {
      window.gsap.to(el, {
        opacity: 1, scale: 1,
        duration: 0.8, ease: 'power3.out', overwrite: 'auto',
        scrollTrigger: trigger,
      });
      return;
    }
    if (preset === 'stagger-children') {
      var kids = staggerChildrenOf(el);
      if (!kids || !kids.length) return;
      window.gsap.to(kids, {
        opacity: 1, y: 0,
        duration: 0.7, ease: 'power3.out', stagger: 0.08, overwrite: 'auto',
        scrollTrigger: trigger,
      });
      return;
    }
  }

  function init() {
    var nodes = document.querySelectorAll(TARGET_SELECTOR);
    if (!nodes.length) return;

    setInitial(nodes);
    nodes.forEach(animateOne);

    window.addEventListener('load', function () {
      if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
        window.ScrollTrigger.refresh();
      }
    }, { once: true });
  }

  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    if (shouldSkip()) return;
    if (!document.querySelector(TARGET_SELECTOR)) return;
    ensureGsap()
      .then(function () {
        if (window.gsap && window.ScrollTrigger) {
          window.gsap.registerPlugin(window.ScrollTrigger);
          init();
        }
      })
      .catch(function () {
        // CDN failed: fail-open. Content already visible by default — nothing to clean up.
      });
  }

  document.addEventListener('alpine:initialized', boot, { once: true });
  window.addEventListener('load', boot, { once: true });

  window.OrnScrollAnim = { boot: boot };
})();
