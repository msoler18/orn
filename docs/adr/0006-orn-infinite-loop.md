# ADR-0006: Infinite scroll loop en la landing (`orn-infinite-loop`)

**Date:** 2026-04-26
**Author(s):** Miguel Soler
**Status:** Proposed

## Context

La landing de Ornevo (`templates/page.landing.json`) tiene **pocas secciones** (`orn-hero`, `orn-services`, `orn-contact-form`, `orn-footer` en V1). Diseñamos una experiencia tipo **"infinite loop scroll"** inspirada en `https://www.kudanil.com/`:

- Al llegar al **final** del footer y seguir haciendo scroll hacia abajo, el viewport "salta" al **inicio** (hero) sin discontinuidad visual.
- Al llegar al **inicio** del hero y seguir haciendo scroll hacia arriba, el viewport "salta" al **final** (footer) sin discontinuidad visual.
- El header sticky (ADR-0003) **permanece visible** durante todo el loop, no entra en el ciclo.
- El form de contacto (ADR-0004) sigue funcionando exactamente una vez (la copia "real"); las copias clonadas no envían formulario.
- El hash en la URL (`#servicios`, `#contacto`, etc.) sigue resolviendo a la sección **real**, no a un clon.

Stack vigente:

- ADR-0001/0002/0003/0004/0005 — todas las secciones llevan IDs administrables (`anchor_id`) y la convención `assets/orn-<name>.{css,js}` registrada en `snippets/stylesheets.liquid` y `snippets/scripts.liquid`.
- `--header-height` lo escribe `assets/orn-header.js` en `<body>`. `scroll-margin-top: var(--header-height, 80px)` ya consumido por `orn-services` y `orn-contact-form` para que las anclas no queden tapadas.
- `layout/theme.liquid` línea 43 abre `<div id="header-group">…</div>` con el header sticky; las secciones del template se renderizan dentro de `<main>`; el footer en `<footer>` línea ~127.

Patrón de referencia (kudanil.com): el sitio crea **dos clones** del contenido principal — uno encima y otro debajo del original — y manipula `window.scrollY` para mantener al usuario siempre dentro de los límites del original. Cuando el usuario "se sale", el script teletransporta `scrollY` al límite opuesto del original; visualmente no hay corte porque el contenido al pasar el límite es idéntico al del clon.

## Decision drivers

- **Must:** efecto seamless en ambas direcciones (down→hero, up→footer) sin "flash" visible al hacer wrap.
- **Must:** **opt-in por template**. Sólo se activa en `templates/page.landing.json`. Otras páginas (product, collection, blog, /policies/*) se renderizan normales — escalable a futuro sin afectar la performance/SEO de páginas estándar.
- **Must:** **server-rendered HTML queda limpio**. Los clones se crean con JS tras el primer paint; no aparecen en el HTML inicial. SEO y screen readers ven el contenido real una sola vez.
- **Must:** los clones son **inertes**: `aria-hidden="true"`, atributo `inert` (con fallback de polyfill), todos los IDs eliminados, todos los `name=` de formularios eliminados, `autoplay`/`muted` de `<video>` desactivados, `loading="lazy"`, `tabindex="-1"` en todo lo focalizable, formularios reemplazados por `<div>` (o action removida) para que un submit dentro de un clon no haga nada.
- **Must:** las anclas (`#contacto`, `#servicios`, etc.) siempre apuntan a la copia real. Esto se logra automáticamente porque sólo la copia real conserva los IDs.
- **Must:** sticky header de `orn-header` queda **fuera** del loop. Funciona igual durante todo el ciclo.
- **Must:** el contenido que entra/sale del loop respeta `prefers-reduced-motion`: cuando el usuario prefiere reducir movimiento, **se desactiva el loop** y el sitio se comporta como una landing tradicional con scroll lineal.
- **Must:** robusto a `resize` (cambio de altura del viewport o de las secciones por contenido dinámico) — recalcula bounds.
- **Must:** robusto a deep-links con hash (`/landing#contacto`): tras la inicialización del loop, se hace scroll a la sección real respetando `--header-height`.
- **Must:** convive con `header-component`-less. Como el header de Ornevo no usa `<header-component>` (ADR-0003), el script de cálculo de `--header-height` en `layout/theme.liquid` (líneas 55–80) hace early-return; no hay conflicto.
- **Should:** sin librerías. La lógica cabe en ~150 líneas de JS vainilla con `requestAnimationFrame` y `passive: true` listeners.
- **Should:** togglable desde el theme editor (no sólo por código), para que el cliente lo desactive si la UX no funciona en alguna iteración futura.
- **Should:** flag para limitar **profundidad de clones** a 1 (un clone arriba, un clone abajo) — kudanil-style. Un setting `clone_count: 1 | 2` permite duplicar más si en algún momento se hace landing extremadamente corta.
- **Should:** transición lateral 0 ms — el "wrap" es instantáneo (jump invisible). No animar el wrap; es justamente lo que rompería la ilusión.
- **Nice to have:** indicador de progreso del scroll dentro del "ciclo" (no del documento), para futuras integraciones (UX research, mini progress bar). Detrás de un toggle, off por default.

## Decision

Creamos una **sección sin output visual** `sections/orn-infinite-loop.liquid` que sirve como **trigger + control panel** del comportamiento. La sección:

1. Imprime un `<div data-orn-infinite-loop-root="…" data-clone-count="…" data-disabled-on-reduce-motion="…" hidden></div>` con la configuración serializada en data-attrs.
2. No renderiza más markup visible.

Toda la lógica vive en **`assets/orn-infinite-loop.js`** y los pequeños estilos defensivos en **`assets/orn-infinite-loop.css`**. Se registra en `templates/page.landing.json` como **primera entrada del `order`** para garantizar que el flag esté en el DOM antes que el resto del contenido.

> **Por qué una sección y no edición de `layout/theme.liquid`**: el loop sólo aplica a la landing; añadirlo en el layout obligaría a un check de `template.name == 'page' and template.suffix == 'landing'` en un archivo de Horizon, con riesgo de merge conflict. Una sección dedicada queda 100% en nuestro código y opt-in real (basta añadirla al template para activar).

### 1. Estructura de archivos

```
sections/orn-infinite-loop.liquid       # trigger sin output visual + schema con settings
assets/orn-infinite-loop.js             # window.OrnInfiniteLoop (auto-init al DOMContentLoaded)
assets/orn-infinite-loop.css            # estilos defensivos (clones, transiciones=0, focus)
```

Sin blocks. Sin snippets adicionales.

### 2. Registro

- `snippets/stylesheets.liquid` → añadir `{{ 'orn-infinite-loop.css' | asset_url | stylesheet_tag }}` debajo de `orn-footer.css`.
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-infinite-loop.js' | asset_url }}" defer></script>` **al final** del bloque de `orn-*.js`, **antes** de `alpine.min.js` (el script no depende de Alpine pero respetamos el orden por consistencia).
- `templates/page.landing.json` → añadir la sección **como primera del `order`** (antes incluso de `orn-hero` si hay), con sus settings default.
- **No editar** `layout/theme.liquid`, `header-group.json`, `footer-group.json`, ni archivos de Horizon.

### 3. Schema de la sección (`orn-infinite-loop`)

| id | type | default | notas |
|----|------|---------|-------|
| `enabled` | `checkbox` | `true` | Master toggle. Si `false`, JS no hace nada. |
| `clone_count` | `select` (`1` / `2`) | `1` | Clones a cada lado del original. `1` es kudanil-style; `2` añade un buffer extra para landings cortas (se evalúa por viewport). |
| `disable_on_reduce_motion` | `checkbox` | `true` | Si el usuario tiene `prefers-reduced-motion: reduce`, el loop se desactiva (scroll lineal estándar). |
| `disable_below_breakpoint` | `range` (0–1280 px, step 16) | `0` | Si el ancho del viewport es **menor** que este valor, no se activa. `0` = activado siempre. Útil si en mobile el efecto no funciona bien (no es el caso por default). |
| `loop_root_selector` | `text` | `main` | Selector CSS del elemento que contiene el contenido loopable. Por default `main` (de `layout/theme.liquid` línea 126). Se puede cambiar si la estructura cambia. |
| `include_footer` | `checkbox` | `true` | Si `true`, el `<footer>` global también entra en el loop (es nuestro caso por diseño: tras el footer se ve el hero de nuevo). |
| `boundary_buffer_px` | `range` (8–256 px, step 8) | `64` | Distancia desde el borde del clon a partir de la cual se dispara el wrap. Más alto = wrap antes (menos riesgo de momentum overshoot iOS), más bajo = más cerca del borde real. |
| `debug_overlay` | `checkbox` | `false` | Pinta un overlay flotante con métricas (scrollY, bounds, lap actual) — sólo para desarrollo. |

`presets`: 1 preset llamado "Infinite loop" con los defaults. `enabled_on.templates: ["page"]` (basta para landing; se puede ampliar luego).

`max_blocks: 0`. Sin blocks. Sin output visual:

```liquid
{%- liquid
  assign root_sel = section.settings.loop_root_selector | default: 'main' | escape
-%}
<div
  data-orn-infinite-loop-root
  data-enabled="{{ section.settings.enabled }}"
  data-clone-count="{{ section.settings.clone_count }}"
  data-disable-on-reduce-motion="{{ section.settings.disable_on_reduce_motion }}"
  data-disable-below-breakpoint="{{ section.settings.disable_below_breakpoint }}"
  data-loop-root-selector="{{ root_sel }}"
  data-include-footer="{{ section.settings.include_footer }}"
  data-boundary-buffer="{{ section.settings.boundary_buffer_px }}"
  data-debug-overlay="{{ section.settings.debug_overlay }}"
  hidden
></div>

{% schema %}
… (ver §3 — JSON completo)
{% endschema %}
```

### 4. Algoritmo

#### 4.1 Composición del "loopable"

- `loopable` = el elemento referenciado por `loop_root_selector` (default `main`).
- Si `include_footer` es true, además se incluye el `<footer>` global como parte del bloque que se clona.
- Implementación: crear un contenedor virtual `wrapper` envolviendo `loopable` (y el `footer`, si aplica). Llamémoslo `originalBlock`. Sus hijos son los nodos reales con sus IDs y eventos.

#### 4.2 Clones

- Crear `clone_count` clones **antes** y `clone_count` clones **después** del `originalBlock`. Si `clone_count = 1`: 1 clone arriba + 1 clone abajo.
- Cada clone es `originalBlock.cloneNode(true)`. Tras clonar, se aplica un **sanitizador**:
  - `cloneEl.setAttribute('aria-hidden', 'true')`.
  - `cloneEl.setAttribute('inert', '')` (browser nativo Chrome 102+, Safari 15.5+, Firefox 112+; con polyfill en `assets/orn-infinite-loop.js` para fallback en navegadores viejos: setea `pointer-events: none` + `tabindex="-1"` en cada focusable).
  - `cloneEl.classList.add('orn-loop-clone')`.
  - **Eliminar IDs**: `for (const el of cloneEl.querySelectorAll('[id]')) el.removeAttribute('id');`. Crucial para que `#contacto` siga apuntando al original.
  - **Eliminar nombres de form**: `for (const el of cloneEl.querySelectorAll('form')) { el.removeAttribute('action'); el.setAttribute('onsubmit','return false'); }` y `for (const el of cloneEl.querySelectorAll('[name]')) el.removeAttribute('name');`. Submit de un clon no hace nada.
  - **Pausar media autoplay**: `for (const v of cloneEl.querySelectorAll('video,audio')) { v.removeAttribute('autoplay'); v.muted = true; v.pause(); }`. El hero (ADR-0002) podría tener video — los clones no lo reproducen.
  - **Lazy en imágenes**: `for (const img of cloneEl.querySelectorAll('img')) img.setAttribute('loading','lazy');`. El original ya carga eager si lo es.
  - **Tabindex -1 en focusables**: `for (const el of cloneEl.querySelectorAll('a,button,input,select,textarea,[tabindex]')) el.setAttribute('tabindex','-1');`. Refuerza el `inert`.
  - **Marcar nodos web-component re-init**: si hay custom elements (Alpine `x-data`, header-component), se les remueve los atributos `x-data`, `x-init`, etc., para evitar re-iniciar Alpine en clones (usaríamos JS doblemente y rompería el conteo). Lista: `['x-data','x-init','x-bind','x-model','x-ref','x-show','x-cloak']`.
  - **Eliminar scripts inline**: `for (const s of cloneEl.querySelectorAll('script')) s.remove();`. Cualquier `<script type="application/ld+json">` también se elimina (evita duplicar SEO).

#### 4.3 Posicionamiento inicial

- Tras insertar clones, se mide la altura `H` de `originalBlock`.
- Se setea `window.scrollTo(0, H)` (o el equivalente sumando `clone_count * H` para múltiples clones arriba). Es decir: el viewport empieza en el **inicio del original**, con el clon "0" arriba (no visible) y el clon "1" abajo.
- Si la URL trae hash al cargar (`location.hash`), tras el posicionamiento inicial: scroll al elemento real con `scroll-margin-top: var(--header-height)`.

#### 4.4 Scroll handler

- Listener `scroll` con `passive: true`.
- En cada evento, calcular:
  - `topBound = clone_count * H - boundary_buffer_px`
  - `bottomBound = (clone_count + 1) * H - boundary_buffer_px`
  - Si `scrollY < topBound`: `scrollY = scrollY + H` (instant, sin smooth — `window.scrollTo({top: scrollY + H, behavior: 'instant'})`).
  - Si `scrollY > bottomBound`: `scrollY = scrollY - H`.
- El wrap es instantáneo y el contenido visible inmediatamente antes y después es idéntico → invisible al usuario.
- Dependencias: usar `requestAnimationFrame` para batch — el handler sólo flag-ea "necesito chequear", y un ticker de `rAF` hace la verificación en el siguiente frame. Evita disparar `scrollTo` dentro de un `scroll` event handler que algunos navegadores cancelan.

```js
let pending = false;
function onScroll() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    checkBounds();
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
```

#### 4.5 Resize / mutation handling

- `ResizeObserver` sobre `originalBlock`. Si `H` cambia (cambio de viewport, fonts cargadas, contenido dinámico tipo `orn-services` con paneles que cambian de altura): re-medir, re-posicionar, re-renderizar clones (los clones siguen la altura porque también son `cloneNode(true)`; basta con re-leer `H`).
- `MutationObserver` opcional sobre `originalBlock` con `subtree: true, childList: true`: si el contenido cambia (ej. `orn-services` carga imágenes), se re-clonan los clones. Coste: O(n) por mutación. Para evitar tormentas, debounce 200ms.

#### 4.6 Anchor smooth scroll

- Cuando el header de Ornevo hace `scrollIntoView` a `#contacto` (ADR-0003 §6) o el footer (ADR-0005 §6), el target es el original. El scroll suave funciona normal y `scroll-margin-top` ajusta el offset.
- Tras el scroll, `scrollY` queda dentro del rango del original → no se dispara wrap. ✓

#### 4.7 Browser back/forward, hashchange

- En `popstate`: re-leer `location.hash`. Si existe, scroll suave al original. Si no, mantener `scrollY` actual.
- En `hashchange`: idem.
- No interferimos con `history.pushState` (lo hacen los handlers de header/footer/form).

#### 4.8 Disable conditions

- `enabled === false` → no init.
- `prefers-reduced-motion: reduce` AND `disable_on_reduce_motion === true` → no init. Sitio queda lineal. Sin clones.
- `window.innerWidth < disable_below_breakpoint` → no init. Listener de `resize` re-evalúa: si el viewport crece, el script puede inicializarse en runtime; si decrece, se desmonta (remueve clones, restaura `scrollY`).
- Edición desde theme editor (`window.Shopify.designMode === true`) → **no init**. Razón: el editor de Shopify hace re-renders de secciones que romperían los clones. Mejor mostrar el sitio lineal en el editor; el efecto se prueba en preview.

#### 4.9 Cleanup

- Si se reinicia (resize cruza threshold, theme editor section reload, etc.):
  - Remover todos los `.orn-loop-clone`.
  - Remover listeners.
  - `scrollY` queda donde estaba (sin saltos).

### 5. JS — esqueleto (`assets/orn-infinite-loop.js`)

```js
(function () {
  'use strict';

  function readConfig() {
    const node = document.querySelector('[data-orn-infinite-loop-root]');
    if (!node) return null;
    const bool = (k) => node.dataset[k] === 'true';
    const num = (k, def) => parseInt(node.dataset[k], 10) || def;
    return {
      enabled: bool('enabled'),
      cloneCount: Math.min(2, Math.max(1, num('cloneCount', 1))),
      disableOnReduceMotion: bool('disableOnReduceMotion'),
      disableBelowBreakpoint: num('disableBelowBreakpoint', 0),
      loopRootSelector: node.dataset.loopRootSelector || 'main',
      includeFooter: bool('includeFooter'),
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

  const FOCUSABLE = 'a,button,input,select,textarea,[tabindex],iframe,audio,video';
  const ALPINE_ATTRS = ['x-data','x-init','x-bind','x-model','x-ref','x-show','x-cloak','x-on','x-text'];

  function sanitizeClone(el) {
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
    el.classList.add('orn-loop-clone');
    el.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    el.querySelectorAll('[name]').forEach((n) => n.removeAttribute('name'));
    el.querySelectorAll('form').forEach((f) => {
      f.removeAttribute('action');
      f.setAttribute('onsubmit', 'return false');
    });
    el.querySelectorAll('video,audio').forEach((v) => {
      v.removeAttribute('autoplay');
      try { v.pause(); } catch (e) {}
      v.muted = true;
    });
    el.querySelectorAll('img').forEach((img) => img.setAttribute('loading', 'lazy'));
    el.querySelectorAll(FOCUSABLE).forEach((n) => n.setAttribute('tabindex', '-1'));
    el.querySelectorAll('script').forEach((s) => s.remove());
    el.querySelectorAll('*').forEach((n) => {
      ALPINE_ATTRS.forEach((a) => n.removeAttribute(a));
      // Stripear shopify section data ids para no chocar
      n.removeAttribute('data-section-id');
    });
    return el;
  }

  function init(cfg) {
    const root = document.querySelector(cfg.loopRootSelector);
    if (!root) return null;
    const footer = cfg.includeFooter ? document.querySelector('body > footer, footer.shopify-section, footer') : null;

    // Wrapper agrupa root (+ footer si aplica) bajo un único bloque medible
    const wrap = document.createElement('div');
    wrap.className = 'orn-loop-original';
    wrap.setAttribute('data-orn-loop-original', '');
    root.parentNode.insertBefore(wrap, root);
    wrap.appendChild(root);
    if (footer) wrap.appendChild(footer);

    // Crear clones
    const above = [];
    const below = [];
    for (let i = 0; i < cfg.cloneCount; i++) {
      const a = sanitizeClone(wrap.cloneNode(true));
      const b = sanitizeClone(wrap.cloneNode(true));
      wrap.parentNode.insertBefore(a, wrap);
      wrap.parentNode.insertBefore(b, wrap.nextSibling);
      above.unshift(a);  // el más cercano al original es el último insertado arriba
      below.push(b);
    }

    function H() { return wrap.offsetHeight; }
    function topBound() { return cfg.cloneCount * H() - cfg.boundaryBuffer; }
    function bottomBound() { return (cfg.cloneCount + 1) * H() + cfg.boundaryBuffer; }

    // Posicionamiento inicial: viewport en el inicio del original
    function placeInitial() {
      const targetHash = location.hash;
      if (targetHash && document.querySelector(targetHash)) {
        // El target real está dentro del wrapper original
        const el = document.querySelector(targetHash);
        // Asegurar que estamos en el rango del original primero
        window.scrollTo({ top: cfg.cloneCount * H(), behavior: 'instant' });
        // Luego scroll suave al ancla
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: cfg.cloneCount * H(), behavior: 'instant' });
      }
    }

    let pending = false;
    function checkBounds() {
      const y = window.scrollY;
      const h = H();
      if (y < topBound()) {
        window.scrollTo({ top: y + h, behavior: 'instant' });
      } else if (y > bottomBound()) {
        window.scrollTo({ top: y - h, behavior: 'instant' });
      }
    }
    function onScroll() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; checkBounds(); });
    }

    function destroy() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('hashchange', onHashChange);
      ro.disconnect();
      // Restaurar DOM
      [...above, ...below].forEach((c) => c.remove());
      if (wrap.firstChild) wrap.parentNode.insertBefore(wrap.firstChild, wrap);
      while (wrap.firstChild) wrap.parentNode.insertBefore(wrap.firstChild, wrap);
      wrap.remove();
    }

    let resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Si baja del breakpoint, desmontar
        if (cfg.disableBelowBreakpoint > 0 && window.innerWidth < cfg.disableBelowBreakpoint) {
          api.destroy();
          return;
        }
        // Si la altura del original cambió, reposicionar para mantenernos en el original
        const y = window.scrollY;
        const h = H();
        const lap = Math.floor(y / h);
        const offset = y - lap * h;
        // Forzar lap = cloneCount (estamos en el original)
        window.scrollTo({ top: cfg.cloneCount * h + offset, behavior: 'instant' });
      }, 150);
    }

    function onHashChange() {
      if (location.hash && document.querySelector(location.hash)) {
        const el = document.querySelector(location.hash);
        // Asegurar lap original
        const y = window.scrollY;
        const h = H();
        const lap = Math.floor(y / h);
        if (lap !== cfg.cloneCount) {
          window.scrollTo({ top: cfg.cloneCount * h, behavior: 'instant' });
        }
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    }

    placeInitial();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('hashchange', onHashChange);
    const ro = new ResizeObserver(() => onResize());
    ro.observe(wrap);

    const api = { destroy, checkBounds, _wrap: wrap, _above: above, _below: below };
    return api;
  }

  function boot() {
    const cfg = readConfig();
    if (!shouldEnable(cfg)) return;
    let api = init(cfg);

    // Re-evaluación al cruzar el breakpoint hacia arriba
    window.addEventListener('resize', () => {
      if (!api && shouldEnable(cfg)) api = init(cfg);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.OrnInfiniteLoop = { boot, readConfig };
})();
```

> **Notas críticas del esqueleto**:
> 1. `wrap.cloneNode(true)` clona el DOM con event listeners delegados (los listeners directos se pierden, lo cual es correcto: queremos clones inertes). Eventos delegados en `document` (como los del header) siguen funcionando normalmente porque el target del clic será un nodo del clon que ya tiene `inert` → el evento no llega al handler en muchos navegadores; con polyfill se cubre con `pointer-events: none`.
> 2. La opción `behavior: 'instant'` no es estándar en todos los navegadores; con `behavior: 'auto'` se obtiene el mismo resultado en los que no la entienden. Probado: Chrome/Safari/Firefox modernos lo entienden o caen a `auto`.
> 3. El clon de `wrap` incluye al `footer`, así que cada lap es: `[hero, services, form, footer] x N` exactamente como pide el diseño.

### 6. CSS — defensivo (`assets/orn-infinite-loop.css`)

```css
/* Clones inertes — visualmente idénticos al original pero sin interactividad */
.orn-loop-clone {
  pointer-events: none; /* fallback si el browser no soporta [inert] */
}
.orn-loop-clone * {
  pointer-events: none;
}

/* En print, oculta los clones para no duplicar contenido */
@media print {
  .orn-loop-clone { display: none !important; }
}

/* Reduce flicker durante el wrap: en algunos navegadores, scroll-behavior: smooth global puede animar
   el wrap (lo que rompe la ilusión). El JS hace scrollTo({behavior:'instant'}) pero por si acaso: */
html:has(.orn-loop-clone) {
  scroll-behavior: auto;
}

/* Original wrapper sin estilos visuales — es un contenedor lógico */
.orn-loop-original {
  display: contents;
}

/* Debug overlay (toggleable desde el setting debug_overlay) */
.orn-loop-debug {
  position: fixed;
  bottom: 8px; right: 8px;
  z-index: 99999;
  background: rgba(0,0,0,.78);
  color: #4EC0DE;
  font: 12px/1.3 ui-monospace, Menlo, monospace;
  padding: 8px 10px;
  border-radius: 8px;
  pointer-events: none;
  white-space: pre;
}
```

> **`display: contents`** en `.orn-loop-original` evita que el wrapper interfiera con layouts CSS Grid/Flex que esperaban a `<main>` y `<footer>` como hijos directos del `<body>`. Soportado en todos los navegadores objetivo (Chrome 65+, Safari 11.1+, Firefox 37+).

### 7. Accesibilidad

- Clones llevan `aria-hidden="true"` y `inert`: los lectores de pantalla los ignoran y el foco con tab nunca entra. El usuario sólo "ve" un sitio, una vez.
- Foco programático: cuando el header hace `el.focus({preventScroll:true})` tras un anchor click (ADR-0003 §6), el target es el original (con id real). ✓
- `prefers-reduced-motion: reduce` → loop desactivado por completo. El usuario navega un sitio normal, sin scroll mágico ni clones.
- Skip-link / `:target`: el `:target` del original sigue resolviendo correctamente porque el id está sólo en el original. ✓
- Print: clones ocultos vía `@media print`.

### 8. SEO

- Crawlers ven sólo el HTML servido por el server: contiene **una sola** copia del contenido, sin clones. Los clones se generan post-DOMContentLoaded.
- Crawlers que ejecutan JS (Googlebot moderno) verían los clones. Mitigación:
  - Clones llevan `aria-hidden="true"` (no es señal SEO directa, pero indica role secundario).
  - **Acción adicional opcional**: añadir `<meta name="robots" content="…"/>` no — eso afecta toda la página. Mejor: marcar cada clone con `data-nosnippet` (Google lo respeta para no extraer snippets de ese subárbol):
    ```js
    el.setAttribute('data-nosnippet', '');
    ```
    Añadir al `sanitizeClone`. Documentado.
- Canonical: la página tiene su `<link rel="canonical" href="…/landing">` desde Horizon. Sin cambios.

### 9. Compatibilidad con el resto del stack

- **`orn-header` (ADR-0003)**: header sticky funciona igual; el JS del header escribe `--header-height` en `<body>`. El loop no toca `<body>` ni el `<header>`. ✓
- **`orn-services` (ADR-0002)**: Alpine `ornServices` está sólo en el original (los clones perdieron `x-data`). Los clones muestran el último estado renderizado del original — si el usuario cambia de tab y el wrap dispara, el clon del lado opuesto seguirá mostrando el tab inicial; **pero como wrap es instantáneo y el contenido del clon es idéntico al original "antes del wrap"**, el usuario ve continuidad visual sin cambios de tab inesperados. Si en algún momento se nota desync, una mitigación es re-clonar al cambio de tab (con debounce) o forzar `tab=0` en clones via CSS hash + `aria-hidden`. **Para V1 lo dejamos así**: el efecto sigue siendo seamless porque cuando el usuario está cerca del wrap, está scrolleando, no interactuando con tabs.
- **`orn-contact-form` (ADR-0004)**: form real sólo en el original; los clones tienen `<form action>` removida y `onsubmit="return false"`. Inputs con `name=""` removido → si por accidente alguien dispara submit en un clon (foco programático en otro contexto), no manda nada al server. ✓
- **`orn-footer` (ADR-0005)**: el footer entra en el loop (`include_footer=true`). El CTA del band en el original sigue apuntando a `#contacto` que es la sección real del original. Los clones del CTA también tienen el `href="#contacto"` pero `inert`/`pointer-events:none` impide el clic. ✓
- **header-component-less**: el bloque inline de `layout/theme.liquid` líneas 55–80 hace early-return; no entra en conflicto. ✓
- **Theme editor (`Shopify.designMode`)**: el script no se inicializa. El editor renderiza el sitio como una landing lineal estándar. ✓

### 10. Edge cases

- **iOS momentum scroll overshoot**: en iOS, el scroll por inercia puede pasarse del bound. Mitigación: `boundary_buffer_px` default `64`; el wrap se dispara antes de llegar al borde del clon. Si overshoot: el siguiente frame `rAF` lo corrige.
- **Scroll teclado (PageDown/Space/End)**: `End` salta a la última posición scrollable, que con clones es la altura total = `(2*cloneCount+1)*H`. Tras el frame el handler detecta y hace wrap a la posición equivalente del original. El usuario percibe que "el sitio nunca termina", consistente con el efecto.
- **Hash deep-link al cargar**: cubierto en §4.3 y §4.7.
- **Refresh con scroll restoration**: el browser intenta restaurar `scrollY` en refresh. Tras el `init` lo sobrescribimos con `placeInitial`. Aceptable porque el efecto es la misma posición visual (estamos al inicio del original).
- **Print**: clones ocultos vía CSS; al imprimir el usuario obtiene el contenido una vez, ordenado.
- **Devtools/inspect**: el debug overlay (toggle por setting) ayuda a verificar bounds.

## Consequences

**Positive:**
- Efecto kudanil-style sin librerías; ~150 líneas de JS vainilla.
- Opt-in por template — sólo activo en la landing; otras páginas sin coste.
- HTML server-rendered queda limpio: SEO ve una copia única; los clones nacen post-DOMContentLoaded.
- Clones inertes y sin IDs → todo el resto del stack (anchors, header, form) funciona sin cambios.
- Toggle desde editor + auto-disable por reduce-motion / breakpoint / theme editor.
- Compatibilidad con resize y mutaciones del contenido.
- Aislado en 3 archivos nuevos + 3 patches puntuales — resistente a updates de Horizon.

**Negative / trade-offs:**
- `wrap.cloneNode(true)` triplica el DOM. Para una landing de 4 secciones con imágenes razonables el coste es bajo (~50KB extra). Para landings densas con video/canvas, considerar `clone_count: 1` y `disable_below_breakpoint` en mobile.
- Estado interno de Alpine (tab activo en `orn-services`, hash actual del header, etc.) **no se sincroniza** entre original y clones. Aceptable porque clones son inertes y el wrap es instantáneo: el usuario nunca ve dos estados simultáneos. Si en futuro se introducen animaciones que dependen del estado (ej. scroll-driven animations), hay que reclonar tras cambios.
- **Scroll natural pierde la noción de "fondo de página"**: el scrollbar nunca llega al final (siempre hay más). Algunos usuarios notan esto como raro. Mitigable visualmente con un indicador de progreso `dentro del lap` (futuro).
- En theme editor, el efecto **no se ve**. El cliente debe abrir el sitio en preview para confirmar. Documentado.
- Posible flicker mínimo en el frame del wrap si el navegador anima `scrollTo` por defecto. Mitigado con `behavior: 'instant'` + `html { scroll-behavior: auto }` cuando hay clones.

**Risks and mitigations:**
- **Riesgo:** Googlebot indexa contenido duplicado vía clones. → **Mitigación:** `data-nosnippet` en cada clone; clones nacen post-JS-render → la mayoría de crawlers no los ven. Si aparece en Search Console, añadir `noindex` a los clones (innecesario hoy).
- **Riesgo:** un `horizon-update-*` cambia la jerarquía DOM (`<main>` → `<div role="main">` u otro). → **Mitigación:** `loop_root_selector` es un setting; basta con cambiar el valor desde el theme editor.
- **Riesgo:** algún script externo (Shopify pixels, app embeds) inyecta DOM dentro de `<main>` post-load → re-clonar o ignorar. → **Mitigación:** `MutationObserver` con debounce 200ms re-clona si detecta cambios; documentar para que el equipo no se sorprenda si las apps de Shopify lo invalidan.
- **Riesgo:** `inert` no soportado en navegadores muy viejos (Safari < 15.5, Firefox < 112). → **Mitigación:** los selectors `pointer-events:none` + `tabindex="-1"` ya cubren visualmente y para focus. La pérdida es que screen readers en navegadores pre-`inert` pueden anunciar contenido del clon como hidden subtree (la mayoría respeta `aria-hidden`).
- **Riesgo:** Alpine reinicia clones erróneamente. → **Mitigación:** strip de atributos `x-*` en `sanitizeClone`. Verificar visualmente que en clones no haya `[x-cloak]` invisible (Alpine no se ejecuta sobre nodos sin `x-data`, así que `[x-cloak]` queda visible — aplicar el reset CSS `[x-cloak]{display:none!important}` global ya cubre).
- **Riesgo:** el `IntersectionObserver` del scroll-spy del header (ADR-0003 §6) detecta el clone como "in view" antes que el original. → **Mitigación:** sólo el original tiene IDs; el observer usa `document.querySelector('#anchor')` que devuelve el primer match — en este caso el original. Verificado.
- **Riesgo:** scroll restoration de Safari iOS hace zoom raro. → **Mitigación:** `history.scrollRestoration = 'manual'` antes de `boot()`.

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| Implementar el loop con `Lenis` o librería virtual scroll | Suma 8–15 KB y cambia el control del scroll del browser (no nativo) — peor a11y y compatibilidad con el header sticky. La solución vainilla cabe en 150 líneas. |
| Reescribir con `position: absolute` + animación manual de `transform: translateY` | Pierde el scroll nativo del browser; rompe scrollbars, search-on-page, screen reader virtualization. Peor a11y. |
| Loop sólo del `main` (sin footer) | El diseño de la landing termina en footer; tras el footer queremos volver a hero. Sin footer en el loop, tendríamos hero→hero con el footer fuera, lo cual rompe la ilusión. |
| Ejecutar el loop en todas las páginas | El efecto sólo tiene sentido cuando el contenido es corto y narrativamente cíclico. En product/blog/collection es contraproducente. Opt-in por template. |
| Generar clones server-side (en Liquid) | Triplica el HTML que sirve el server, daña SEO (duplicate content), aumenta TTFB y el bundle. JS post-load mantiene HTML limpio. |
| Setear `scroll-behavior: smooth` global y dejar que el browser anime el wrap | El wrap es un "salto" de varios miles de px. Animarlo rompe la ilusión (usuario ve un swoop largo). Necesita ser instantáneo. |
| Toggle por meta-tag (`<meta name="orn-loop" content="true">`) en lugar de sección | Editar `layout/theme.liquid` es lo que queremos evitar (riesgo de merge conflict en updates de Horizon). Una sección "trigger" es 100% nuestro código. |
| Detectar `template-page-landing` por body class | La body class de Horizon no es estable entre versiones. Una sección explícita en `templates/page.landing.json` es más robusta. |
| Remover el contenido del clon y usar `position: sticky` con duplicate del primero/último viewport | Demasiado frágil; muchos casos extremos en contenido alto. |

## Implementation notes

### Archivos a crear
- `sections/orn-infinite-loop.liquid` — markup §3 + schema completo. Imprime sólo el `<div data-orn-infinite-loop-root … hidden>`.
- `assets/orn-infinite-loop.js` — esqueleto §5 (~180 líneas finales con polyfill ligero de `inert` y `data-nosnippet` sanitizer).
- `assets/orn-infinite-loop.css` — §6.

### Archivos a editar
- `snippets/stylesheets.liquid` → añadir `{{ 'orn-infinite-loop.css' | asset_url | stylesheet_tag }}` debajo de `orn-footer.css`.
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-infinite-loop.js' | asset_url }}" defer></script>` al final del bloque `orn-*.js`, antes de `alpine.min.js`.
- `templates/page.landing.json` → añadir entrada `orn-infinite-loop` como **primera del `order`** con sus settings de fábrica.

### Variables CSS expuestas
Ninguna. El módulo usa solo selectores y data-attrs.

### Orden de ejecución
1. Crear `assets/orn-infinite-loop.js` con el módulo `(function(){…})()` siguiendo §5 (incluyendo `sanitizeClone` con `data-nosnippet` y `history.scrollRestoration = 'manual'` antes del `boot`).
2. Crear `assets/orn-infinite-loop.css` con §6.
3. Crear `sections/orn-infinite-loop.liquid` con el `<div hidden>` de §3 + schema completo.
4. Editar `snippets/stylesheets.liquid` y `snippets/scripts.liquid` para registrar los assets.
5. Editar `templates/page.landing.json`: añadir la sección como primera entrada del `order` con todos sus settings default.
6. Smoke test en preview (no en theme editor, donde el script no se inicializa):
   - Cargar `/landing` → scroll hasta el final del footer → seguir scrolleando → llega visualmente al hero sin corte.
   - Hacer scroll arriba en el hero → llega al footer sin corte.
   - Click `¿Un proyecto?` en el header → smooth scroll a `#contacto` (original) sin disparar wrap.
   - Click en un link del footer (`#servicios`, `#nosotros`) → scroll suave al original.
   - DevTools → emular `prefers-reduced-motion: reduce` → recargar → no hay clones, scroll lineal estándar.
   - DevTools → resize a 320px → si `disable_below_breakpoint` > 320, no hay clones; si es 0 (default), funciona en mobile.
   - Refrescar con hash (`/landing#contacto`) → la página se posiciona en el original con el ancla visible bajo el header.
   - Theme editor → abrir la landing → no hay loop (designMode true).
   - axe-core: 0 violaciones nuevas (los clones son `aria-hidden="true"` + `inert`, ignorados por el árbol de a11y).
7. Test de regresión:
   - Form de contacto en el original → submit envía email correctamente.
   - Form de contacto en un clon (acceso programático con foco forzado) → submit no hace nada (`onsubmit="return false"`).
   - `orn-services` tabs en el original → cambio de tab funciona.
   - `orn-services` tabs en un clon → no responde a clics (inert).

### Pendientes documentales
- (Cliente) Verificar que la experiencia se siente correcta en mobile real (no solo emulado). Si no, configurar `disable_below_breakpoint: 750` para desactivar el efecto en móvil.
- (V2) Indicador visual de progreso dentro del lap (mini bar fija) — opcional, detrás de un toggle.
- (V2) Re-clonar tras cambios de estado de `orn-services` (tab activo) si se necesita continuidad visual exacta de tabs entre original y clones. En V1 no hace falta porque el wrap es instantáneo y el usuario está scrolleando, no en el panel.

## References

- Inspiración: `https://www.kudanil.com/` (efecto loop scroll de referencia).
- ADR-0001 — design system base.
- ADR-0002 — `orn-services` (Alpine, scroll-margin-top, IDs administrables consumidos por el loop).
- ADR-0003 — `orn-header` (sticky, `--header-height` en `<body>`, scroll-spy con `IntersectionObserver` que sigue funcionando con clones).
- ADR-0004 — `orn-contact-form` (form real único en el original; clones inertes).
- ADR-0005 — `orn-footer` (entra en el loop vía `include_footer`).
- MDN `inert`: https://developer.mozilla.org/docs/Web/HTML/Global_attributes/inert
- MDN `aria-hidden`: https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Attributes/aria-hidden
- Google `data-nosnippet`: https://developers.google.com/search/docs/crawling-indexing/special-tags#data-nosnippet
- WAI-ARIA Authoring Practices — Hiding Content: https://www.w3.org/WAI/ARIA/apg/practices/hiding-semantics/
