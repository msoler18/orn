/* Ornevo — orn-header. Alpine component: scroll-spy + smooth scroll + --header-height writer. */

window.ornHeader = function ornHeader(opts = {}) {
  return {
    enableSpy: opts.enableSpy !== false,
    sticky: opts.sticky !== false,
    activeAnchor: '',
    _io: null,
    _root: null,
    _onScroll: null,
    _onResize: null,
    _ro: null,

    init() {
      this._root = this.$el.closest('[data-orn-header-root]') || this.$el;
      this._writeHeaderHeight();
      this._setupResizeObserver();
      if (this.enableSpy) this._setupScrollSpy();

      if (location.hash) this.activeAnchor = location.hash;

      this._onScroll = () => {
        this._root.toggleAttribute('data-scrolled', window.scrollY > 4);
      };
      this._onScroll();
      window.addEventListener('scroll', this._onScroll, { passive: true });
    },

    _writeHeaderHeight() {
      if (!this._root) return;
      const rect = this._root.getBoundingClientRect();
      const total = Math.max(rect.bottom, this._root.offsetHeight + this._topOffset());
      document.body.style.setProperty('--header-height', `${Math.round(total)}px`);
    },

    _topOffset() {
      const v = getComputedStyle(this._root).getPropertyValue('--orn-header-top-offset').trim();
      return parseInt(v, 10) || 0;
    },

    _setupResizeObserver() {
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => this._writeHeaderHeight());
        this._ro.observe(this._root);
      }
      this._onResize = () => this._writeHeaderHeight();
      window.addEventListener('resize', this._onResize);
    },

    _setupScrollSpy() {
      const links = Array.from(this.$el.querySelectorAll('.orn-header__link[data-target-kind="anchor"]'));
      const targets = links
        .map((a) => a.getAttribute('data-anchor'))
        .filter((h) => h && h.startsWith('#') && h.length > 1)
        .map((h) => {
          try { return document.querySelector(h); } catch (_) { return null; }
        })
        .filter(Boolean);
      if (!targets.length) return;

      const offsetVar = getComputedStyle(this._root).getPropertyValue('--orn-header-scroll-offset').trim();
      const offsetPx = parseInt(offsetVar, 10) || 120;

      this._io = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
          if (visible.length && visible[0].target.id) {
            this.activeAnchor = '#' + visible[0].target.id;
          }
        },
        {
          rootMargin: `-${offsetPx}px 0px -55% 0px`,
          threshold: [0, 0.1, 0.5, 1],
        }
      );
      targets.forEach((t) => this._io.observe(t));
    },

    onAnchorClick(ev, anchor) {
      if (!anchor || !anchor.startsWith('#')) return;
      let el = null;
      try { el = document.querySelector(anchor); } catch (_) { el = null; }
      if (!el) return;
      ev.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      this.activeAnchor = anchor;
      try { history.replaceState(null, '', anchor); } catch (_) {}
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    },
  };
};
