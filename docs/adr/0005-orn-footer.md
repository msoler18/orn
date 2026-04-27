# ADR-0005: Footer Ornevo (`orn-footer`) sobre Horizon

**Date:** 2026-04-26
**Author(s):** Miguel Soler
**Status:** Proposed

## Context

Última sección global de la landing de Ornevo — el footer. Diseños:

- Desktop: `landing/footer/footer_desktop.png`. Dos partes visuales en una sola sección:
  1. **CTA band**: fondo oscuro (negro/casi-negro), centrado: heading grande (~2 líneas), subtítulo en párrafo, CTA pill blanco con texto editable.
  2. **Card flotante (blanca, redondeada)** sobre el fondo oscuro:
     - Top-left: logo Ornevo + bloque "Contacto" (label + email) + íconos sociales (IG, LinkedIn).
     - Top-right: tagline grande "Agencia digital en Normandía — web, marketing y e-commerce para **PYMES ambiciosas.**" donde la última frase está dentro de una **píldora negra rotada** con texto blanco (efecto destacado tipo highlight inclinado).
     - Bottom-left: "© 2026 Ornevo · Aviso legal · Política de privacidad".
     - Bottom-right: dos columnas/grupos de links — `Servicios` (Consultoría y estrategia · Diseño UX/UI · Desarrollo · Crecimiento y seguimiento) y `Agencia` (Sobre nosotros · Tecnologías · Equipo · Blog · Reseñas · Contacto).
- Mobile: `landing/footer/footer_responsive.png`. Mismo contenido apilado y centrado: CTA band primero, card abajo con logo + heading + tagline (con la pill rotada) + Contacto + íconos sociales + grupos de links + legales + copyright al final.

Restricciones del cliente (Miguel) para esta iteración:

- **Patrones existentes**: respetar ADR-0001/0002/0003/0004 (prefijo `orn-`, blocks con `_orn-…`, CSS/JS por sección en `assets/`, registrados en `snippets/stylesheets.liquid` y `snippets/scripts.liquid`, Alpine como `window.<name>`).
- **CTA del CTA band** = ancla al form. Por consistencia con ADR-0003 y ADR-0004, default `#contacto`.
- **Todo editable** en theme editor: copy, links, colores, sociales, copyright, layout.
- El footer debe **reemplazar** el footer de Horizon (`sections/footer.liquid` + `sections/footer-utilities.liquid`) sin tocarlos en disco — cambiamos referencias en `sections/footer-group.json` (mismo patrón que ADR-0003 §"Eliminación del language picker").

Stack vigente:
- `layout/theme.liquid` línea 127: `{% sections 'footer-group' %}` carga `sections/footer-group.json`.
- `sections/footer-group.json` actual referencia `"type": "footer"` y `"type": "footer-utilities"` con sus blocks (Horizon nativo). El diseño Ornevo no usa esa estructura → swap completo.
- `--header-height` ya está disponible en `<body>` (escrito por `assets/orn-header.js`). Cualquier ancla del CTA respeta `scroll-margin-top: var(--header-height)` que ya consume `orn-services` y `orn-contact-form`.
- Pendiente operativo: el header tiene su CTA `¿Un proyecto?` apuntando a `#contacto` (ADR-0003); el footer hará lo mismo. Ambos consumen el mismo anchor expuesto por `orn-contact-form` (ADR-0004 §10).

## Decision drivers

- **Must:** sección única `orn-footer` con dos zonas (`CTA band` + `Footer card`) que pueden renderizarse o no según un toggle; el diseño actual muestra ambos.
- **Must:** swap en `sections/footer-group.json`: referencia `"type": "orn-footer"` con bloques `link-group` (máx 4); se eliminan `footer` y `utilities` del `order`.
- **Must:** CTA del band es un `<a>` que apunta al `#anchor` del form (default `#contacto`). En click, smooth-scroll respeta `--header-height`. **No** duplicamos JS — usamos el comportamiento nativo del browser + `scroll-margin-top` (igual patrón que `orn-contact-form` §10). Una mejora opcional: registrar un click handler global ligero en `assets/orn-footer.js` que aplique smooth scroll para anclas internas; ver §6.
- **Must:** la "pill rotada" del tagline es **un span con clase + rotación CSS administrable** — texto editable, color editable, ángulo editable.
- **Must:** los grupos de links son **blocks** del tipo `link-group`. Cada bloque expone `title` (text) + `menu` (`link_list` setting → admin reusa una navigation menu de Shopify). Esto evita un schema de 6+ inputs por columna y aprovecha el sistema nativo de menús (drag-drop reorder, anidamiento opcional ignorado en V1). Máx 4 columnas.
- **Must:** logo, email de contacto, redes sociales (IG, LinkedIn — extensible a Facebook/X/YouTube/TikTok como settings opcionales), copyright, links legales: todo administrable.
- **Must:** copyright soporta placeholder `{year}` que se sustituye en runtime (`'now' | date: '%Y'`) para que no envejezca solo.
- **Must:** ARIA correcto: `<footer>` landmark, `<nav aria-label="…">` para cada grupo de links, social icons con `aria-label` legibles.
- **Must:** mobile (< 750px) apila todo, centrado. Card sigue redondeada con padding generoso.
- **Should:** sin dependencias nuevas. Iconos sociales **inline SVG** en `assets/orn-footer.css` (background-image data-uri) o en el liquid (snippet con `case` por red social). Default a snippet para legibilidad. Reusamos los SVG nativos de Horizon si los hay.
- **Should:** transiciones < 300ms en hover de links y CTA; respeta `prefers-reduced-motion`.
- **Should:** un horizon-update no rompe el footer. Mitigado: nuevo file de sección + edit puntual de `footer-group.json` (igual que `header-group.json` en ADR-0003).
- **Nice to have:** la pill del tagline anima sutilmente al entrar en viewport (escala + ligera rotación). Opcional, detrás de un toggle `pill_animate`.

## Decision

Creamos sección **`sections/orn-footer.liquid`** + bloque **`blocks/_orn-footer-link-group.liquid`**, con estilos en **`assets/orn-footer.css`** y JS opcional en **`assets/orn-footer.js`**. Cambiamos `sections/footer-group.json` para referenciar `orn-footer` y eliminar la sección `utilities` del `order`.

### 1. Estructura de archivos

```
sections/orn-footer.liquid               # CTA band + card (logo, contacto, social, tagline, grupos, legales, copyright)
blocks/_orn-footer-link-group.liquid     # un grupo: title + link_list
assets/orn-footer.css                    # layout + pill rotada + responsive
assets/orn-footer.js                     # smooth-scroll handler para CTA + cualquier ancla interna del footer
snippets/orn-footer-social-icon.liquid   # render seguro de un ícono social (SVG inline) con aria-label
```

### 2. Registro

- `snippets/stylesheets.liquid` → añadir `{{ 'orn-footer.css' | asset_url | stylesheet_tag }}` debajo de `orn-contact-form.css`.
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-footer.js' | asset_url }}" defer></script>` junto a los demás `orn-*.js`, **antes** de `alpine.min.js`.
- `sections/footer-group.json` → ver §10 (cambios concretos).
- **No editar** `layout/theme.liquid`, `sections/footer.liquid`, `sections/footer-utilities.liquid`, `blocks/footer-*` ni assets de Horizon.

### 3. Schema de la sección (`orn-footer`)

El footer **no se renderiza vía metafield** → permitidos `checkbox`, `range`, `textarea`. Settings (defaults sembrados con copy del diseño en español; el cliente los traducirá si quiere FR):

#### CTA band (zona oscura superior)
| id | type | default | notas |
|----|------|---------|-------|
| `cta_band_show` | `checkbox` | `true` | Toggle global del bloque oscuro. |
| `cta_band_color_scheme` | `color_scheme` | `scheme-4` | Deep (negro/oscuro verdoso) — ADR-0001 mapping. |
| `cta_band_heading` | `richtext` | `<p>Lorem ipsum dolor sit amet,<br>consectetur adipiscing elit</p>` | Permite `<br>`. |
| `cta_band_subtitle` | `richtext` | `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>` | — |
| `cta_band_button_text` | `text` | `Lorem ipsum` | Copy del CTA. |
| `cta_band_button_anchor` | `text` | `#contacto` | Hash o URL absoluta. Si empieza por `#`, JS hace smooth scroll. |
| `cta_band_button_variant` | `select` (`primary`/`secondary`/`tertiary`) | `secondary` | Default secondary porque el CTA blanco sobre fondo oscuro. *(En ADR-0001 `secondary` es transparente con borde primary; revisar visual en smoke test — si no encaja, usar `primary` y patchear en CSS local con un color-scheme override; setting permite ajustar sin tocar código.)* |
| `cta_band_button_open_in_new_tab` | `checkbox` | `false` | Solo aplica si `button_anchor` no empieza por `#`. |
| `cta_band_padding_block_start` | `range` (24–160 px, step 4) | `96` | — |
| `cta_band_padding_block_end` | `range` (24–160 px, step 4) | `96` | — |

#### Card (zona inferior — fondo claro redondeado)
| id | type | default | notas |
|----|------|---------|-------|
| `card_show` | `checkbox` | `true` | — |
| `card_color_scheme` | `color_scheme` | `scheme-1` | Light. |
| `card_radius` | `range` (0–48 px, step 2) | `32` | `border-radius` de la card. |
| `card_inset` | `range` (0–48 px, step 2) | `24` | Margen lateral respecto al viewport (la card "flota"). |
| `card_padding` | `range` (24–80 px, step 4) | `48` | Padding interno. |

#### Marca + contacto (top-left de la card)
| id | type | default | notas |
|----|------|---------|-------|
| `logo` | `image_picker` | — | SVG/PNG. |
| `logo_height` | `range` (24–96 px, step 2) | `52` | — |
| `logo_alt` | `text` | `Ornevo` | — |
| `contact_label` | `text` | `Contacto` | Etiqueta arriba del email. |
| `contact_email` | `text` | `contact@ornevo.fr` | Renderizado como `<a href="mailto:…">`. |
| `social_instagram_url` | `url` | — | Si vacío, no se renderiza. |
| `social_linkedin_url` | `url` | — | — |
| `social_facebook_url` | `url` | — | — |
| `social_twitter_url` | `url` | — | (X.com/Twitter) |
| `social_youtube_url` | `url` | — | — |
| `social_tiktok_url` | `url` | — | — |

#### Tagline + pill (top-right de la card)
| id | type | default | notas |
|----|------|---------|-------|
| `tagline_show` | `checkbox` | `true` | — |
| `tagline_lead` | `richtext` | `<p>Agencia digital en Normandía — web, marketing y e-commerce para</p>` | El "antes" de la pill. |
| `tagline_pill_text` | `text` | `PYMES ambiciosas.` | Texto dentro de la píldora rotada. |
| `tagline_pill_bg` | `color` | `#0F1720` | Fondo de la pill. Default neutro 05 (negro casi puro). |
| `tagline_pill_fg` | `color` | `#FFFFFF` | Color del texto de la pill. |
| `tagline_pill_rotation` | `range` (-10 – 10 deg, step 1) | `-3` | Ángulo de rotación. `0` = sin rotar. |
| `tagline_pill_animate` | `checkbox` | `true` | Anima entrada (escala + rotación) cuando entra al viewport. Respeta `prefers-reduced-motion`. |
| `tagline_alignment` | `select` (`left`/`center`/`right`) | `right` | Default alineado a la derecha (desktop); en mobile colapsa a center. |

#### Bottom row
| id | type | default | notas |
|----|------|---------|-------|
| `copyright_text` | `text` | `© {year} Ornevo` | `{year}` se reemplaza por `'now' \| date: '%Y'`. |
| `legal_link_1_text` | `text` | `Aviso legal` | — |
| `legal_link_1_url` | `url` | — | Página de Shopify (`/policies/legal-notice` o `pages/aviso-legal`). Si vacío, no se renderiza. |
| `legal_link_2_text` | `text` | `Política de privacidad` | — |
| `legal_link_2_url` | `url` | — | `/policies/privacy-policy`. |
| `legal_link_3_text` | `text` | — | Slot opcional (Términos, Cookies, etc.). |
| `legal_link_3_url` | `url` | — | — |

#### Layout / spacing
| id | type | default | notas |
|----|------|---------|-------|
| `card_top_align` | `select` (`stack`/`split`) | `split` | `split` = layout 2-col del diseño (logo+contact a la izq, tagline a la der). `stack` = todo apilado. |
| `card_bottom_align` | `select` (`split`/`stack`) | `split` | `split` = legales izq, link-groups der. |

#### Blocks
- `name`: `Link group`
- `type`: `link-group` (filename `_orn-footer-link-group.liquid`)
- `max_blocks`: `4`
- `presets` de la sección sembrarán **2 link-groups** con copy default:
  - "Servicios" (vinculado a un menú `footer-servicios` que el cliente debe crear; si no existe, queda vacío sin romper).
  - "Agencia" (vinculado a `footer-agencia`).

`presets`: 1 preset llamado "Footer Ornevo" con todos los settings + 2 blocks default.

`enabled_on.groups: ["footer"]`.

### 4. Schema del bloque (`_orn-footer-link-group`)

| id | type | default | notas |
|----|------|---------|-------|
| `title` | `text` | `Servicios` | Título de la columna. |
| `menu` | `link_list` | `main-menu` (fallback) | Admin lo reemplaza por un menú de footer. |
| `title_color` | `color` | — | Override opcional. Si vacío, hereda del color scheme de la card. |
| `link_color` | `color` | — | Override opcional para los items. |

`name: "Link group"`. **Sin** sub-blocks. **Sin** settings adicionales — los items vienen del menú referenciado.

> **Por qué `link_list` en lugar de un repeater de items**: Shopify ya provee un editor de menús (`Online Store → Navigation`) con drag-drop, anidamiento, y un solo lugar para mantener cada link. Esto le evita al cliente editar dos veces los mismos links si se reutilizan en otras zonas (por ejemplo, en el header en V2). Costo: el cliente debe crear los menús `footer-servicios` y `footer-agencia` una vez. Documentado en §11 "Pendientes".

### 5. Markup (resumen)

```liquid
{% liquid
  assign year = 'now' | date: '%Y'
  assign copyright = section.settings.copyright_text | replace: '{year}', year
  assign anchor = section.settings.cta_band_button_anchor | default: '#contacto'
  assign is_anchor = false
  if anchor contains '#'
    assign is_anchor = anchor | slice: 0, 1
    if is_anchor == '#'
      assign is_anchor = true
    else
      assign is_anchor = false
    endif
  endif
  assign card_classes = 'orn-footer__card color-' | append: section.settings.card_color_scheme
  assign band_classes = 'orn-footer__band color-' | append: section.settings.cta_band_color_scheme
%}

<footer class="orn-footer"
        x-data="ornFooter()"
        x-init="init()"
        style="
          --orn-footer-card-radius: {{ section.settings.card_radius }}px;
          --orn-footer-card-inset: {{ section.settings.card_inset }}px;
          --orn-footer-card-padding: {{ section.settings.card_padding }}px;
          --orn-footer-pill-bg: {{ section.settings.tagline_pill_bg }};
          --orn-footer-pill-fg: {{ section.settings.tagline_pill_fg }};
          --orn-footer-pill-rotation: {{ section.settings.tagline_pill_rotation }}deg;
          --orn-footer-band-pt: {{ section.settings.cta_band_padding_block_start }}px;
          --orn-footer-band-pb: {{ section.settings.cta_band_padding_block_end }}px;
        ">

  {%- if section.settings.cta_band_show -%}
    <div class="{{ band_classes }}">
      <div class="orn-footer__band-inner">
        <div class="orn-footer__band-heading">{{ section.settings.cta_band_heading }}</div>
        <div class="orn-footer__band-subtitle">{{ section.settings.cta_band_subtitle }}</div>
        <a class="orn-footer__band-cta ornevo-btn ornevo-btn--{{ section.settings.cta_band_button_variant }}"
           href="{{ anchor }}"
           {% if is_anchor %}data-orn-anchor="true"{% endif %}
           {% if section.settings.cta_band_button_open_in_new_tab and is_anchor == false %}target="_blank" rel="noopener"{% endif %}>
          {{ section.settings.cta_band_button_text }}
        </a>
      </div>
    </div>
  {%- endif -%}

  {%- if section.settings.card_show -%}
    <div class="orn-footer__card-wrap">
      <div class="{{ card_classes }} orn-footer__card--align-{{ section.settings.card_top_align }}">

        {%- comment -%} ── Top: marca / contacto ── tagline ── {%- endcomment -%}
        <div class="orn-footer__card-top">

          <div class="orn-footer__brand">
            {%- if section.settings.logo != blank -%}
              <a href="{{ routes.root_url }}" class="orn-footer__logo">
                {{ section.settings.logo | image_url: width: 400
                    | image_tag: alt: section.settings.logo_alt,
                                loading: 'lazy',
                                style: 'height:' | append: section.settings.logo_height | append: 'px;width:auto;' }}
              </a>
            {%- endif -%}

            {%- if section.settings.contact_email != blank -%}
              <div class="orn-footer__contact">
                <p class="orn-footer__contact-label">{{ section.settings.contact_label }}</p>
                <a class="orn-footer__contact-email" href="mailto:{{ section.settings.contact_email }}">
                  {{ section.settings.contact_email }}
                </a>
              </div>
            {%- endif -%}

            <ul class="orn-footer__social" role="list" aria-label="Redes sociales">
              {%- for entry in 'instagram,linkedin,facebook,twitter,youtube,tiktok' | split: ',' -%}
                {%- assign url_key = 'social_' | append: entry | append: '_url' -%}
                {%- assign url = section.settings[url_key] -%}
                {%- if url != blank -%}
                  <li>
                    {%- render 'orn-footer-social-icon', network: entry, url: url -%}
                  </li>
                {%- endif -%}
              {%- endfor -%}
            </ul>
          </div>

          {%- if section.settings.tagline_show -%}
            <div class="orn-footer__tagline orn-footer__tagline--{{ section.settings.tagline_alignment }}"
                 :class="{ 'is-revealed': pillRevealed }">
              <div class="orn-footer__tagline-lead">{{ section.settings.tagline_lead }}</div>
              {%- if section.settings.tagline_pill_text != blank -%}
                <span class="orn-footer__pill {% if section.settings.tagline_pill_animate %}orn-footer__pill--animate{% endif %}"
                      x-ref="pill"
                      aria-hidden="false">
                  {{ section.settings.tagline_pill_text }}
                </span>
              {%- endif -%}
            </div>
          {%- endif -%}

        </div>

        {%- comment -%} ── Bottom: legales · copyright ── link groups ── {%- endcomment -%}
        <div class="orn-footer__card-bottom orn-footer__card-bottom--align-{{ section.settings.card_bottom_align }}">

          <div class="orn-footer__legal">
            <span class="orn-footer__copyright">{{ copyright }}</span>
            {%- assign sep = '<span class="orn-footer__legal-sep" aria-hidden="true">|</span>' -%}
            {%- for n in (1..3) -%}
              {%- assign t_key = 'legal_link_' | append: n | append: '_text' -%}
              {%- assign u_key = 'legal_link_' | append: n | append: '_url' -%}
              {%- assign t = section.settings[t_key] -%}
              {%- assign u = section.settings[u_key] -%}
              {%- if t != blank and u != blank -%}
                {{ sep }}
                <a class="orn-footer__legal-link" href="{{ u }}">{{ t }}</a>
              {%- endif -%}
            {%- endfor -%}
          </div>

          <div class="orn-footer__menus">
            {% content_for 'blocks' %}
          </div>

        </div>

      </div>
    </div>
  {%- endif -%}

  {% schema %}
    … (ver §3, §4 — JSON completo)
  {% endschema %}
</footer>
```

#### Render del bloque `_orn-footer-link-group.liquid`

```liquid
{%- liquid
  assign menu = linklists[block.settings.menu]
  assign title_style = ''
  if block.settings.title_color != blank
    assign title_style = 'color:' | append: block.settings.title_color | append: ';'
  endif
-%}

<nav class="orn-footer__menu" aria-label="{{ block.settings.title | escape }}" {{ block.shopify_attributes }}>
  <h3 class="orn-footer__menu-title" style="{{ title_style }}">{{ block.settings.title }}</h3>
  {%- if menu and menu.links.size > 0 -%}
    <ul class="orn-footer__menu-list" role="list">
      {%- for link in menu.links -%}
        <li>
          <a class="orn-footer__menu-link"
             href="{{ link.url }}"
             {% if link.url contains '#' and link.url == link.url | split: '/' | last %}data-orn-anchor="true"{% endif %}
             {% if block.settings.link_color != blank %}style="color: {{ block.settings.link_color }};"{% endif %}>
            {{ link.title }}
          </a>
        </li>
      {%- endfor -%}
    </ul>
  {%- endif -%}
</nav>
```

> **`data-orn-anchor`** marca anclas internas para que `assets/orn-footer.js` les aplique smooth scroll respetando `--header-height` (ver §6). Para URLs externas (`https://…`) no se aplica.

#### Snippet `snippets/orn-footer-social-icon.liquid`

```liquid
{%- liquid
  assign network = network | downcase
  case network
    when 'instagram'
      assign label = 'Instagram'
    when 'linkedin'
      assign label = 'LinkedIn'
    when 'facebook'
      assign label = 'Facebook'
    when 'twitter'
      assign label = 'X (Twitter)'
    when 'youtube'
      assign label = 'YouTube'
    when 'tiktok'
      assign label = 'TikTok'
    else
      assign label = network
  endcase
-%}
<a class="orn-footer__social-link" href="{{ url }}" target="_blank" rel="noopener" aria-label="{{ label }}">
  {%- case network -%}
    {%- when 'instagram' -%}
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    {%- when 'linkedin' -%}
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.12 1.43-2.12 2.91V21h-4V9Z"/>
      </svg>
    {%- when 'facebook' -%}
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M13 22v-8h3l1-4h-4V7.5c0-1.16.32-2 2-2h2v-3.5C16.6 2 15.4 1.9 14 1.9 11.18 1.9 9 3.66 9 6.7V10H6v4h3v8h4Z"/>
      </svg>
    {%- when 'twitter' -%}
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2H21l-6.52 7.452L22 22h-6.063l-4.747-6.205L5.6 22H2.84l6.972-7.97L2 2h6.207l4.288 5.671L18.244 2Zm-1.063 18h1.677L7.93 4H6.139L17.181 20Z"/>
      </svg>
    {%- when 'youtube' -%}
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M23 7.5s-.21-1.6-.85-2.3c-.82-.92-1.74-.92-2.16-.97C16.78 4 12 4 12 4s-4.78 0-7.99.23c-.42.05-1.34.05-2.16.97C1.21 5.9 1 7.5 1 7.5S.78 9.4.78 11.3v1.4c0 1.9.22 3.8.22 3.8s.21 1.6.85 2.3c.82.92 1.9.89 2.38.99C6 19.95 12 20 12 20s4.78-.01 7.99-.24c.42-.05 1.34-.05 2.16-.97.64-.7.85-2.3.85-2.3s.22-1.9.22-3.8v-1.4c0-1.9-.22-3.8-.22-3.8ZM10 15V9l5.2 3-5.2 3Z"/>
      </svg>
    {%- when 'tiktok' -%}
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M21 8.4a8.4 8.4 0 0 1-4.9-1.6v6.8a6.4 6.4 0 1 1-6.4-6.4c.34 0 .67.03 1 .08v3.04a3.4 3.4 0 1 0 2.4 3.28V2h3.04A5.4 5.4 0 0 0 21 5.36V8.4Z"/>
      </svg>
  {%- endcase -%}
</a>
```

### 6. Componente Alpine `ornFooter` (`assets/orn-footer.js`)

Funciones:
- Smooth scroll para todos los `<a data-orn-anchor="true">` del footer (CTA del band + cualquier link de los grupos cuyo URL sea un hash).
- Reveal de la pill (IntersectionObserver, agrega `is-revealed` al `.orn-footer__tagline` para disparar la animación CSS).
- Respeta `prefers-reduced-motion`.

```js
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
      root.addEventListener('click', (ev) => {
        const a = ev.target.closest('a[data-orn-anchor="true"]');
        if (!a) return;
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
      const pill = this.$refs.pill;
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
              this._io.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      this._io.observe(pill);
    },
  };
};
```

> **Patrón de carga**: definimos `window.ornFooter` y se invoca desde `x-data="ornFooter()"`. Mismo orden de scripts (`orn-*.js` → `alpine.min.js`) que el resto del proyecto.

### 7. CSS — píldora rotada, layout 2-col, responsive (`assets/orn-footer.css`)

Reglas clave (resumen, ~280 líneas finales):

```css
.orn-footer { display: block; }

/* ── CTA band ── */
.orn-footer__band {
  padding-block: var(--orn-footer-band-pt, 96px) var(--orn-footer-band-pb, 96px);
  padding-inline: var(--page-margin, 24px);
  text-align: center;
}
.orn-footer__band-inner {
  max-width: 760px;
  margin-inline: auto;
  display: flex; flex-direction: column; align-items: center; gap: 24px;
}
.orn-footer__band-heading {
  font-family: var(--font-heading--family);
  font-weight: 700;
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  line-height: 1.15;
}
.orn-footer__band-heading p { margin: 0; }
.orn-footer__band-subtitle {
  font-family: var(--font-body--family);
  font-size: 1rem;
  opacity: .85;
  max-width: 640px;
}
.orn-footer__band-cta { white-space: nowrap; }

/* ── Card ── */
.orn-footer__card-wrap {
  /* La card flota sobre el band: si band está oscuro, la card visualmente queda dentro */
  padding-inline: var(--orn-footer-card-inset, 24px);
  padding-block-end: var(--orn-footer-card-inset, 24px);
  background: var(--orn-footer-band-bg, transparent);
  /* El bg lo aplicamos vía CSS var: cuando band está activo, hereda su color */
}
.orn-footer__card {
  border-radius: var(--orn-footer-card-radius, 32px);
  padding: var(--orn-footer-card-padding, 48px);
  display: flex; flex-direction: column; gap: 48px;
  max-width: 1320px; margin-inline: auto;
}

/* ── Top row (split layout) ── */
.orn-footer__card-top {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}
@media (min-width: 750px) {
  .orn-footer__card--align-split .orn-footer__card-top {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    align-items: start;
  }
}

.orn-footer__brand { display: flex; flex-direction: column; gap: 20px; align-items: flex-start; }
.orn-footer__contact-label { font-weight: 600; margin-bottom: 4px; }
.orn-footer__contact-email { color: inherit; text-decoration: none; }
.orn-footer__contact-email:hover { text-decoration: underline; }

.orn-footer__social { display: flex; gap: 12px; list-style: none; padding: 0; margin: 0; }
.orn-footer__social-link {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border: 1px solid currentColor;
  border-radius: 8px;
  color: inherit;
  transition: background-color .2s ease, color .2s ease;
}
.orn-footer__social-link:hover {
  background-color: currentColor;
  color: var(--color-background);
}

/* ── Tagline + pill ── */
.orn-footer__tagline {
  font-family: var(--font-heading--family);
  font-weight: 700;
  font-size: clamp(1.5rem, 2.6vw, 2.5rem);
  line-height: 1.15;
}
.orn-footer__tagline--right { text-align: right; }
.orn-footer__tagline--center { text-align: center; }
.orn-footer__tagline--left { text-align: left; }

.orn-footer__pill {
  display: inline-block;
  padding: .15em .6em;
  border-radius: 999px;
  background: var(--orn-footer-pill-bg, #0F1720);
  color: var(--orn-footer-pill-fg, #FFFFFF);
  transform: rotate(var(--orn-footer-pill-rotation, -3deg));
  transform-origin: center;
  transition: transform .35s var(--ease-out-cubic, cubic-bezier(.65,.05,.35,1));
}
.orn-footer__pill--animate {
  transform: rotate(0deg) scale(.9);
  opacity: 0;
}
.orn-footer__tagline.is-revealed .orn-footer__pill--animate {
  transform: rotate(var(--orn-footer-pill-rotation, -3deg)) scale(1);
  opacity: 1;
}

/* ── Bottom row ── */
.orn-footer__card-bottom {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  border-top: 1px solid rgb(var(--color-foreground-rgb) / .12);
  padding-top: 24px;
}
@media (min-width: 750px) {
  .orn-footer__card-bottom--align-split {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: start;
  }
}

.orn-footer__legal {
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
  font-size: .875rem;
}
.orn-footer__legal-sep { opacity: .35; }
.orn-footer__legal-link { color: inherit; text-decoration: none; }
.orn-footer__legal-link:hover { text-decoration: underline; }

/* ── Menus ── */
.orn-footer__menus {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
@media (min-width: 750px) {
  .orn-footer__menus { grid-template-columns: repeat(2, minmax(0, 1fr)); justify-items: end; }
  /* 4 columnas si hay más de 2 grupos: max_blocks=4, ajuste fluido */
  .orn-footer__menus:has(> nav:nth-child(3)) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .orn-footer__menus:has(> nav:nth-child(4)) { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

.orn-footer__menu { display: flex; flex-direction: column; gap: 8px; }
.orn-footer__menu-title { font-size: .875rem; font-weight: 600; opacity: .7; margin: 0 0 4px; }
.orn-footer__menu-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.orn-footer__menu-link { color: inherit; text-decoration: none; font-size: .9375rem; }
.orn-footer__menu-link:hover { text-decoration: underline; }

/* ── Mobile ── */
@media (max-width: 749px) {
  .orn-footer__card { padding: 32px 24px; gap: 32px; }
  .orn-footer__card-top, .orn-footer__card-bottom { grid-template-columns: 1fr !important; text-align: center; }
  .orn-footer__brand { align-items: center; }
  .orn-footer__social { justify-content: center; }
  .orn-footer__tagline--right, .orn-footer__tagline--left { text-align: center; }
  .orn-footer__legal { justify-content: center; }
  .orn-footer__menus {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-items: center;
  }
  .orn-footer__menus:has(> nav:nth-child(3)),
  .orn-footer__menus:has(> nav:nth-child(4)) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .orn-footer__pill--animate { transition: none; transform: rotate(var(--orn-footer-pill-rotation, -3deg)); opacity: 1; }
  .orn-footer__social-link { transition: none; }
}

/* Focus visible */
.orn-footer a:focus-visible {
  outline: 2px solid #4ec0de;
  outline-offset: 3px;
  border-radius: 6px;
}
```

> **Background del card-wrap**: para que la card "flote" sobre el band oscuro (efecto del diseño, donde la card blanca queda dentro de un padding del color del band), necesitamos que `.orn-footer__card-wrap` herede el bg del band cuando ambos son visibles. Truco: pintamos el wrap con el bg del band via CSS var solo si `card_show && cta_band_show`. Implementación práctica:
> - El band usa `color-{{ scheme }}` que setea `--color-background`.
> - Aplicamos `background-color: var(--color-background)` en `.orn-footer__band` (heredado por color-scheme).
> - `.orn-footer__card-wrap` queda **dentro** del flow del footer, **no** del band. Para que el padding inferior del band se vea como "frame" alrededor de la card, **invertimos**: el band lleva `padding-bottom: 0` y la card-wrap lleva `background: <band-bg>; padding: 0 var(--inset) var(--inset) var(--inset);`. Así la card queda con padding del color del band a los lados y abajo.
> - Para conseguir que el wrap tome el bg del band sin duplicar settings, usamos `[data-band-bg]` data attribute en el `<footer>` y lo seteamos vía Liquid:
>   ```liquid
>   style="… --orn-footer-band-bg: rgba({{ section.settings.cta_band_color_scheme.settings.background.rgba }});"
>   ```
>   y en CSS: `.orn-footer__card-wrap { background: var(--orn-footer-band-bg, transparent); }`. **Verificar** que `section.settings.cta_band_color_scheme.settings.background.rgba` sea accesible (Horizon lo expone — ver `sections/header.liquid` línea 309 donde usa el patrón idéntico). Sí, está disponible.

### 8. Accesibilidad

- `<footer>` landmark; cada `<nav class="orn-footer__menu" aria-label="<title>">` con su propio label (Servicios, Agencia, etc.).
- Iconos sociales: `<a aria-label="Instagram">` por red; los SVG llevan `aria-hidden="true"`.
- Contact email: `<a href="mailto:…">`. Hover con underline.
- Pill rotada: `aria-hidden="false"` (se lee como parte del texto del tagline). El contenido es texto plano dentro de un `<span>`; lectores lo leen sin problema.
- Focus visible: outline 2px `#4ec0de`.
- `prefers-reduced-motion`: pill se muestra estática (sin animación de entrada); transitions desactivadas en social-link.
- Smooth scroll del CTA: si target no existe → `preventDefault` no se llama → browser hace su default.

### 9. Compatibilidad con `--header-height` y otros patrones

- El footer **no produce ni consume** `--header-height` directamente. El smooth scroll del CTA aterriza sobre `#contacto` (provisto por `orn-contact-form`), que ya tiene `scroll-margin-top: var(--header-height, 80px)`. Funciona out-of-the-box.
- El JS (`window.ornFooter`) se carga **antes** de `alpine.min.js` (mismo orden que el resto). Confirmado en `snippets/scripts.liquid` líneas 277–285.

### 10. Cambios en `sections/footer-group.json`

1. `sections.footer.type`: `"footer"` → `"orn-footer"`.
2. `sections.footer.blocks`: vaciar (`{}`) — los blocks de Horizon (`group_wErUQf`, `email-signup_HafH7P`) no aplican. Reemplazar por:
   ```json
   "blocks": {
     "servicios": { "type": "link-group", "settings": { "title": "Servicios", "menu": "footer-servicios" } },
     "agencia":   { "type": "link-group", "settings": { "title": "Agencia",   "menu": "footer-agencia"   } }
   },
   "block_order": ["servicios", "agencia"]
   ```
3. `sections.footer.settings`: reemplazar por los defaults del nuevo schema (§3). Mínimo:
   ```json
   "settings": {
     "cta_band_show": true,
     "cta_band_color_scheme": "scheme-4",
     "cta_band_heading": "<p>Lorem ipsum dolor sit amet,<br>consectetur adipiscing elit</p>",
     "cta_band_subtitle": "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>",
     "cta_band_button_text": "Lorem ipsum",
     "cta_band_button_anchor": "#contacto",
     "cta_band_button_variant": "secondary",
     "cta_band_button_open_in_new_tab": false,
     "cta_band_padding_block_start": 96,
     "cta_band_padding_block_end": 96,
     "card_show": true,
     "card_color_scheme": "scheme-1",
     "card_radius": 32,
     "card_inset": 24,
     "card_padding": 48,
     "logo_height": 52,
     "logo_alt": "Ornevo",
     "contact_label": "Contacto",
     "contact_email": "contact@ornevo.fr",
     "tagline_show": true,
     "tagline_lead": "<p>Agencia digital en Normandía — web, marketing y e-commerce para</p>",
     "tagline_pill_text": "PYMES ambiciosas.",
     "tagline_pill_bg": "#0F1720",
     "tagline_pill_fg": "#FFFFFF",
     "tagline_pill_rotation": -3,
     "tagline_pill_animate": true,
     "tagline_alignment": "right",
     "copyright_text": "© {year} Ornevo",
     "legal_link_1_text": "Aviso legal",
     "legal_link_2_text": "Política de privacidad",
     "card_top_align": "split",
     "card_bottom_align": "split"
   }
   ```
   (Los `*_url` legales y `social_*_url` se dejan vacíos para que el cliente los rellene desde el editor.)
4. `sections.utilities`: **borrar** completamente del JSON (no solo del `order`). Su sección `footer-utilities` deja de tener referencia y queda dormida en disco igual que `header.liquid`.
5. `order`: `["footer", "utilities"]` → `["footer"]`.

> **Comportamiento ante un horizon-update**: si Horizon mete cambios en `footer-group.json`, son merge conflicts predecibles (el archivo es JSON pequeño). Si Horizon cambia `sections/footer.liquid` o `footer-utilities.liquid` en disco, **no afecta** porque ya no se cargan.

## Consequences

**Positive:**
- Footer 1:1 con el diseño, completamente editable en el theme editor (copy, links, colores, sociales, layout, anchor del CTA).
- Pill rotada del tagline configurable (texto, color, ángulo, animación) — la firma visual de la marca queda en manos del editor.
- Link groups via `link_list` aprovecha el sistema nativo de menús de Shopify (drag-drop, reorder, single source of truth).
- CTA del band usa el mismo anchor que el del header (`#contacto`) y la misma técnica de smooth scroll → comportamiento consistente en toda la landing.
- Cambios aislados: 5 archivos nuevos + 3 archivos editados con patches mínimos. Resistente a `horizon-update-*`.
- Iconos sociales inline SVG → cero dependencias, tamaño reducido, color dinámico vía `currentColor`.

**Negative / trade-offs:**
- El cliente debe **crear los menús de footer** (`footer-servicios`, `footer-agencia`) en `Online Store → Navigation`. Si no los crea, los grupos quedan con título pero sin links. Mitigado: el `<nav>` se renderiza igual con su `<h3>` y la lista vacía no se imprime.
- El footer Ornevo **no soporta email-signup** (newsletter) en V1. El diseño no lo pide. Si se necesita, restablecer el block `email-signup` requiere schema dedicado o ampliar `orn-footer` con un setting de newsletter futuro.
- `tagline_lead` + `tagline_pill_text` están en **dos settings separados** en lugar de un único campo richtext con marcado custom. Mitigación: la separación es admin-friendly (input directo) y permite estilar la pill independientemente. Cost: el cliente no puede insertar la pill **en medio** del lead, solo al final. Aceptable para el diseño actual; si en el futuro se necesita pill al inicio o en medio, se añade `tagline_pill_position: 'before' | 'after'`.
- Tres slots de legales (max 3) cubren casi todos los casos (Aviso legal · Privacy · Cookies / Términos). Si se necesitan más, se añade un cuarto slot o se migra a un `link_list` "footer-legal".
- La animación de la pill usa IntersectionObserver — coste despreciable, pero requiere browser moderno (cubierto en evergreen + Safari 12.1+).

**Risks and mitigations:**
- **Riesgo:** un horizon-update toca `sections/footer.liquid` o reescribe `footer-group.json`. → **Mitigación:** ya no cargamos `footer.liquid` (queda dormido); el JSON tiene patch documentado en §10 que se reaplica si hay conflict.
- **Riesgo:** la combinación `band_color_scheme` con `card_color_scheme` produce contraste pobre (ej. ambos claros). → **Mitigación:** defaults del preset cubren el caso del diseño (deep + light); editor advierte solo si el cliente cambia ambos. No bloqueamos el cambio.
- **Riesgo:** `link_list` referenciado no existe en la tienda → `linklists[block.settings.menu]` retorna `nil` → la lista no se imprime. → **Mitigación:** check explícito `{%- if menu and menu.links.size > 0 -%}`. Sin error, sin lista vacía visible.
- **Riesgo:** la pill rotada se sale del contenedor en pantallas estrechas (mobile). → **Mitigación:** padding y line-height generosos; en mobile la pill cae a su propia línea (display: inline-block + word-break implícito); además `overflow-wrap: anywhere` en `.orn-footer__tagline` como red de seguridad.
- **Riesgo:** social icons SVG inline aumentan el tamaño del HTML del footer (~6 SVG × ~150B = ~1KB). Despreciable.
- **Riesgo:** `horizon-update-*` introduce un nuevo `<footer>` wrapper en `layout/theme.liquid`. → **Mitigación:** `theme.liquid` ya envuelve `{% sections 'footer-group' %}` en `<footer>`. Como `orn-footer` también renderiza un `<footer>` interno, queda anidado `<footer><footer>…</footer></footer>` — válido HTML pero ruidoso para a11y. **Solución:** envolver con `<div>` en lugar de `<footer>` interno (cambio de tag en §5: `<footer class="orn-footer">` → `<div class="orn-footer">`). El `<footer>` externo de `theme.liquid` ya provee el landmark. **Aplicar este cambio** en la implementación.

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| Editar `sections/footer.liquid` para imitar el diseño | 800+ líneas con blocks (group, social-links, copyright, policy-list, email-signup) y settings que no usamos. Conflictos garantizados en updates. |
| Usar `sections/footer-utilities.liquid` para la fila inferior | Lo mismo: dependiente de blocks de Horizon (`footer-copyright`, `footer-policy-list`, `social-links`) que el diseño no respeta. Más simple swap completo. |
| Newsletter integrado en el footer (V1) | El diseño no lo muestra; añadirlo crearía un setting que el editor podría confundirse y activar, rompiendo el layout. Diferido para futura iteración. |
| Pill rotada con SVG path | Requiere texto convertido a path o `<text>` en SVG, perdiendo accesibilidad y traducibilidad. Span + transform es 1:1 con el diseño y mantiene el texto seleccionable. |
| Repeater de items por columna en lugar de `link_list` | 6+ settings por columna × 4 columnas = 24+ inputs en el editor. `link_list` es 1 input por columna y reusa los menús de Shopify. |
| Animar la pill con GSAP / Motion | Overkill: una transición CSS + IntersectionObserver cubre el efecto al 100%. |
| Renderizar legales como `link_list` separado | Por consistencia con el resto del proyecto se usan settings explícitos (3 slots) — los legales cambian poco y suelen ser 2-3 fijos. |
| Hardcodear copyright `© {{ "now" \| date: "%Y" }} {{ shop.name }}` sin setting | Pierde flexibilidad si el cliente quiere "© 2026 Ornevo SAS · RCS 123…". El placeholder `{year}` cumple la misma función con flexibilidad total. |

## Implementation notes

### Archivos a crear
- `sections/orn-footer.liquid` — markup §5 (con tag raíz `<div>`, no `<footer>`, ver §"Risks and mitigations") + schema completo §3.
- `blocks/_orn-footer-link-group.liquid` — markup §5 + schema §4. `name: "Link group"`.
- `assets/orn-footer.css` — §7 (~280 líneas).
- `assets/orn-footer.js` — §6 (~60 líneas), expuesto como `window.ornFooter`.
- `snippets/orn-footer-social-icon.liquid` — §5 (snippet con `case` por red social).

### Archivos a editar
- `snippets/stylesheets.liquid` → añadir `{{ 'orn-footer.css' | asset_url | stylesheet_tag }}` debajo de `orn-contact-form.css`.
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-footer.js' | asset_url }}" defer></script>` junto a los demás `orn-*.js`, **antes** de `alpine.min.js`.
- `sections/footer-group.json` → según §10 punto a punto.

### Variables CSS expuestas
```
--orn-footer-card-radius     // border-radius del card
--orn-footer-card-inset      // margen lateral del wrap (frame del band visible)
--orn-footer-card-padding    // padding interno del card
--orn-footer-pill-bg         // fondo de la pill rotada
--orn-footer-pill-fg         // texto de la pill
--orn-footer-pill-rotation   // ángulo en deg
--orn-footer-band-pt         // padding-top del band
--orn-footer-band-pb         // padding-bottom del band
--orn-footer-band-bg         // bg del band, leído del color_scheme.settings.background.rgba (usado por el wrap)
```

### Orden de ejecución
1. Crear `assets/orn-footer.css` con el contenido de §7.
2. Crear `assets/orn-footer.js` con `window.ornFooter` (§6).
3. Crear `snippets/orn-footer-social-icon.liquid` con los 6 SVG inline (§5).
4. Crear `blocks/_orn-footer-link-group.liquid` con schema §4 + markup §5.
5. Crear `sections/orn-footer.liquid` con markup §5 (raíz `<div>`) + schema §3 + render de blocks via `content_for 'blocks'` + estilo inline `--orn-footer-band-bg: rgba({{ section.settings.cta_band_color_scheme.settings.background.rgba }})`.
6. Editar `snippets/stylesheets.liquid` (CSS).
7. Editar `snippets/scripts.liquid` (JS antes de Alpine).
8. Editar `sections/footer-group.json` según §10.
9. Smoke test (en theme editor):
   - `/landing` (template `page.landing.json`): footer renderiza band oscuro centrado + card blanca con todo.
   - Click en CTA → smooth scroll a `#contacto` aterrizando bajo el header sticky.
   - Resize a < 750px: todo apila centrado; pill mantiene su rotación; menú-list a 2 columnas.
   - Hover en social: invierte color; hover en menu-link: underline.
   - DevTools → reduce motion: pill aparece sin animar; smooth scroll = jump instant.
   - Editar settings: cambiar `tagline_pill_rotation` a `0` → pill horizontal; cambiar `tagline_pill_bg` a `#4EC0DE` → pill cyan acento (decorativo, ADR-0001 permite el uso aquí porque no es CTA).
   - axe-core: 0 violaciones.
10. **Crear menús en admin de Shopify** (`Online Store → Navigation`):
    - `footer-servicios` → links: Consultoría y estrategia (`#servicios`), Diseño UX/UI (`#servicios`), Desarrollo (`#servicios`), Crecimiento y seguimiento (`#servicios`).
    - `footer-agencia` → links: Sobre nosotros (`#nosotros`), Tecnologías (`#tecnologias`), Equipo (`#equipo`), Blog (`#blog`), Reseñas (`#testimonios`), Contacto (`#contacto`).
    - Confirmar que aparecen en el footer.
11. Configurar páginas legales: crear `pages/aviso-legal` y `pages/politica-de-privacidad` (o usar `/policies/legal-notice` y `/policies/privacy-policy` de Shopify). Setear `legal_link_1_url` y `legal_link_2_url`.
12. Confirmar que el header CTA `¿Un proyecto?` (ADR-0003) y el footer CTA del band ambos aterrizan en `#contacto` (provisto por `orn-contact-form`, ADR-0004).

### Pendientes documentales
- (Cliente) Crear los menús `footer-servicios` y `footer-agencia` desde admin.
- (Cliente) Subir el logo en `Section settings → logo`.
- (Cliente) Configurar URLs de redes sociales (vacías por default → no se renderizan).
- (Cliente) Configurar URLs de los links legales.
- (V2) Reactivar el footer-utilities de Horizon si se quiere newsletter signup. Mientras tanto, el block queda en disco sin referencia.

## References

- Diseños: `landing/footer/footer_desktop.png`, `landing/footer/footer_responsive.png`.
- ADR-0001 — design system base (color schemes, fuentes, botones `.ornevo-btn--*`).
- ADR-0002 — `orn-services` (patrón Alpine + scroll-margin-top).
- ADR-0003 — `orn-header` (productor de `--header-height` en `<body>`; CTA del header apunta a `#contacto`; mismo patrón de swap en `header-group.json`).
- ADR-0004 — `orn-contact-form` (provee el ancla `#contacto` que consume el CTA del footer).
- Horizon v3.4.0 — `sections/footer.liquid`, `sections/footer-utilities.liquid`, `sections/footer-group.json` (referencia, **no** se modifican los liquid; **se edita** el JSON).
- Shopify `link_list` setting: https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#link_list
- Shopify Liquid `linklists`: https://shopify.dev/docs/api/liquid/objects/linklists
- WAI-ARIA Authoring Practices — Landmarks: https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/
