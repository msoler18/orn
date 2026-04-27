/* =========================================================================
 * orn-contact-form.js — ADR-0004
 * window.ornContactForm — Alpine factory for the contact form section.
 * Validation + phone auto-format + E.164 derivation + submit body composer.
 * ========================================================================= */

window.ornContactForm = function ornContactForm(opts = {}) {
  return {
    countryCode: opts.countryCode || '+33',
    rules: opts.rules || {},
    messageMax: opts.messageMax || 1000,
    submitting: false,
    success: false,
    hasErrors: false,
    values: {
      fullname: '',
      email: '',
      phone: '',
      company: '',
      website: '',
      select_1: '',
      select_2: '',
      message: '',
      honey: '',
    },
    errors: {},
    phoneE164: '',

    /* ----- lifecycle ----- */
    init() {
      // If Shopify rendered the page after a successful POST, the URL carries
      // ?contact_posted=true. Even if Liquid-side already mounted the success
      // block, set the Alpine flag so re-hydration / SPA-style nav stays in sync.
      try {
        const params = new URLSearchParams(location.search);
        if (params.get('contact_posted') === 'true') {
          this.success = true;
        }
      } catch (_) {
        // ignore — older browsers / no window
      }
    },

    /* ----- regex bank ----- */
    _re: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phoneNonDigits: /\D+/g,
      fullname: /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/,
      company: /^[A-Za-z0-9À-ÖØ-öø-ÿ\s.\-]+$/,
      website: /^https?:\/\/.+/i,
    },

    /* ----- error copy lookup -----
     * Reads error strings from <template data-error-source="<field>_<suffix>"
     * data-error-text="…"></template> blocks rendered by Liquid inside the form.
     */
    _errorText(field, suffix) {
      const el = this.$el.querySelector(
        `[data-error-source="${field}_${suffix}"]`
      );
      return el ? el.dataset.errorText || '' : '';
    },

    /* ----- per-field validator ----- */
    validateField(field) {
      const v = (this.values[field] || '').toString().trim();
      const required = !!this.rules[field];
      let err = '';

      if (!v) {
        if (required) err = this._errorText(field, 'error_required');
      } else {
        switch (field) {
          case 'fullname':
            if (
              v.length < 3 ||
              !this._re.fullname.test(v) ||
              !/\s/.test(v)
            ) {
              err = this._errorText(field, 'error_format');
            }
            break;
          case 'email':
            if (!this._re.email.test(v)) {
              err = this._errorText(field, 'error_format');
            }
            break;
          case 'phone': {
            const digits = v.replace(this._re.phoneNonDigits, '');
            if (digits.length < 7 || digits.length > 15) {
              err = this._errorText(field, 'error_format');
            }
            break;
          }
          case 'company':
            if (v.length < 2 || !this._re.company.test(v)) {
              err = this._errorText(field, 'error_format');
            }
            break;
          case 'website':
            if (!this._re.website.test(v)) {
              err = this._errorText(field, 'error_format');
            }
            break;
          case 'message':
            if (v.length < 10) {
              err = this._errorText(field, 'error_format');
            }
            break;
          // selects: no format validation, only required
          default:
            break;
        }
      }

      if (err) this.errors[field] = err;
      else delete this.errors[field];
      // trigger reactivity on Alpine
      this.errors = { ...this.errors };
      return !err;
    },

    /* ----- validate-all ----- */
    validateAll() {
      let ok = true;
      // Iterate every known field key (rules covers all canonical fields).
      Object.keys(this.values).forEach((f) => {
        if (f === 'honey') return;
        if (!this.validateField(f)) ok = false;
      });
      this.hasErrors = !ok;
      return ok;
    },

    /* ----- phone formatting ----- */
    onPhoneInput(ev) {
      const raw = (ev.target.value || '').replace(/[^\d+]/g, '');
      const plus = raw.startsWith('+') ? '+' : '';
      const digits = raw.replace(/\+/g, '');
      const formatted = digits.match(/.{1,2}/g)?.join(' ') || '';
      const display = plus + formatted;
      ev.target.value = display;
      this.values.phone = display;

      // Derive E.164:
      //  - leading 0 → swap for countryCode (FR style "0612…")
      //  - leading + → keep as is, prefixed with single '+'
      //  - else      → assume local digits → prepend countryCode
      let e164 = '';
      if (digits.startsWith('0')) {
        e164 = this.countryCode + digits.slice(1);
      } else if (plus === '+') {
        e164 = '+' + digits;
      } else if (digits.length >= 7) {
        e164 = this.countryCode + digits;
      }
      this.phoneE164 = e164;
    },

    /* ----- submit ----- */
    onSubmit(ev) {
      // Honeypot: if the hidden input is filled, abort silently.
      if ((this.values.honey || '').trim() !== '') {
        ev.preventDefault();
        return;
      }

      const ok = this.validateAll();
      if (!ok) {
        ev.preventDefault();
        const firstErr = Object.keys(this.errors)[0];
        if (firstErr) {
          const target = document.getElementById(`orn-contact-${firstErr}`);
          if (target && typeof target.focus === 'function') target.focus();
        }
        return;
      }

      // Compose a human-readable email body.
      const phoneLine =
        `Teléfono: ${this.values.phone}` +
        (this.phoneE164 ? `  (${this.phoneE164})` : '');

      const body = [
        `Empresa: ${this.values.company}`,
        `Nombre: ${this.values.fullname}`,
        `Email: ${this.values.email}`,
        phoneLine,
        `Sitio web: ${this.values.website || '—'}`,
        `Select 1: ${this.values.select_1 || '—'}`,
        `Select 2: ${this.values.select_2 || '—'}`,
        '',
        'Mensaje:',
        this.values.message || '—',
      ].join('\n');

      if (this.$refs && this.$refs.bodyField) {
        this.$refs.bodyField.value = body;
      }

      this.submitting = true;
      // Allow native submit to proceed.
    },
  };
};
