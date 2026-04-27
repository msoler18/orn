/* eslint-disable */
/**
 * orn-footer — Alpine component (window.ornFooter)
 *
 * Loaded BEFORE alpine.min.js (see snippets/scripts.liquid).
 *
 * Responsibilities:
 *  - Smooth-scroll for internal anchor links inside the footer
 *    (CTA band button + any link group item whose href starts with "#").
 *    Targets honor scroll-margin-top: var(--header-height) provided by
 *    the floating header (ADR-0003) and consumed by orn-contact-form.
 *  - Pill reveal: IntersectionObserver toggles `.is-revealed` on the
 *    tagline container so CSS can animate the rotated pill into view.
 *  - Respects prefers-reduced-motion.
 */
window.ornFooter = function ornFooter() {
  return {
    pillRevealed: false,
    _io: null,

    init() {
      this._setupAnchors();
      this._setupPillReveal();
    },

    _setupAnchors() {
      const root = this.$el;
      if (!root) return;
      root.addEventListener('click', (ev) => {
        const a = ev.target.closest('a[data-orn-anchor="true"]');
        if (!a || !root.contains(a)) return;
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('#') || href.length < 2) return;
        const target = document.querySelector(href);
        if (!target) return;
        ev.preventDefault();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', href);
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    },

    _setupPillReveal() {
      const pill = this.$refs && this.$refs.pill;
      if (!pill) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.pillRevealed = true;
        return;
      }
      this._io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              this.pillRevealed = true;
              if (this._io) this._io.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      this._io.observe(pill);
    },
  };
};
