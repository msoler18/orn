# ADR-0003: Header flotante Ornevo (sticky pill) sobre Horizon

**Date:** 2026-04-26
**Author(s):** Miguel Soler
**Status:** Proposed

## Context

Construimos el header definitivo de la landing de Ornevo. Diseños:

- Desktop: `landing/header/menu_desktop.png` — header **flotante** (no toma 100% del width, no está pegado a la parte superior), forma de **píldora** con sombra, **sticky** al hacer scroll. Layout interno: logo a la izquierda, nav central (`Servicios`, `Partners`, `Nosotros`, `Equipo`, `Blog`, `Testimonios`) con **indicador inferior** sobre el link activo (en el mock, `Servicios`), y un CTA negro con flecha (`¿Un proyecto? →`) a la derecha.
- Mobile: `landing/header/menu_responsive.png` — sticky, **sin hamburguesa**: solo logo a la izquierda y CTA `¿Un proyecto?` a la derecha.
- Mobile abierto (`menu_responsive_open.png`): **se ignora por ahora** — los links son anclas en la misma página y no hay otras páginas a las que navegar.

Restricciones/decisiones del cliente (Miguel) para esta iteración:

- **Sin selector de idioma** ni multilenguaje (ocultar `localization` por completo, no solo desactivar).
- **Sin hamburguesa** en mobile; el menú no se abre. Solo logo + CTA.
- **Todos los links** del nav y el CTA hacen **scroll suave** a una sección de la misma página (anclas tipo `#servicios`).
- **Todo editable desde el theme editor** del header (textos, anclas, logo, colores, offset flotante, radio, sombra, sticky on/off).

Stack vigente (ADR-0001 + secciones `orn-hero` y `orn-services`):

- Alpine.js cargado vía `snippets/scripts.liquid` (orden: componentes → `alpine.min.js`). Verificado en líneas 277–285: `orn-hero.js`, `orn-services.js`, **luego** `alpine.min.js`.
- CSS y JS por sección viven en `assets/<nombre>.css` y `assets/<nombre>.js`, registrados en `snippets/stylesheets.liquid` y `snippets/scripts.liquid`.
- Convención de naming: prefijo `orn-` para secciones propias; bloques con `_orn-<seccion>-<bloque>.liquid`.
- Color schemes nativos (ADR-0001); botones `.ornevo-btn--primary|secondary|tertiary` (ADR-0001).
- `--header-height` es una **CSS custom property en `body`** consumida por el código existente (`scroll-margin-top: var(--header-height, 80px)` en `sections/orn-services.liquid` línea ~ del bloque CSS, y por `layout/theme.liquid` líneas 79–80 que la setean **solo si existe `header-component`**).

El header de Horizon (`sections/header.liquid` + `sections/header-group.json` → `header_section.type = "header"`) es genérico, multi-row, con drawer móvil, localization y mega-menu. **No se adapta** al diseño de Ornevo (píldora flotante con scroll-spy y sin drawer). Editar `header.liquid` directamente nos garantiza conflictos en cada `horizon-update-*`.

## Decision drivers

- **Must:** el header de Ornevo es una **sección nueva** `sections/orn-header.liquid` que **reemplaza** la referencia `"type": "header"` dentro de `sections/header-group.json` (`header_section.type = "orn-header"`). No tocamos `sections/header.liquid` (queda en el repo, dormido, para no romper futuros merges de Horizon).
- **Must:** sticky configurable (`enable_sticky` on/off). Cuando sticky, queda fijo respetando un `top_offset` (gap superior) — sigue siendo flotante (no pegado al borde), también cuando está stickeado.
- **Must:** flotante = `max-width: calc(100% - 2 * side_inset)` + `border-radius`. `side_inset`, `top_offset`, `radius` y `shadow` son settings.
- **Must:** scroll-spy. El link activo se calcula observando los anchors objetivo con `IntersectionObserver`. Cambia con suavidad sin saltos.
- **Must:** click en link o CTA → `preventDefault` + scroll suave al elemento, respetando offset (no quedan ocultos detrás de la píldora). Actualiza `location.hash` sin disparar reload.
- **Must:** **el componente expone `--header-height` en `<body>`** (incluyendo el `top_offset`), para que `scroll-margin-top: var(--header-height, …)` siga funcionando en `orn-services` y futuras secciones.
- **Must:** no renderiza language picker, country picker, search ni cart bubble (no son necesarios para esta landing). El CTA reemplaza al header-actions.
- **Must:** ARIA correcto: `<nav aria-label="Principal">`, link activo con `aria-current="true"`, focus-visible accesible.
- **Must:** `prefers-reduced-motion` desactiva el scroll suave (salto instantáneo).
- **Must:** en mobile (`< 750px`, breakpoint de Horizon) se ocultan los links del nav; quedan **logo (izq)** y **CTA (der)**.
- **Should:** un horizon-update no debería romper el header. Mitigado: nuestro código vive en `sections/orn-header.liquid`, `blocks/_orn-header-link.liquid`, `assets/orn-header.css/js` — completamente fuera del path de Horizon. Solo `sections/header-group.json` y `snippets/stylesheets.liquid`/`snippets/scripts.liquid` reciben edits puntuales (igual que `orn-hero` y `orn-services`).
- **Should:** transiciones < 300ms; respeta `prefers-reduced-motion`.
- **Nice to have:** el header puede cambiar de estilo cuando `data-scrolled="true"` (sombra más marcada después del scroll).

## Decision

Creamos sección **`sections/orn-header.liquid`** + bloque **`blocks/_orn-header-link.liquid`**, controlada por el componente Alpine **`ornHeader`** en **`assets/orn-header.js`**, con estilos en **`assets/orn-header.css`**. Cambiamos la referencia en `sections/header-group.json` para que apunte a `orn-header` en lugar de `header`. Eliminamos `header_announcements_*` del `order` del header-group (el diseño no lo contempla; el archivo de la sección queda en disco para reuso futuro).

### 1. Estructura de archivos

```
sections/orn-header.liquid              # shell + nav + render de link blocks + CTA
blocks/_orn-header-link.liquid          # un link del nav (label + anchor o url)
assets/orn-header.css                   # layout flotante, sticky, indicador activo
assets/orn-header.js                    # componente Alpine ornHeader (scroll-spy + smooth scroll + --header-height)
```

Sin snippet auxiliar — el bloque es lo bastante simple para no fragmentarlo.

### 2. Registro

- `snippets/stylesheets.liquid` → añadir `{{ 'orn-header.css' | asset_url | stylesheet_tag }}` **debajo** de `orn-services.css` (orden: ornevo-buttons → orn-hero → orn-services → orn-header).
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-header.js' | asset_url }}" defer></script>` **antes** de `alpine.min.js` y junto a `orn-services.js` / `orn-hero.js` (mismo patrón).
- `sections/header-group.json` → en `sections.header_section`:
  - cambiar `"type": "header"` → `"type": "orn-header"`.
  - **borrar** todos los `blocks` (`header-logo`, `header-menu`) y todos los `settings` (heredados de Horizon: `logo_position`, `menu_position`, `show_search`, `show_country`, `show_language`, etc.) — `orn-header` define su propio schema y los settings antiguos son inválidos para el nuevo `type`.
  - dejar los settings que correspondan al nuevo schema (ver §3) con sus defaults.
- `sections/header-group.json` → en `order`, **eliminar** `header_announcements_9jGBFp` (el bloque queda definido en `sections` pero ya no se renderiza). Si en el futuro se quiere reactivar, basta con re-añadirlo al `order`.
- **No editar** `sections/header.liquid` ni `sections/header-announcements.liquid`. **No editar** `layout/theme.liquid` — nuestro componente Alpine setea `--header-height` directamente sobre `<body>`, y el bloque inline de `theme.liquid` (líneas 55–80) hace early-return cuando no encuentra `header-component`, así que no entra en conflicto.

### 3. Schema de la sección (`orn-header`)

Como el header **no se renderiza vía metafield**, **sí** podemos usar `checkbox`, `range`, `textarea` libremente. No aplica la restricción del ADR-0002.

Settings de sección (con defaults explícitos para que un reset del editor reproduzca el diseño):

| id | type | default | notas |
|----|------|---------|-------|
| `logo` | `image_picker` | — | SVG/PNG horizontal del logotipo. |
| `logo_link_anchor` | `text` | `#top` | Hash o URL al que va el logo (el "home"). |
| `logo_height` | `range` (16–48 px, step 2) | `28` | Altura renderizada del logo. |
| `logo_alt` | `text` | `Ornevo` | Alt text del logo. |
| **header** | — | — | "Comportamiento" |
| `enable_sticky` | `checkbox` | `true` | Activa `position: sticky`. |
| `top_offset` | `range` (0–48 px, step 2) | `16` | Gap superior (cuando sticky, también es el `top` del sticky). |
| `side_inset` | `range` (0–80 px, step 2) | `24` | Margen lateral (mantiene la "flotación"). |
| `radius` | `range` (0–80 px, step 2) | `48` | `border-radius` del contenedor (píldora). |
| `enable_shadow` | `checkbox` | `true` | Activa la sombra del contenedor. |
| `shadow_intensity` | `select` (`subtle`/`medium`/`strong`) | `subtle` | Mapea a tres niveles preestablecidos. |
| **header** | — | — | "Colores" |
| `color_scheme` | `color_scheme` | `scheme-1` | Esquema del header (light por defecto). |
| `link_color_active` | `color` | `#0D4F4A` | Color del indicador inferior y del link activo (override visual). |
| **header** | — | — | "CTA" |
| `cta_text` | `text` | `¿Un proyecto?` | Texto del botón. |
| `cta_target_anchor` | `text` | `#contacto` | Hash o URL al que hace scroll/redirige. |
| `cta_variant` | `select` (`primary`/`secondary`/`tertiary`) | `primary` | Estilo del DS. Default `primary` (negro/oscuro según ADR-0001 mapping). |
| `cta_show_arrow` | `checkbox` | `true` | Muestra `→` al final del label (icono inline SVG). |
| `cta_show_on_mobile` | `checkbox` | `true` | Si `false`, en mobile se oculta también el CTA (caso edge). |
| **header** | — | — | "Scroll-spy" |
| `enable_scroll_spy` | `checkbox` | `true` | Activa el indicador automático del link activo según viewport. |
| `scroll_spy_offset` | `range` (0–200 px, step 10) | `120` | Margen superior del observer (ajusta cuándo un link se considera activo respecto a la posición del header). |

`max_blocks: 8` (por si algún día se necesitan más). `presets: []` — la sección no se inserta a mano; se monta solo desde `header-group.json`.

`enabled_on.groups: ["header"]` para limitar dónde puede usarse.

### 4. Schema del bloque (`_orn-header-link`)

Un bloque = un link del nav. En desktop se renderizan todos. En mobile, todos quedan ocultos (`display: none`).

| id | type | default | notas |
|----|------|---------|-------|
| `label` | `text` | `Servicios` | Texto del link. |
| `target_kind` | `select` (`anchor` / `url`) | `anchor` | Define el comportamiento del click. |
| `anchor` | `text` | `#servicios` | Hash al que hace scroll-spy + smooth scroll. Visible si `target_kind == 'anchor'`. |
| `url` | `url` | — | Destino externo o página interna. Visible si `target_kind == 'url'`. |
| `open_in_new_tab` | `checkbox` | `false` | Solo si `target_kind == 'url'`. |

`name: "Link"`. Bloque del tipo regular (no `@theme`); registrado en `_blocks.liquid` por convención de Horizon **solo si hace falta** — `_orn-header-link` no lo necesita porque vive en `sections/orn-header.liquid` con `content_for 'blocks'`.

### 5. Markup (resumen)

```liquid
{% liquid
  assign cta_anchor = section.settings.cta_target_anchor | default: '#contacto'
  assign sticky_attr = ''
  if section.settings.enable_sticky
    assign sticky_attr = 'data-sticky="true"'
  endif

  assign shadow_class = 'orn-header__shell--shadow-' | append: section.settings.shadow_intensity
  if section.settings.enable_shadow == false
    assign shadow_class = 'orn-header__shell--shadow-none'
  endif
%}

<div class="orn-header-wrapper color-{{ section.settings.color_scheme }}"
     {{ sticky_attr }}
     data-orn-header-root
     style="
       --orn-header-top-offset: {{ section.settings.top_offset }}px;
       --orn-header-side-inset: {{ section.settings.side_inset }}px;
       --orn-header-radius: {{ section.settings.radius }}px;
       --orn-header-active-color: {{ section.settings.link_color_active }};
       --orn-header-scroll-offset: {{ section.settings.scroll_spy_offset }}px;
     ">
  <header class="orn-header"
          x-data="ornHeader({ enableSpy: {{ section.settings.enable_scroll_spy }}, sticky: {{ section.settings.enable_sticky }} })"
          x-init="init()"
          aria-label="Cabecera del sitio">
    <div class="orn-header__shell {{ shadow_class }}">

      <a class="orn-header__logo" href="{{ section.settings.logo_link_anchor | default: '#top' }}"
         @click="onAnchorClick($event, '{{ section.settings.logo_link_anchor | default: '#top' }}')">
        {%- if section.settings.logo != blank -%}
          {{ section.settings.logo | image_url: width: 400
              | image_tag: alt: section.settings.logo_alt,
                          loading: 'eager',
                          class: 'orn-header__logo-img',
                          style: 'height:' | append: section.settings.logo_height | append: 'px;' }}
        {%- else -%}
          <span class="orn-header__logo-text">{{ section.settings.logo_alt | default: shop.name }}</span>
        {%- endif -%}
      </a>

      <nav class="orn-header__nav" aria-label="Principal">
        <ul class="orn-header__list" role="list">
          {%- for block in section.blocks -%}
            {%- liquid
              assign is_anchor = false
              if block.settings.target_kind == 'anchor'
                assign is_anchor = true
              endif
              assign href = block.settings.url
              if is_anchor
                assign href = block.settings.anchor
              endif
            -%}
            <li class="orn-header__item">
              <a class="orn-header__link"
                 href="{{ href }}"
                 data-anchor="{{ block.settings.anchor }}"
                 data-target-kind="{{ block.settings.target_kind }}"
                 :class="{ 'is-active': activeAnchor === '{{ block.settings.anchor }}' }"
                 :aria-current="activeAnchor === '{{ block.settings.anchor }}' ? 'true' : 'false'"
                 {% if is_anchor %}@click="onAnchorClick($event, '{{ block.settings.anchor }}')"{% endif %}
                 {% if block.settings.open_in_new_tab and is_anchor == false %}target="_blank" rel="noopener"{% endif %}
                 {{ block.shopify_attributes }}>
                <span class="orn-header__link-label">{{ block.settings.label }}</span>
                <span class="orn-header__link-indicator" aria-hidden="true"></span>
              </a>
            </li>
          {%- endfor -%}
        </ul>
      </nav>

      <a class="orn-header__cta ornevo-btn ornevo-btn--{{ section.settings.cta_variant }}
                {% if section.settings.cta_show_on_mobile == false %}orn-header__cta--desktop-only{% endif %}"
         href="{{ cta_anchor }}"
         @click="onAnchorClick($event, '{{ cta_anchor }}')">
        <span>{{ section.settings.cta_text }}</span>
        {%- if section.settings.cta_show_arrow -%}
          <svg class="orn-header__cta-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {%- endif -%}
      </a>

    </div>
  </header>
</div>

{% schema %}
…(ver §3, §4 — JSON completo en Implementation notes)
{% endschema %}
```

### 6. Componente Alpine `ornHeader` (assets/orn-header.js)

```js
window.ornHeader = function ornHeader(opts = {}) {
  return {
    enableSpy: opts.enableSpy !== false,
    sticky: opts.sticky !== false,
    activeAnchor: '',
    _io: null,
    _root: null,

    init() {
      this._root = this.$el.closest('[data-orn-header-root]') || this.$el;
      this._writeHeaderHeight();
      this._setupResizeObserver();
      if (this.enableSpy) this._setupScrollSpy();
      // Reflect initial hash if present
      if (location.hash) this.activeAnchor = location.hash;
      // data-scrolled toggle
      this._onScroll = () => {
        this._root.toggleAttribute('data-scrolled', window.scrollY > 4);
      };
      this._onScroll();
      window.addEventListener('scroll', this._onScroll, { passive: true });
    },

    _writeHeaderHeight() {
      const rect = this._root.getBoundingClientRect();
      // bottom of pill, including top_offset, gives the offset future sections must clear
      const total = Math.max(rect.bottom, this._root.offsetHeight + this._topOffset());
      document.body.style.setProperty('--header-height', `${Math.round(total)}px`);
    },

    _topOffset() {
      const v = getComputedStyle(this._root).getPropertyValue('--orn-header-top-offset').trim();
      return parseInt(v, 10) || 0;
    },

    _setupResizeObserver() {
      const ro = new ResizeObserver(() => this._writeHeaderHeight());
      ro.observe(this._root);
      window.addEventListener('resize', () => this._writeHeaderHeight());
    },

    _setupScrollSpy() {
      const links = Array.from(this.$el.querySelectorAll('.orn-header__link[data-target-kind="anchor"]'));
      const targets = links
        .map((a) => a.getAttribute('data-anchor'))
        .filter((h) => h && h.startsWith('#') && h.length > 1)
        .map((h) => document.querySelector(h))
        .filter(Boolean);
      if (!targets.length) return;

      const offsetVar = getComputedStyle(this._root).getPropertyValue('--orn-header-scroll-offset').trim();
      const offsetPx = parseInt(offsetVar, 10) || 120;

      this._io = new IntersectionObserver(
        (entries) => {
          // Pick the entry whose bounding rect top is closest to (and >= 0) of the offset line
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
          if (visible.length) {
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
      if (!anchor || !anchor.startsWith('#')) return; // let url-kind navigate normally
      const el = document.querySelector(anchor);
      if (!el) return; // anchor not yet in DOM — let browser handle (will jump if id appears later)
      ev.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      this.activeAnchor = anchor;
      // Update URL hash without jumping
      history.replaceState(null, '', anchor);
      // Move focus to target for a11y (without scroll)
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    },
  };
};
```

> Importante: **no usar `Alpine.data(...)`** porque el orden de carga es `orn-header.js` → `alpine.min.js`. Definimos `window.ornHeader` y lo invocamos vía `x-data="ornHeader({...})"` (Alpine resuelve identificadores globales). Mismo patrón que `ornHero` y `ornServices` ya en uso.

### 7. CSS — píldora flotante + sticky + indicador (assets/orn-header.css)

```css
.orn-header-wrapper {
  --orn-header-pad-y: 14px;
  --orn-header-pad-x: 28px;
  --orn-header-shell-bg: var(--color-background, #fff);
  --orn-header-shell-fg: var(--color-foreground, #0F1720);
  position: relative;
  width: 100%;
  z-index: 100;
}

.orn-header-wrapper[data-sticky='true'] {
  position: sticky;
  top: var(--orn-header-top-offset, 16px);
  z-index: 100;
}

.orn-header {
  display: flex;
  justify-content: center;
  pointer-events: none; /* sólo el shell intercepta eventos */
  padding-top: var(--orn-header-top-offset, 16px);
}
.orn-header-wrapper[data-sticky='true'] .orn-header { padding-top: 0; }

.orn-header__shell {
  pointer-events: auto;
  width: calc(100% - 2 * var(--orn-header-side-inset, 24px));
  max-width: 1320px;
  background: var(--orn-header-shell-bg);
  color: var(--orn-header-shell-fg);
  border-radius: var(--orn-header-radius, 48px);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--gap-xl, 24px);
  padding: var(--orn-header-pad-y) var(--orn-header-pad-x);
  transition: box-shadow .25s ease, transform .25s ease;
}

.orn-header__shell--shadow-subtle  { box-shadow: 0 4px 16px rgba(15,23,32,.06); }
.orn-header__shell--shadow-medium  { box-shadow: 0 8px 24px rgba(15,23,32,.10); }
.orn-header__shell--shadow-strong  { box-shadow: 0 12px 32px rgba(15,23,32,.16); }
.orn-header__shell--shadow-none    { box-shadow: none; }

.orn-header-wrapper[data-scrolled] .orn-header__shell {
  /* slight bump cuando hay scroll, sin cambiar de variante */
  box-shadow: 0 10px 28px rgba(15,23,32,.12);
}

.orn-header__logo { display: inline-flex; align-items: center; }
.orn-header__logo-img { display: block; width: auto; }
.orn-header__logo-text { font-family: var(--font-heading--family); font-weight: 700; }

.orn-header__nav { display: flex; justify-content: center; }
.orn-header__list {
  display: flex; gap: 32px; list-style: none; margin: 0; padding: 0;
}
.orn-header__link {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 10px 4px;
  font-family: var(--font-body--family);
  font-size: 1rem;
  color: inherit;
  text-decoration: none;
  transition: color .2s ease;
}
.orn-header__link:hover { color: var(--orn-header-active-color, #0D4F4A); }

.orn-header__link-indicator {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%) scaleX(0);
  transform-origin: center;
  width: 60%;
  height: 2px;
  background: var(--orn-header-active-color, #0D4F4A);
  transition: transform .25s var(--ease-out-cubic, cubic-bezier(.65,.05,.35,1));
}
.orn-header__link.is-active { color: var(--orn-header-active-color, #0D4F4A); }
.orn-header__link.is-active .orn-header__link-indicator { transform: translateX(-50%) scaleX(1); }

.orn-header__cta { white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; }
.orn-header__cta-arrow { flex-shrink: 0; }

@media (prefers-reduced-motion: reduce) {
  .orn-header__shell, .orn-header__link-indicator { transition: none; }
}

/* Mobile: sin nav, sin hamburguesa */
@media (max-width: 749px) {
  .orn-header__shell {
    grid-template-columns: auto 1fr auto;
    padding-inline: 16px;
    gap: 12px;
  }
  .orn-header__nav { display: none; }
  .orn-header__cta--desktop-only { display: none; }
}

/* Focus visible */
.orn-header__link:focus-visible,
.orn-header__cta:focus-visible,
.orn-header__logo:focus-visible {
  outline: 2px solid #4ec0de;
  outline-offset: 3px;
  border-radius: 8px;
}
```

### 8. Accesibilidad

- `<header>` con landmark implícito + `aria-label="Cabecera del sitio"`.
- `<nav aria-label="Principal">` con `<ul role="list">` (CSS reset elimina list-style por defecto).
- Link activo: `aria-current="true"` (no `"page"`, porque dentro de la misma página seguimos siendo "true"/"location").
- Focus visible: outline 2px `#4ec0de` (acento) sobre links/CTA/logo.
- `prefers-reduced-motion`: scroll instantáneo en `onAnchorClick`; transitions del indicador desactivadas vía media query.
- `IntersectionObserver` no roba scroll ni teclado: solo refleja estado.
- Logo lleva `alt` editable; si está vacío, fallback a `shop.name`.

### 9. `--header-height` y compatibilidad con resto del tema

- `assets/orn-header.js` setea `document.body.style.--header-height = bottom-of-pill px` en `init()` y al `resize` (`ResizeObserver` + `window.resize`).
- Esto preserva el contrato que `sections/orn-services.liquid` usa: `scroll-margin-top: var(--header-height, 80px)`. Verificado: hace que el ancla aterrice **debajo** del header flotante (incluyendo `top_offset`), no detrás.
- El bloque inline en `layout/theme.liquid` (líneas 55–80) hace `if (!header || !headerGroup) return;` y `header = document.querySelector('header-component')`. Como `orn-header` no usa el custom element `header-component`, ese bloque hace early-return → no pisa nuestro valor.

### 10. Eliminación del language picker / Horizon header

- En `sections/header-group.json`, `header_section.type` cambia a `orn-header` y el sub-objeto `blocks` queda **vacío** (sin `header-logo` ni `header-menu`, que son tipos del `header.liquid` original).
- Los `settings` heredados de Horizon (`show_country`, `show_language`, `show_search`, `customer_account_menu`, `enable_transparent_header_*`, `color_scheme_top`, etc.) se **eliminan** del JSON; quedan solo los del nuevo schema definidos en §3.
- `header_announcements_9jGBFp` se quita del array `order` (su sub-objeto en `sections` queda en disco; reactivar = añadirlo al `order` de nuevo). El usuario también puede ocultar/mostrar la barra desde el editor sin tocar JSON.
- `sections/header.liquid`, `blocks/_header-logo.liquid`, `blocks/_header-menu.liquid`, `snippets/header-row.liquid`, `snippets/header-actions.liquid`, `snippets/header-drawer.liquid`, `assets/header.js`, `assets/header.css`, etc., **no se borran**: dejan de cargarse porque ya no hay sección que los referencie. Mantenerlos minimiza el blast radius de futuros `horizon-update-*`.

## Consequences

**Positive:**
- Header flotante 1:1 con el diseño, completamente editable desde el theme editor.
- Sin selector de idioma ni hamburguesa: experiencia mobile coherente con el wireframe.
- Scroll-spy nativo (`IntersectionObserver`) y smooth scroll nativo: sin librerías.
- `--header-height` se sigue exponiendo, así que `orn-services` (y futuras secciones) siguen alineando sus anclas.
- Cambios aislados en 4 archivos nuevos + 3 archivos editados con patches mínimos. Resistente a `horizon-update-*`.

**Negative / trade-offs:**
- Se pierde acceso (de momento) a las features del header de Horizon: cart bubble, search, drawer, mega-menus. Si el negocio luego activa e-commerce real, habrá que extender `orn-header` o restaurar el header original. Mitigación: el código de Horizon queda en disco intacto.
- El header `orn-header` no tiene "modo transparente sobre hero" como el de Horizon (`enable_transparent_header_home`). El diseño no lo pide. Si el cliente lo solicita después, se añade vía un setting + clase CSS sin reestructurar.
- `--header-height` lo escribe nuestro JS (no Horizon) → si por alguna razón el JS no se ejecuta (CSP, error de carga), `scroll-margin-top` cae al fallback `80px` definido en `orn-services`. Aceptable como fallback razonable.

**Risks and mitigations:**
- **Riesgo:** un editor del cliente cambia `cta_target_anchor` a un anchor que no existe → el smooth scroll no encuentra `#contacto`. → **Mitigación:** `onAnchorClick` no llama `preventDefault` cuando el target no existe; el browser hace su comportamiento default (jump al anchor o no-op si no existe).
- **Riesgo:** `IntersectionObserver` no soportado (browsers muy viejos). → **Mitigación:** soporte universal en evergreen + Safari 12.1+. Sin polyfill.
- **Riesgo:** sticky + top_offset confunde a usuarios con keyboard nav (foco entra al elemento detrás del header). → **Mitigación:** `scroll-margin-top: var(--header-height)` ya cubre las anclas; para tabbing manual sobre elementos arbitrarios queda como aceptable trade-off (igual que cualquier header sticky).
- **Riesgo:** `horizon-update-*` cambia `sections/header-group.json`. → **Mitigación:** el archivo es JSON pequeño y nuestro patch es local (cambiar `type` y limpiar settings); si llega un merge conflict, se reaplica a mano como ya se hace con `templates/page.landing.json`.
- **Riesgo:** colisión entre `--header-height` que setea `layout/theme.liquid` (vía `header-component`) y el que setea `orn-header.js`. → **Mitigación:** verificado early-return; pero como defensa adicional, `orn-header.js` lo escribe en `_writeHeaderHeight` después de `init` y en cada resize, así gana por orden de escritura.
- **Riesgo:** logo PNG con tamaño "natural" rompe el alto definido por `logo_height`. → **Mitigación:** el `style` inline aplica `height` y `width:auto`; `image_url: width: 400` recorta a un máximo razonable.

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| Editar `sections/header.liquid` para imitar el diseño | Conflictos garantizados en cada `horizon-update-*`; el archivo tiene 1.6k líneas + features (drawer, mega-menu, localization) que no usamos. Riesgo de regresiones en checkout/PDP. |
| Crear `orn-header` pero **dejar** el header de Horizon también activo en el group | Doble header rendereado; el de Horizon sigue exponiendo `--header-height` desde `theme.liquid` y nuestro cálculo entra en conflicto. UX rota. |
| Implementar scroll-spy con `scroll` listener manual | Más código, más cálculos por frame; `IntersectionObserver` está 1:1 hecho para esto. |
| Smooth scroll con librería (`smooth-scroll.js`, `lenis`) | Sobra: `Element.scrollIntoView({behavior:'smooth'})` cubre el caso al 100%. `lenis` añadiría 8kB y un loop por frame. |
| Hamburguesa + drawer en mobile | El usuario lo pidió explícitamente: solo logo + CTA en mobile, sin menú abierto. Drawer suma complejidad innecesaria para una landing one-pager. |
| `<header>` con `position: fixed` en lugar de `sticky` | `fixed` saca el header del flow y obliga a sumar `padding-top` al `<main>` para no tapar el primer contenido. `sticky` mantiene el flow natural y es más fácil de deshabilitar (`enable_sticky` setting). |
| Menú activo controlado solo por `:target` CSS | `:target` se actualiza solo cuando el hash cambia explícitamente (click). No detecta scroll del usuario. Insuficiente para scroll-spy. |
| Bloque `_orn-header-link` con `select` para indicar "active by default" | Innecesario: el scroll-spy y `location.hash` cubren el estado activo dinámicamente. Un setting "force active" induciría inconsistencias. |

## Implementation notes

### Archivos a crear
- `sections/orn-header.liquid` — markup + schema completo (§3, §4) + `{% stylesheet %}` vacío (todo el CSS vive en `assets/orn-header.css`).
- `blocks/_orn-header-link.liquid` — bloque del link (un `<li>` no es necesario porque la sección ya lo envuelve; este archivo solo sirve si decidimos extraer el `<a>` para mantenibilidad — recomendación: **dejar el render del link inline en `sections/orn-header.liquid`** y que `blocks/_orn-header-link.liquid` solo declare `{% schema %}` con los settings de §4 (Shopify acepta block files con solo schema; el render se hace en la sección via `for block in section.blocks`).
- `assets/orn-header.css` — estilos de §7 (~150 líneas).
- `assets/orn-header.js` — componente Alpine de §6 (~80 líneas).

### Archivos a editar
- `snippets/stylesheets.liquid` → añadir `{{ 'orn-header.css' | asset_url | stylesheet_tag }}` debajo de `orn-services.css`.
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-header.js' | asset_url }}" defer></script>` junto a `orn-services.js`, **antes** de `alpine.min.js`.
- `sections/header-group.json`:
  1. En `sections.header_section`: cambiar `"type": "header"` → `"type": "orn-header"`.
  2. **Reemplazar** `sections.header_section.blocks` por `{}` (objeto vacío).
  3. **Reemplazar** `sections.header_section.settings` por el conjunto de defaults del nuevo schema (§3): `enable_sticky: true`, `top_offset: 16`, `side_inset: 24`, `radius: 48`, `enable_shadow: true`, `shadow_intensity: "subtle"`, `color_scheme: "scheme-1"`, `link_color_active: "#0D4F4A"`, `cta_text: "¿Un proyecto?"`, `cta_target_anchor: "#contacto"`, `cta_variant: "primary"`, `cta_show_arrow: true`, `cta_show_on_mobile: true`, `enable_scroll_spy: true`, `scroll_spy_offset: 120`, `logo_link_anchor: "#top"`, `logo_height: 28`, `logo_alt: "Ornevo"`. (Logo `image_picker` se subirá a mano desde el editor; queda vacío inicialmente.)
  4. En `order`, **eliminar** la entrada `"header_announcements_9jGBFp"`. El bloque `header_announcements_9jGBFp` permanece en `sections` pero ya no se renderiza.
- **No editar** `layout/theme.liquid`, `sections/header.liquid`, `sections/header-announcements.liquid`, ni cualquier asset existente.

### Estructura de blocks default en `header-group.json`

Cuatro a seis links iniciales (correspondientes al diseño). Añadir dentro de `sections.header_section.blocks`:

```json
"link-servicios":  { "type": "link", "settings": { "label": "Servicios",   "target_kind": "anchor", "anchor": "#servicios" } },
"link-partners":   { "type": "link", "settings": { "label": "Partners",    "target_kind": "anchor", "anchor": "#partners" } },
"link-nosotros":   { "type": "link", "settings": { "label": "Nosotros",    "target_kind": "anchor", "anchor": "#nosotros" } },
"link-equipo":     { "type": "link", "settings": { "label": "Equipo",      "target_kind": "anchor", "anchor": "#equipo" } },
"link-blog":       { "type": "link", "settings": { "label": "Blog",        "target_kind": "anchor", "anchor": "#blog" } },
"link-testimonios":{ "type": "link", "settings": { "label": "Testimonios", "target_kind": "anchor", "anchor": "#testimonios" } }
```

…y `block_order: ["link-servicios","link-partners","link-nosotros","link-equipo","link-blog","link-testimonios"]`.

> El `type` del block es `"link"` (que es el `name` del bloque file `_orn-header-link.liquid`; Shopify resuelve por el filename sin underscore-prefix, pero el `type` referencia el block name dado en el schema. **Confirmación:** en el header del archivo `blocks/_orn-header-link.liquid`, el `{% schema %}` debe llevar `"name": "Link"` y nada más; el "type" en `header-group.json` será `link`.)

### Verificación de naming de blocks

Para mantener el patrón con el resto del tema, el filename es **`_orn-header-link.liquid`** (con underscore por ser block, igual que `_orn-services-tab.liquid`). En el JSON del header-group, `"type": "link"` resuelve a `_orn-header-link` por convención de Horizon (los blocks con underscore se referencian sin él en el `type` del JSON sin embargo Shopify usa el filename completo sin extensión y sin underscore inicial; **revisar** patrón usado por `_orn-services-tab` en `templates/page.landing.json`: ahí se usa `"type": "tab"`. Adoptar mismo patrón → `"type": "link"` aquí).

### Variables CSS expuestas

```
--orn-header-top-offset      // px, gap superior (también top de sticky)
--orn-header-side-inset      // px, margen lateral del shell
--orn-header-radius          // px, border-radius del shell
--orn-header-active-color    // color del indicador inferior + link activo
--orn-header-scroll-offset   // px, offset del IntersectionObserver
--orn-header-pad-y           // py interno del shell (default 14px)
--orn-header-pad-x           // px interno del shell (default 28px)
--orn-header-shell-bg        // bg del shell (deriva de color_scheme por default)
--orn-header-shell-fg        // fg del shell (deriva de color_scheme por default)
```

### Orden de ejecución

1. Crear `assets/orn-header.css` con el contenido de §7.
2. Crear `assets/orn-header.js` con el componente Alpine de §6 (registrado como `window.ornHeader`).
3. Crear `blocks/_orn-header-link.liquid` con solo el `{% schema %}` de §4 (`name: "Link"`, settings).
4. Crear `sections/orn-header.liquid` con el markup de §5 + `{% schema %}` de §3 (incluyendo `"blocks": [{ "type": "link", "name": "Link" }]` y `enabled_on.groups: ["header"]`).
5. Editar `snippets/stylesheets.liquid` (añadir CSS) y `snippets/scripts.liquid` (añadir JS antes de `alpine.min.js`).
6. Editar `sections/header-group.json` según §"Archivos a editar" punto 4 — type, settings, blocks, block_order, order.
7. Smoke test (en theme editor):
   - Home `/` (template `index.json`): el header se ve flotante, sticky, con 6 links.
   - Resize a < 750px: nav oculto, logo + CTA visibles.
   - Click en cada link: scroll suave a su sección (los blocks de la landing `templates/page.landing.json` deben tener IDs `servicios`, `partners`, `nosotros`, `equipo`, `blog`, `testimonios` — coordinar con el setting `anchor_id` de `orn-services` y futuras secciones).
   - Scroll: el link correspondiente a la sección visible se subraya. Indicador transita en .25s.
   - Click `¿Un proyecto?`: scroll a `#contacto` (si existe; si no, no rompe).
   - Editar settings: cambiar `top_offset`, `side_inset`, `radius`, `enable_shadow`, `cta_text` → reflejado live.
   - DevTools → reduce motion: scroll instantáneo, sin animación de indicador.
   - axe-core: 0 violaciones en el header.
8. Test cross-template: abrir `/products/x` y `/collections/all` — el header se renderiza igual (los anchors no existirán en esos templates → click en link hace navegación normal o no-op; CTA hace lo mismo). Confirmar que **no** hay error en consola.
9. Confirmar que `--header-height` está seteado en `<body>`: `getComputedStyle(document.body).getPropertyValue('--header-height')` ≠ vacío. El primer panel de `orn-services` debe verse completo cuando se navega a `/landing#servicios`.

### Breakpoint

Reusar el de Horizon: **750px**. Mobile = `< 750px`.

### Anchors esperados en la landing (coordinación)

El header asume los siguientes IDs en `templates/page.landing.json` (con el setting `anchor_id` de cada sección):

| Anchor | Sección |
|--------|---------|
| `#servicios` | `orn-services` (ya existe; `anchor_id: "servicios"`) |
| `#partners` | _(pendiente — sección futura)_ |
| `#nosotros` | _(pendiente)_ |
| `#equipo` | _(pendiente)_ |
| `#blog` | _(pendiente — featured-blog-posts con anchor)_ |
| `#testimonios` | _(pendiente)_ |
| `#contacto` | _(pendiente — destino del CTA)_ |

> Los anchors que aún no existen no rompen el header: el link cae al fallback "no preventDefault" y el browser hace no-op si el `id` no se encuentra. Cuando se cree la sección, el anchor pasa a funcionar sin tocar el header.

## References

- Diseños: `landing/header/menu_desktop.png`, `landing/header/menu_responsive.png`.
- ADR-0001 — design system base (color schemes, fuentes, botones).
- ADR-0002 — `orn-services` (consumidor de `--header-height` y patrón de scroll-margin-top).
- Horizon v3.4.0 — `sections/header.liquid` (referencia, **no** se modifica), `sections/header-group.json` (**se edita**), `layout/theme.liquid` (**no** se modifica; verificada compatibilidad líneas 55–80).
- Patrón Alpine + window-global: `assets/orn-hero.js`, `assets/orn-services.js`.
- IntersectionObserver — https://developer.mozilla.org/docs/Web/API/Intersection_Observer_API
- WAI-ARIA Authoring Practices — Landmarks: https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/
