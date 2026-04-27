# ADR-0004: Sección Formulario de contacto (`orn-contact-form`)

**Date:** 2026-04-26
**Author(s):** Miguel Soler
**Status:** Proposed

## Context

Cuarta sección de la landing de Ornevo. Es un **formulario de contacto** que en V1 vive **como sección** (no popup) — la spec habla de popup pero esa es la V2; aquí sólo respetamos el diseño visual y el comportamiento de envío. Diseños:

- Desktop: `landing/form/form_desktop.png` — layout 2 columnas, izquierda card gris claro con headline grande "Un projet à nous confier ?" + subtítulo "Nous vous contactons sous 4h ouvrées."; derecha grid 2 columnas con 6 inputs cortos + 1 select full-width + 1 textarea full-width + CTA primario `Enviar` (pill negro). Botón `×` arriba derecha (popup-only — **se omite en V1**).
- Mobile: `landing/form/form_responsive.png` — apilado. Card gris arriba con logo, heading multilínea "¿Una idea? ¿Un proyecto?", **tag pill** "¡Hablemos!" sobre fondo neutro, subtítulo. Form abajo, una columna.
- Specs: `landing/form/specs.md`. Tabla de validación: `landing/form/validacion_1.png` + `landing/form/validacion_2.png`.

Spec resumida (omitiendo todo lo "popup"):

- **ID administrable** (anchor de URL): `ornevo.fr/#<id-seccion>` debe hacer scroll a la sección respetando la altura del header sticky.
- **Cada campo administrable**: label, placeholder (gris, desaparece en focus), toggle `obligatorio` (asterisco automático en label), mensaje de error custom.
- **2 dropdowns** con opciones administrables.
- **CTA administrable**: texto + estilo del DS (`primary` / `secondary`) + comportamiento submit con validación → envío email a la tienda → mensaje de éxito.
- **8 campos canónicos** (validación según `validacion_1.png` + `validacion_2.png`):
  | # | id interno | tipo | requerido por defecto | validación |
  |---|------------|------|-----------------------|------------|
  | 1 | `fullname` | text | ✓ | letras + espacios + acentos; min 3 chars; debe contener al menos `palabra espacio palabra` (nombre + apellido) |
  | 2 | `email` | email | ✓ | RFC `usuario@dominio.ext`, sin espacios |
  | 3 | `phone` | tel | ✓ | 7–15 dígitos (E.164), acepta `+`, `-`, `(`, `)`, espacios; auto-formato `XX XX XX XX XX` mientras escribe; bloquea letras |
  | 4 | `company` | text | ✓ | letras + números + `.` + `-`; min 2 chars |
  | 5 | `website` | url | ✗ | si llena: empieza por `http://` o `https://` |
  | 6 | `select_1` | select | ✗ | sólo seleccionar de la lista (sin validación de texto) |
  | 7 | `select_2` | select | ✗ | sólo seleccionar de la lista (sin validación de texto) |
  | 8 | `message` | textarea | ✗ | si llena: min 10 chars; recomendado max ~1000 |

- **Envío del formulario**: por correo electrónico al email de contacto de la tienda (`contact@ornevo.fr`). Stack soportado: [`{% form 'contact' %}` de Shopify](https://shopify.dev/docs/storefronts/themes/customer-engagement/add-contact-form). Shopify envía el email al destinatario configurado en `Settings → Notifications → "Order notifications" / Sender email` (o el `customer_email` del tema, según versión); todos los `<input name="contact[Foo]">` se incluyen en el cuerpo del email; `<input name="email">` define el reply-to; `<input name="contact[body]">` (o `<textarea name="contact[body]">`) compone el cuerpo principal.

Stack del proyecto (heredado de ADR-0001 / 0002 / 0003):

- Alpine.js cargado vía `snippets/scripts.liquid` (orden: `orn-*.js` → `alpine.min.js`); componentes registrados como `window.<name>`.
- CSS y JS por sección en `assets/<nombre>.css|js`.
- Naming `orn-` para secciones; `_orn-<seccion>-<bloque>.liquid` para blocks.
- Color schemes nativos del theme; botones `.ornevo-btn--primary|secondary|tertiary`.
- `--header-height` lo escribe `assets/orn-header.js` en `<body>` → `scroll-margin-top: var(--header-height)` ya funciona globalmente. Esta sección lo consume sin esfuerzo.

## Decision drivers

- **Must:** la sección expone un `anchor_id` editable; la sección lleva `id="<anchor_id>"` y `scroll-margin-top: var(--header-height, 80px)` para que cualquier botón que apunte a `#<id>` haga scroll quedando bajo el header flotante. Compatibilidad 1:1 con el patrón ya usado por `orn-services` (ADR-0002 §8) y consumido por `orn-header` (ADR-0003).
- **Must:** **un solo file de sección + un solo `<form>`** generado por `{% form 'contact' %}` para que Shopify procese el envío automáticamente al email de la tienda — no se montan endpoints HTTP custom ni servicios externos.
- **Must:** validación **client-side** completa según la tabla de la spec **antes** de hacer submit (preventDefault si hay errores). Estado de error visible por campo, mensaje administrable.
- **Must:** validación **server-side** mínima: confiar en lo que retorne `{% form %}` (Shopify valida al menos `email` por formato). Mostrar `form.errors` como mensaje genérico bajo el form si llega.
- **Must:** auto-formato del teléfono en tiempo real (espacio cada 2 dígitos, bloqueo de letras) + conversión opcional a E.164 antes del submit (input hidden con valor formateado).
- **Must:** estado de éxito: cuando `form.posted_successfully?` es true, ocultar el `<form>` y renderizar el mensaje de éxito administrable. El form viene servido por Shopify con `?contact_posted=true` en la URL — patrón estándar.
- **Must:** asterisco automático en labels de campos `required`; placeholder gris que desaparece en focus (default del navegador); cumple `aria-required`, `aria-invalid`, `aria-describedby`.
- **Must:** todo administrable (heading, subtitle, tag pill, logo, labels, placeholders, errores, opciones de selects, copy del CTA, copy del éxito, esquemas de color de cada panel).
- **Should:** sin librerías de validación externas — Alpine + reglas inline cubren todos los casos.
- **Should:** transiciones <300ms; `prefers-reduced-motion` desactiva animación de error/éxito.
- **Should:** schema con defaults sembrados con la copy del diseño (FR para desktop, ES para mobile — el cliente elige uno; **default FR** porque el desktop manda y la landing es bilingüe sólo en V2).
- **Nice to have:** envío E.164 normalizado a campo oculto `contact[Phone E164]` (string `+33XXXXXXXXX`) además del valor mostrado en `contact[Telefono]` (formato visible).

## Decision

Creamos **`sections/orn-contact-form.liquid`** con su componente Alpine **`ornContactForm`** en **`assets/orn-contact-form.js`** y estilos en **`assets/orn-contact-form.css`**. Sin blocks: las opciones de los dos selects viven como **`textarea`** (una opción por línea) en los settings de la sección — más simple que crear un block-type por opción, y aceptable porque la sección **no es metafield-rendered** (igual que `orn-header`).

### 1. Estructura de archivos

```
sections/orn-contact-form.liquid     # shell + {% form 'contact' %} + 8 campos + estado éxito
assets/orn-contact-form.css          # layout 2-col, tag pill, inputs, errores, success
assets/orn-contact-form.js           # window.ornContactForm — validación + auto-formato + estado UI
```

Sin blocks. Sin snippets adicionales (los inputs se renderizan inline desde la sección).

### 2. Registro

- `snippets/stylesheets.liquid` → añadir `{{ 'orn-contact-form.css' | asset_url | stylesheet_tag }}` debajo de `orn-header.css`.
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-contact-form.js' | asset_url }}" defer></script>` junto a `orn-header.js`, **antes** de `alpine.min.js`.
- `templates/page.landing.json` → añadir `orn-contact-form` al final de `order` con sus settings default (anchor `contacto`).
- **No editar** `layout/theme.liquid`, `header-group.json`, `sections/header.liquid`, ni archivos de Horizon.

### 3. Schema de la sección

Esta sección **no se renderiza vía metafield** → se permiten `textarea`, `checkbox`, `range`. Settings (con defaults explícitos para que un reset reproduzca el diseño FR):

#### Generales
| id | type | default | notas |
|----|------|---------|-------|
| `anchor_id` | `text` | `contacto` | id del `<section>`; se sanea con `\| handleize`. Cualquier botón con `href="#contacto"` hace scroll aquí. |
| `color_scheme_left` | `color_scheme` | `scheme-2` (cream / neutro 02) | Card izquierda. |
| `color_scheme_right` | `color_scheme` | `scheme-1` (light) | Panel derecho con form. |
| `padding_block_start` | `range` (0–120 px, step 4) | `64` | — |
| `padding_block_end` | `range` (0–120 px, step 4) | `64` | — |

#### Card izquierda (heading + tag + subtítulo)
| id | type | default | notas |
|----|------|---------|-------|
| `logo` | `image_picker` | — | SVG/PNG del logo (visible mobile; desktop opcional). |
| `logo_show_desktop` | `checkbox` | `false` | En desktop el diseño no muestra logo; default oculto. |
| `logo_height` | `range` (16–48 px, step 2) | `32` | — |
| `heading` | `richtext` | `<p>Un projet à<br>nous confier ?</p>` | Title H2. **Permite `<br>`** para que el admin controle saltos de línea. |
| `tag_pill_text` | `text` | `` | Pill (visible si no vacío). En mobile el diseño la usa; en desktop opcional. |
| `subtitle` | `richtext` | `<p>Nous vous contactons sous 4h ouvrées.</p>` | — |

#### Form: campo 1 — Nombre completo (`fullname`, type=text, required por default)
| id | type | default |
|----|------|---------|
| `fullname_label` | `text` | `Nom` |
| `fullname_placeholder` | `text` | `` |
| `fullname_required` | `checkbox` | `true` |
| `fullname_error_required` | `text` | `Ce champ est obligatoire.` |
| `fullname_error_format` | `text` | `Indiquez votre nom et prénom (lettres et espaces seulement, min. 3 caractères).` |

#### Form: campo 2 — Email (`email`, type=email, required por default)
| id | type | default |
|----|------|---------|
| `email_label` | `text` | `E-mail` |
| `email_placeholder` | `text` | `` |
| `email_required` | `checkbox` | `true` |
| `email_error_required` | `text` | `Ce champ est obligatoire.` |
| `email_error_format` | `text` | `Adresse e-mail invalide (ex. : prenom@domaine.fr).` |

#### Form: campo 3 — Teléfono (`phone`, type=tel, required por default)
| id | type | default |
|----|------|---------|
| `phone_label` | `text` | `Numéro de téléphone` |
| `phone_placeholder` | `text` | `` |
| `phone_required` | `checkbox` | `true` |
| `phone_error_required` | `text` | `Ce champ est obligatoire.` |
| `phone_error_format` | `text` | `Numéro invalide (7 à 15 chiffres).` |
| `phone_country_code` | `text` | `+33` | Para conversión E.164 del campo oculto. |

#### Form: campo 4 — Empresa (`company`, type=text)
| id | type | default |
|----|------|---------|
| `company_label` | `text` | `Nom de l'entreprise` |
| `company_placeholder` | `text` | `` |
| `company_required` | `checkbox` | `true` |
| `company_error_required` | `text` | `Ce champ est obligatoire.` |
| `company_error_format` | `text` | `Min. 2 caractères (lettres, chiffres, points et tirets autorisés).` |

#### Form: campo 5 — Sitio web (`website`, type=url, opcional)
| id | type | default |
|----|------|---------|
| `website_label` | `text` | `Site web` |
| `website_placeholder` | `text` | `https://` |
| `website_required` | `checkbox` | `false` |
| `website_error_required` | `text` | `Ce champ est obligatoire.` |
| `website_error_format` | `text` | `URL invalide. Doit commencer par http:// ou https://.` |

#### Form: campo 6 — Select 1 (`select_1`, opcional)
| id | type | default |
|----|------|---------|
| `select_1_label` | `text` | `Objet de la demande` |
| `select_1_placeholder` | `text` | `Sélectionnez…` |
| `select_1_required` | `checkbox` | `false` |
| `select_1_error_required` | `text` | `Ce champ est obligatoire.` |
| `select_1_options` | `textarea` | `Site web\nE-commerce\nSEO\nMarketing\nAutre` | **Una opción por línea**. Líneas vacías se ignoran. |

#### Form: campo 7 — Select 2 (`select_2`, opcional)
| id | type | default |
|----|------|---------|
| `select_2_label` | `text` | `Nombre d'employés` |
| `select_2_placeholder` | `text` | `Sélectionnez…` |
| `select_2_required` | `checkbox` | `false` |
| `select_2_error_required` | `text` | `Ce champ est obligatoire.` |
| `select_2_options` | `textarea` | `1\n2 à 10\n11 à 50\n51 à 200\n200+` | Una opción por línea. |

#### Form: campo 8 — Mensaje (`message`, textarea, opcional)
| id | type | default |
|----|------|---------|
| `message_label` | `text` | `Décrivez-nous votre projet` |
| `message_placeholder` | `text` | `` |
| `message_required` | `checkbox` | `false` |
| `message_error_required` | `text` | `Ce champ est obligatoire.` |
| `message_error_format` | `text` | `Min. 10 caractères si vous renseignez ce champ.` |
| `message_max_chars` | `range` (200–2000, step 100) | `1000` | Hard-cap visual y `maxlength`. |

#### Submit + estado éxito
| id | type | default |
|----|------|---------|
| `submit_text` | `text` | `Envoyer` |
| `submit_variant` | `select` (`primary` / `secondary`) | `primary` | Spec sólo pide 2 estilos. |
| `email_subject_prefix` | `text` | `Nouveau contact – Ornevo` | Prefijo de `contact[subject]`. |
| `success_heading` | `inline_richtext` | `Merci, message bien reçu.` | — |
| `success_message` | `richtext` | `<p>Nous vous recontactons sous 4h ouvrées.</p>` | — |
| `error_summary_text` | `text` | `Vérifiez les champs en rouge ci-dessus.` | Mensaje arriba del form si hay errores en client-side. |
| `generic_server_error` | `text` | `Une erreur est survenue. Réessayez dans un instant.` | Mostrado si `form.errors` existe tras submit. |

`presets`: 1 preset llamado "Form de contacto" — settings de fábrica = los defaults arriba.

`enabled_on.templates: ["index","page"]` (la sección no tiene sentido en `product`/`collection` para la V1, pero se puede ampliar después; admite los templates donde se usa la landing).

`max_blocks: 0`. Sin blocks.

### 4. Markup (resumen)

```liquid
{% liquid
  assign anchor = section.settings.anchor_id | handleize | default: section.id
  assign success = false
%}

<section
  id="{{ anchor }}"
  class="orn-contact orn-contact--two-col"
  x-data="ornContactForm({
    countryCode: '{{ section.settings.phone_country_code | escape }}',
    rules: {
      fullname: {{ section.settings.fullname_required }},
      email:    {{ section.settings.email_required }},
      phone:    {{ section.settings.phone_required }},
      company:  {{ section.settings.company_required }},
      website:  {{ section.settings.website_required }},
      select_1: {{ section.settings.select_1_required }},
      select_2: {{ section.settings.select_2_required }},
      message:  {{ section.settings.message_required }}
    },
    messageMax: {{ section.settings.message_max_chars }}
  })"
  x-init="init()"
  style="--orn-contact-pt: {{ section.settings.padding_block_start }}px;
         --orn-contact-pb: {{ section.settings.padding_block_end }}px;"
  aria-labelledby="{{ anchor }}-title"
>
  <div class="orn-contact__grid">

    {%- comment -%} ── Card izquierda ── {%- endcomment -%}
    <aside class="orn-contact__intro color-{{ section.settings.color_scheme_left }}">
      {%- if section.settings.logo != blank -%}
        <div class="orn-contact__logo {% unless section.settings.logo_show_desktop %}orn-contact__logo--mobile-only{% endunless %}">
          {{ section.settings.logo | image_url: width: 320
              | image_tag: alt: 'Ornevo',
                          loading: 'lazy',
                          style: 'height:' | append: section.settings.logo_height | append: 'px;width:auto;' }}
        </div>
      {%- endif -%}

      <h2 id="{{ anchor }}-title" class="orn-contact__title">
        {{ section.settings.heading }}
      </h2>

      {%- if section.settings.tag_pill_text != blank -%}
        <span class="orn-contact__pill">{{ section.settings.tag_pill_text }}</span>
      {%- endif -%}

      {%- if section.settings.subtitle != blank -%}
        <div class="orn-contact__subtitle">{{ section.settings.subtitle }}</div>
      {%- endif -%}
    </aside>

    {%- comment -%} ── Panel derecho con form / éxito ── {%- endcomment -%}
    <div class="orn-contact__panel color-{{ section.settings.color_scheme_right }}">

      {%- form 'contact', id: 'orn-contact-form', class: 'orn-contact__form',
          x-ref: 'form',
          'x-show': '!success',
          '@submit': 'onSubmit($event)',
          novalidate: 'novalidate' -%}

        {%- if form.errors -%}
          <div class="orn-contact__server-error" role="alert">
            {{ section.settings.generic_server_error }}
          </div>
        {%- endif -%}

        {% comment %} subject prefijo {% endcomment %}
        <input type="hidden" name="contact[subject]" value="{{ section.settings.email_subject_prefix | escape }}">

        <div class="orn-contact__row orn-contact__row--2">
          {%- render 'orn-contact-input',
              field: 'company',
              type: 'text',
              section: section -%}
          {%- render 'orn-contact-input',
              field: 'fullname',
              type: 'text',
              section: section -%}
        </div>

        <div class="orn-contact__row orn-contact__row--2">
          {%- render 'orn-contact-input',
              field: 'email',
              type: 'email',
              section: section -%}
          {%- render 'orn-contact-input',
              field: 'phone',
              type: 'tel',
              section: section,
              extra_attrs: 'inputmode="tel" @input="onPhoneInput($event)"' -%}
        </div>

        <div class="orn-contact__row orn-contact__row--2">
          {%- render 'orn-contact-select',
              field: 'select_1',
              section: section -%}
          {%- render 'orn-contact-input',
              field: 'website',
              type: 'url',
              section: section -%}
        </div>

        <div class="orn-contact__row">
          {%- render 'orn-contact-select',
              field: 'select_2',
              section: section -%}
        </div>

        <div class="orn-contact__row">
          {%- render 'orn-contact-textarea',
              field: 'message',
              section: section -%}
        </div>

        {%- comment -%} hidden E.164 para conservar el número estandarizado {%- endcomment -%}
        <input type="hidden" name="contact[Phone E164]" :value="phoneE164">
        {%- comment -%} body principal: lo componemos en JS antes del submit (concatenando todos los campos) en `contact[body]` {%- endcomment -%}
        <textarea name="contact[body]" x-ref="bodyField" hidden></textarea>

        <div class="orn-contact__actions">
          <button type="submit"
                  class="orn-contact__submit ornevo-btn ornevo-btn--{{ section.settings.submit_variant }}"
                  :disabled="submitting">
            <span x-show="!submitting">{{ section.settings.submit_text }}</span>
            <span x-show="submitting" x-cloak>…</span>
          </button>
          <p class="orn-contact__error-summary" role="alert" x-show="hasErrors" x-cloak>
            {{ section.settings.error_summary_text }}
          </p>
        </div>

      {%- endform -%}

      {%- comment -%} Estado éxito: mostrado si Shopify devuelve posted_successfully {%- endcomment -%}
      {%- if form.posted_successfully? -%}
        {%- assign success = true -%}
      {%- endif -%}
      <div class="orn-contact__success"
           x-show="success || {{ success }}"
           {% unless form.posted_successfully? %}x-cloak{% endunless %}
           role="status" aria-live="polite">
        <h3 class="orn-contact__success-title">{{ section.settings.success_heading }}</h3>
        <div class="orn-contact__success-body">{{ section.settings.success_message }}</div>
      </div>
    </div>

  </div>

  {% schema %}
    … (ver §3, JSON completo)
  {% endschema %}
</section>
```

> **Snippets renderizados** (`orn-contact-input`, `orn-contact-select`, `orn-contact-textarea`): pequeños helpers para no repetir markup. Cada uno renderiza su `<label>` (con `*` automático si requerido), su `<input>/<select>/<textarea>` con atributos `aria-required`, `aria-invalid`, `aria-describedby`, y un `<p class="orn-contact__error" :id="…-error" x-show="errors.<field>" x-text="errors.<field>">`. Ver §5 para los snippets completos.

### 5. Snippets de campo

**`snippets/orn-contact-input.liquid`** (input genérico text/email/tel/url):

```liquid
{%- liquid
  assign field = field
  assign type = type
  assign section = section
  assign label_setting = field | append: '_label'
  assign placeholder_setting = field | append: '_placeholder'
  assign required_setting = field | append: '_required'
  assign label = section.settings[label_setting]
  assign placeholder = section.settings[placeholder_setting]
  assign required = section.settings[required_setting]
  assign id = 'orn-contact-' | append: field
-%}
<div class="orn-contact__field" :class="{ 'has-error': errors.{{ field }} }">
  <label class="orn-contact__label" for="{{ id }}">
    {{ label }}{%- if required -%}<span class="orn-contact__req" aria-hidden="true">*</span>{%- endif -%}
  </label>
  <input type="{{ type }}"
         id="{{ id }}"
         name="contact[{{ label | strip }}]"
         class="orn-contact__input"
         x-model="values.{{ field }}"
         placeholder="{{ placeholder }}"
         {% if required %}aria-required="true"{% endif %}
         :aria-invalid="errors.{{ field }} ? 'true' : 'false'"
         :aria-describedby="errors.{{ field }} ? '{{ id }}-error' : null"
         @blur="validateField('{{ field }}')"
         {{ extra_attrs }} />
  <p class="orn-contact__error" id="{{ id }}-error" x-show="errors.{{ field }}" x-cloak x-text="errors.{{ field }}"></p>
</div>
```

**`snippets/orn-contact-select.liquid`**:

```liquid
{%- liquid
  assign field = field
  assign section = section
  assign label = section.settings[field | append: '_label']
  assign placeholder = section.settings[field | append: '_placeholder']
  assign required = section.settings[field | append: '_required']
  assign options_raw = section.settings[field | append: '_options'] | default: ''
  assign options = options_raw | newline_to_br | replace: '<br />', '|' | replace: '<br>', '|' | split: '|'
  assign id = 'orn-contact-' | append: field
-%}
<div class="orn-contact__field orn-contact__field--select" :class="{ 'has-error': errors.{{ field }} }">
  <label class="orn-contact__label" for="{{ id }}">
    {{ label }}{%- if required -%}<span class="orn-contact__req" aria-hidden="true">*</span>{%- endif -%}
  </label>
  <select id="{{ id }}"
          name="contact[{{ label | strip }}]"
          class="orn-contact__select"
          x-model="values.{{ field }}"
          {% if required %}aria-required="true"{% endif %}
          :aria-invalid="errors.{{ field }} ? 'true' : 'false'"
          @blur="validateField('{{ field }}')">
    <option value="" disabled selected>{{ placeholder }}</option>
    {%- for opt in options -%}
      {%- assign trimmed = opt | strip -%}
      {%- if trimmed != blank -%}
        <option value="{{ trimmed | escape }}">{{ trimmed }}</option>
      {%- endif -%}
    {%- endfor -%}
  </select>
  <span class="orn-contact__select-caret" aria-hidden="true">▾</span>
  <p class="orn-contact__error" id="{{ id }}-error" x-show="errors.{{ field }}" x-cloak x-text="errors.{{ field }}"></p>
</div>
```

**`snippets/orn-contact-textarea.liquid`**:

```liquid
{%- liquid
  assign field = field
  assign section = section
  assign label = section.settings[field | append: '_label']
  assign placeholder = section.settings[field | append: '_placeholder']
  assign required = section.settings[field | append: '_required']
  assign max = section.settings.message_max_chars
  assign id = 'orn-contact-' | append: field
-%}
<div class="orn-contact__field orn-contact__field--textarea" :class="{ 'has-error': errors.{{ field }} }">
  <label class="orn-contact__label" for="{{ id }}">
    {{ label }}{%- if required -%}<span class="orn-contact__req" aria-hidden="true">*</span>{%- endif -%}
  </label>
  <textarea id="{{ id }}"
            name="contact[{{ label | strip }}]"
            class="orn-contact__textarea"
            rows="5"
            maxlength="{{ max }}"
            x-model="values.{{ field }}"
            placeholder="{{ placeholder }}"
            {% if required %}aria-required="true"{% endif %}
            :aria-invalid="errors.{{ field }} ? 'true' : 'false'"
            @blur="validateField('{{ field }}')"></textarea>
  <p class="orn-contact__counter" aria-live="polite" x-text="`${values.{{ field }}?.length || 0} / {{ max }}`"></p>
  <p class="orn-contact__error" id="{{ id }}-error" x-show="errors.{{ field }}" x-cloak x-text="errors.{{ field }}"></p>
</div>
```

> **Nota sobre `name="contact[…]"`**: Shopify incluye los pares clave/valor dentro de `contact[*]` en el cuerpo del email. Usar el `label` como key garantiza que el receptor del email vea exactamente las mismas etiquetas que vio el usuario. La key se sanitiza con `| strip` y va `escape`-d en el `value`.

### 6. Componente Alpine `ornContactForm` (`assets/orn-contact-form.js`)

```js
window.ornContactForm = function ornContactForm(opts = {}) {
  return {
    countryCode: opts.countryCode || '+33',
    rules: opts.rules || {},
    messageMax: opts.messageMax || 1000,
    submitting: false,
    success: false,
    hasErrors: false,
    values: {
      fullname: '', email: '', phone: '', company: '',
      website: '', select_1: '', select_2: '', message: ''
    },
    errors: {},
    phoneE164: '',

    init() {
      // Si Shopify renderizó la página con ?contact_posted=true, oculta el form (flag inyectado por Liquid en x-show)
      // No hace falta hidratar más: el server-side mostró #success.
    },

    /* ───────── Validators ───────── */
    _re: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phoneDigits: /\D+/g,
      fullname: /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/,
      company: /^[A-Za-z0-9À-ÖØ-öø-ÿ\s.\-]+$/,
      website: /^https?:\/\/.+/i,
    },

    validateField(field) {
      const v = (this.values[field] || '').trim();
      const required = !!this.rules[field];
      const t = (key) => document.getElementById(`orn-contact-${field}-msg-${key}`)?.dataset.text || '';

      // Helper para leer las strings de error de los settings (impresas como data-* en el DOM, ver §7 abajo)
      const errorText = (suffix) => {
        const el = this.$el.querySelector(`[data-error-source="${field}_${suffix}"]`);
        return el ? el.dataset.errorText : '';
      };

      let err = '';

      if (!v) {
        if (required) err = errorText('error_required');
      } else {
        switch (field) {
          case 'fullname':
            if (v.length < 3 || !this._re.fullname.test(v) || !/\s/.test(v))
              err = errorText('error_format');
            break;
          case 'email':
            if (!this._re.email.test(v)) err = errorText('error_format');
            break;
          case 'phone': {
            const digits = v.replace(this._re.phoneDigits, '');
            if (digits.length < 7 || digits.length > 15) err = errorText('error_format');
            break;
          }
          case 'company':
            if (v.length < 2 || !this._re.company.test(v)) err = errorText('error_format');
            break;
          case 'website':
            if (!this._re.website.test(v)) err = errorText('error_format');
            break;
          case 'message':
            if (v.length < 10) err = errorText('error_format');
            break;
          // selects: sin formato, sólo required ya cubierto arriba
        }
      }

      if (err) this.errors[field] = err;
      else delete this.errors[field];
      this.errors = { ...this.errors }; // trigger reactivity
      return !err;
    },

    validateAll() {
      let ok = true;
      Object.keys(this.rules).forEach((f) => { if (!this.validateField(f)) ok = false; });
      this.hasErrors = !ok;
      return ok;
    },

    /* ───────── Phone formatting ───────── */
    onPhoneInput(ev) {
      const raw = (ev.target.value || '').replace(/[^\d+]/g, '');
      // Mantener un único '+' al inicio si el usuario lo puso
      let plus = raw.startsWith('+') ? '+' : '';
      const digits = raw.replace(/\+/g, '');
      // Formato XX XX XX XX XX (espacio cada 2)
      const formatted = digits.match(/.{1,2}/g)?.join(' ') || '';
      const display = plus + formatted;
      ev.target.value = display;
      this.values.phone = display;

      // E.164: si empieza por '0' (FR), reemplazar por countryCode; si ya empieza por '+', dejar
      let e164 = '';
      if (digits.startsWith('0')) e164 = this.countryCode + digits.slice(1);
      else if (plus === '+') e164 = '+' + digits;
      else if (digits.length >= 7) e164 = this.countryCode + digits;
      this.phoneE164 = e164;
    },

    /* ───────── Submit ───────── */
    onSubmit(ev) {
      const ok = this.validateAll();
      if (!ok) {
        ev.preventDefault();
        // foco al primer campo con error
        const firstErr = Object.keys(this.errors)[0];
        if (firstErr) document.getElementById(`orn-contact-${firstErr}`)?.focus();
        return;
      }
      // Componer el body legible para el email
      const body = [
        `Empresa: ${this.values.company}`,
        `Nombre: ${this.values.fullname}`,
        `Email: ${this.values.email}`,
        `Teléfono: ${this.values.phone}` + (this.phoneE164 ? `  (${this.phoneE164})` : ''),
        `Sitio web: ${this.values.website || '—'}`,
        `Select 1: ${this.values.select_1 || '—'}`,
        `Select 2: ${this.values.select_2 || '—'}`,
        '',
        'Mensaje:',
        this.values.message || '—',
      ].join('\n');
      this.$refs.bodyField.value = body;
      this.submitting = true;
      // dejar continuar el submit nativo
    },
  };
};
```

> **Patrón de errores administrables**: cada `error_*` setting se imprime una vez en el DOM como `<template data-error-source="<field>_<suffix>" data-error-text="…"></template>` dentro del `<form>`, y JS lo lee. Así evitamos pasar 16 strings al `x-data` y la copia se mantiene editable desde el theme editor sin tocar el JS.
>
> El render de esos templates se hace al final del form en `sections/orn-contact-form.liquid`:
>
> ```liquid
> {%- assign field_keys = 'fullname,email,phone,company,website,select_1,select_2,message' | split: ',' -%}
> {%- for f in field_keys -%}
>   {%- for suffix in 'error_required,error_format' | split: ',' -%}
>     {%- assign key = f | append: '_' | append: suffix -%}
>     {%- assign val = section.settings[key] -%}
>     {%- if val -%}
>       <template data-error-source="{{ f }}_{{ suffix }}" data-error-text="{{ val | escape }}"></template>
>     {%- endif -%}
>   {%- endfor -%}
> {%- endfor -%}
> ```

### 7. CSS — layout, inputs, errores, success (`assets/orn-contact-form.css`)

Reglas clave (resumen, ~250 líneas finales):

- **Anchor offset**: `.orn-contact { scroll-margin-top: var(--header-height, 80px); padding-block: var(--orn-contact-pt, 64px) var(--orn-contact-pb, 64px); }`.
- **Grid 2 columnas (≥ 750px)**:
  ```
  .orn-contact__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
    gap: clamp(24px, 4vw, 56px);
    max-width: 1320px;
    margin-inline: auto;
    padding-inline: var(--page-margin, 24px);
  }
  ```
- **Card izquierda redondeada** (`.orn-contact__intro`): `border-radius: 32px; padding: clamp(32px, 5vw, 64px); display: flex; flex-direction: column; gap: 24px; align-self: start;`.
- **Heading** (`.orn-contact__title`): font-family `var(--font-heading--family)`, weight 700, font-size `clamp(2.25rem, 5vw, 3.5rem)`, line-height 1.05.
- **Tag pill** (`.orn-contact__pill`): `display: inline-block; padding: 6px 18px; border-radius: 999px; background: var(--color-foreground-rgb, 0 0 0)/0.06; font-weight: 600; width: fit-content;`.
- **Form grid**:
  ```
  .orn-contact__form { display: flex; flex-direction: column; gap: 20px; }
  .orn-contact__row { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media (min-width: 750px) {
    .orn-contact__row--2 { grid-template-columns: 1fr 1fr; }
  }
  ```
- **Inputs** (`.orn-contact__input`, `.orn-contact__select`, `.orn-contact__textarea`):
  - `border: 1px solid var(--color-border, #d8d8d2); border-radius: 999px; padding: 12px 18px; background: transparent; font: inherit; color: inherit; width: 100%;`.
  - Textarea: `border-radius: 16px; padding: 14px 18px;` (no pill).
  - Focus: `outline: 2px solid #4ec0de; outline-offset: 2px;` (acento de marca, ADR-0001).
  - Estado `.has-error` aplica `border-color: #C0392B; outline-color: #C0392B;`.
  - Placeholder gris: `::placeholder { color: rgba(15,23,32,.5); }`.
- **Select caret**: `position: relative;` en `.orn-contact__field--select`; `.orn-contact__select-caret` `position: absolute; right: 18px; top: 50%; transform: translateY(-50%); pointer-events: none;`. El `<select>` lleva `appearance: none; padding-right: 40px;`.
- **Asterisco** `.orn-contact__req { margin-left: 2px; color: inherit; }`.
- **Mensaje de error** `.orn-contact__error { color: #C0392B; font-size: .875rem; margin-top: 6px; }` con `[x-cloak]{display:none!important}` global.
- **Counter** `.orn-contact__counter { text-align: right; font-size: .75rem; color: rgba(15,23,32,.55); margin-top: 4px; }`.
- **Submit**: `.orn-contact__submit` no necesita override; hereda de `.ornevo-btn--primary|secondary` (ADR-0001).
- **Success state**: `.orn-contact__success { padding: 32px; border-radius: 24px; background: rgba(78,192,222,.12); }` (acento decorativo, no se usa para CTAs).
- **Mobile (< 750px)**:
  ```
  .orn-contact__grid { grid-template-columns: 1fr; gap: 0; }
  .orn-contact__intro { border-radius: 24px 24px 0 0; }
  .orn-contact__panel  { border-radius: 0 0 24px 24px; padding: clamp(24px, 5vw, 40px); }
  .orn-contact__logo--mobile-only { display: block; }
  @media (min-width: 750px) { .orn-contact__logo--mobile-only { display: none; } }
  ```
- **Reduced motion**: nada animado más allá de focus; documentar `@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }` localizado a la sección.

### 8. Accesibilidad

- `<section aria-labelledby="<anchor>-title">` y `<h2 id="<anchor>-title">`.
- Labels asociados a sus inputs (`for`/`id`); asterisco visual lleva `aria-hidden`; el estado required se comunica vía `aria-required="true"`.
- Errores: `aria-invalid` y `aria-describedby` apuntando al `<p id="<id>-error">`.
- `role="alert"` en el resumen de errores y el server-error; `role="status" aria-live="polite"` en el bloque de éxito.
- Foco: outline 2px `#4ec0de` en cualquier input/select/textarea/button.
- Submit deshabilitado durante envío (`:disabled="submitting"`).
- Foco automático al primer campo con error tras submit fallido.
- Counter del textarea con `aria-live="polite"` para que lectores anuncien el avance — opcional; si molesta, bajar a `off`.

### 9. Envío por email (Shopify `{% form 'contact' %}`)

- El `<form>` se genera con `{%- form 'contact', … -%}{%- endform -%}`. Shopify inyecta `<form action="/contact#…" method="post">` + tokens CSRF + form-type oculto.
- **Destinatario**: el email de la tienda configurado en `Settings → Notifications → "Sender email"` (Shopify admin). El cliente debe verificar que el email ahí es `contact@ornevo.fr` o el deseado. **Acción documental**: anotar en el handover que Miguel debe confirmar/configurar este destinatario en el admin.
- **Reply-to**: el `<input type="email" name="contact[email]">` que generamos (renombramos `contact[E-mail]` → asegurar que el `name` real sea exactamente `contact[email]` para que Shopify lo use como reply-to). Por eso en `snippets/orn-contact-input.liquid`, **caso especial**: cuando `field == 'email'`, forzar `name="contact[email]"` en lugar de `contact[<label>]`. Idem `phone` → `name="contact[phone]"` (Shopify también lo trata especial).
- **Subject**: `<input type="hidden" name="contact[subject]" value="{{ section.settings.email_subject_prefix }}">`. Shopify usa `subject` como subject del email si está presente.
- **Body**: el `<textarea name="contact[body]" hidden>` que JS hidrata antes del submit con un resumen legible de todos los campos (ver §6 `onSubmit`). Shopify usa `body` como cuerpo principal del email; el resto de `contact[*]` aparece como pares clave/valor adicionales.
- **Estado éxito**: tras el submit, Shopify redirige a `/<page>?contact_posted=true#<anchor>` con `form.posted_successfully?` true en ese render. El bloque `.orn-contact__success` se muestra server-side (Liquid) **y** Alpine setea `success = true` por si la respuesta es asíncrona en el futuro. Adicionalmente, scroll a `#<anchor>` al cargar (el browser lo hace solo gracias al hash + `scroll-margin-top`).
- **Errores server-side**: Shopify expone `form.errors` (array de keys) y `form.errors.messages` (mensajes). Ya cubierto con `{%- if form.errors -%}…{%- endif -%}` que renderiza `generic_server_error`. Para detalle por campo se podría iterar `form.errors`, pero la spec sólo pide mensaje genérico.

#### Caso especial `name="contact[email]"` y `name="contact[phone]"`

Modificar el snippet `orn-contact-input.liquid` para aceptar un parámetro `name_override`:

```liquid
{%- if field == 'email' -%}
  {%- assign input_name = 'contact[email]' -%}
{%- elsif field == 'phone' -%}
  {%- assign input_name = 'contact[phone]' -%}
{%- else -%}
  {%- assign input_name = 'contact[' | append: label | strip | append: ']' -%}
{%- endif -%}
<input … name="{{ input_name }}" … />
```

### 10. Scroll-to-section desde botones externos

- Cualquier `<a href="#<anchor_id>">` o botón con la misma ancla **ya hace scroll automáticamente**:
  - El navegador resuelve el hash → scroll nativo al elemento `#<anchor_id>`.
  - `scroll-margin-top: var(--header-height, 80px)` evita que la sección quede oculta por el header sticky de `orn-header`.
- Para botones con scroll suave: si el botón está dentro de `orn-header` ya pasa por `ornHeader.onAnchorClick` (ADR-0003 §6). Para botones fuera del header (CTA del hero, CTA de services, etc.), añadir un script global muy ligero en `assets/orn-anchor-scroll.js` (**fuera del scope de este ADR**, ver "Implementation notes"). Por ahora basta con el scroll nativo + `scroll-margin-top`, y la ADR-0003 ya lo cubre para el header.

## Consequences

**Positive:**
- Envío real de emails sin endpoints externos: 100% Shopify nativo.
- 8 campos con label/placeholder/error administrables, 2 selects con opciones libres.
- Validación robusta client-side + integración con la validación nativa de Shopify (`form.errors`).
- Auto-formato del teléfono FR, conversión E.164 oculta para CRM/futuro export.
- Anchor `id` editable → cualquier botón del sitio puede apuntar `#<id>` y aterrizar bajo el header sticky.
- Reuso del DS: botones `.ornevo-btn--*`, color schemes nativos, fonts del picker.
- Listo para evolucionar a popup en V2: extraer `<aside>` + `<form>` a un dialog modal sin reescribir el resto.

**Negative / trade-offs:**
- Las **opciones del select** vía `textarea` (una por línea) son menos descubribles para el admin que un repeater de blocks. Mitigado con `info` claro en el setting (`Una opción por línea. Las líneas vacías se ignoran.`). Si en algún momento se necesita ordenar visualmente, se migra a blocks sin afectar el resto.
- Email de la tienda depende de la configuración en `Settings → Notifications`. Si el admin la cambia o no la configuró, los emails no llegan. Mitigación: nota explícita en el handover.
- Validación de `fullname` con regex (`A-Za-zÀ-ÖØ-öø-ÿ`) cubre francés/español/inglés pero no alfabetos no latinos (cirílico, árabe, asiático). Es la trade-off pedida por la spec ("solo letras, espacios y acentos"). Documentar.
- `name="contact[<Label>]"` significa que si el admin cambia el label, el key del email cambia también — coherencia visual entre form y email garantizada, pero rompe filtros de inbox que dependan del key exacto. Aceptable a cambio de UX clara.
- `<template data-error-source>` para inyectar copia de errores en JS añade ~16 elementos invisibles al DOM. Coste despreciable.

**Risks and mitigations:**
- **Riesgo:** `{% form 'contact' %}` en una sección dentro del template `index` requiere que la página la soporte → confirmado: cualquier template Shopify acepta `form 'contact'` en cualquier sección. → **OK**.
- **Riesgo:** spam — Shopify aplica throttling y captcha invisible si está activado en el admin. **Mitigación:** confirmar con el cliente que tenga `Bot protection` activo en `Settings → Checkout → Spam protection` (aplica también a contact form en algunas tiendas). Como capa adicional, añadir un honeypot oculto: `<input type="text" name="contact[honey]" style="display:none" tabindex="-1" autocomplete="off">`; en JS, si `values.honey != ''` cancelar el submit silenciosamente.
- **Riesgo:** colisión con `[x-cloak]` — confirmar que en el theme exista la regla global `[x-cloak]{display:none!important}`. Verificar en `assets/base.css` o en `assets/orn-hero.css`. Si no existe, añadirla en `assets/orn-contact-form.css`.
- **Riesgo:** `form.posted_successfully?` se evalúa en render. Si el admin tiene habilitado SPA-like reloads (Horizon usa `section-hydration`), el render puede no traer el flag. **Mitigación:** Alpine también pone `success = true` cuando detecta `?contact_posted=true` en `URLSearchParams`:
  ```js
  init() {
    if (new URLSearchParams(location.search).get('contact_posted') === 'true') this.success = true;
  }
  ```
  Añadir al `init` del componente. **Hacerlo explícito en la implementación** (lo agrego como nota — ver §11).
- **Riesgo:** validación regex `fullname` no permite apellidos compuestos con apóstrofo o tilde tipo "O'Connor", "Núñez". El regex propuesto **incluye** `'` y `À-ÖØ-öø-ÿ` → cubre acentos y apóstrofo. Verificado.
- **Riesgo:** auto-formato del teléfono fuerza espacios cada 2 dígitos, lo que en países con otros patrones (US `(XXX) XXX-XXXX`) confunde. **Mitigación:** `phone_country_code` setting + decisión de mantener formato FR como default; si se requiere multipaís, evolucionar a `intl-tel-input` en V2.

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| Endpoint custom (Cloudflare Worker / Resend / Mailgun) | Suma infra, secret management, dominio `MAIL FROM`, SPF/DKIM. Shopify ya tiene email transaccional configurado. Para una landing con volumen bajo de leads, sobra. |
| Formspree / Tally / Typeform embebido | Quita control del DS y el a11y; el cliente paga otra suscripción. |
| Block-per-option en los selects | Schema 2× más grande, requiere `_orn-contact-form-option` block + filtrado por `which_select`. UX del editor peor que un textarea. |
| Validación HTML5 nativa (`required`, `pattern`) sin Alpine | Cubre lo básico pero no permite mensajes administrables ni auto-formato del teléfono ni regex con clases Unicode (depende del browser). |
| Hacer el dialog/popup ya en V1 | Spec lo deja explícitamente para V2. Sería over-engineering ahora; rompe la consistencia de la landing como single-page. |
| Usar `<input type="email" required>` y dejar que el browser muestre el tooltip nativo | El tooltip nativo no es estilable, ni traducible coherentemente con el resto de la copia, ni accesible de la misma manera. La spec exige error administrable visible bajo el campo. |
| Componer el body con todos los `contact[*]` (sin `contact[body]`) | Funciona, pero el email queda como lista plana de pares clave-valor en orden indeterminado, sin sección "Mensaje" destacada. Componer `body` da control narrativo. |

## Implementation notes

### Archivos a crear
- `sections/orn-contact-form.liquid` — markup §4 + schema completo §3 + bloque de templates `<template data-error-source>` §6.
- `snippets/orn-contact-input.liquid` — input genérico §5 (con caso especial `email` y `phone` §9).
- `snippets/orn-contact-select.liquid` — §5.
- `snippets/orn-contact-textarea.liquid` — §5.
- `assets/orn-contact-form.css` — §7 (~250 líneas).
- `assets/orn-contact-form.js` — §6 (~150 líneas), expuesto como `window.ornContactForm`.

### Archivos a editar
- `snippets/stylesheets.liquid` → añadir `{{ 'orn-contact-form.css' | asset_url | stylesheet_tag }}` debajo de `orn-header.css`.
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-contact-form.js' | asset_url }}" defer></script>` junto a `orn-header.js`, **antes** de `alpine.min.js`.
- `templates/page.landing.json` → añadir entrada `orn-contact-form` al final del `order` con sus settings de fábrica (idénticos a los defaults del schema, con `anchor_id: "contacto"`).

### Variables CSS expuestas
```
--orn-contact-pt        // padding-block-start (override por setting)
--orn-contact-pb        // padding-block-end
--orn-contact-error     // color de error (#C0392B por default)
--orn-contact-accent    // var(--color-accent, #4ec0de) — para focus rings
```

### Orden de ejecución
1. Crear `assets/orn-contact-form.css`.
2. Crear `assets/orn-contact-form.js` (`window.ornContactForm`); incluir el `init()` con el read de `?contact_posted=true`.
3. Crear los 3 snippets `orn-contact-{input,select,textarea}.liquid` con el caso especial de `email`/`phone` para el `name`.
4. Crear `sections/orn-contact-form.liquid` con el schema completo + render de `<template data-error-source>` para los strings de error.
5. Editar `snippets/stylesheets.liquid` y `snippets/scripts.liquid` para registrar los assets.
6. Editar `templates/page.landing.json` (añadir la sección al final del `order`).
7. **Documentar** en el handover: configurar `Settings → Notifications → Sender email` a `contact@ornevo.fr` (o el email destino real). Sin esto, los emails no llegan.
8. Smoke test en theme editor:
   - `/landing#contacto` → la sección aterriza completa bajo el header (gracias a `--header-height`).
   - Cambiar todos los settings de copy y verificar reflejo live.
   - Toggling `*_required` quita el asterisco y desactiva la validación required.
   - Tipear `pedro@x` en email → bloquea submit con error administrable.
   - Tipear `0612345678` en teléfono → muestra `06 12 34 56 78`. Tipear letras → bloqueadas.
   - Tipear `usr` en `fullname` → error formato (sin espacio entre nombre y apellido).
   - Submit OK → URL pasa a `?contact_posted=true&...#contacto`, se ve `.orn-contact__success`, formulario oculto. Shopify envía el email al destinatario configurado en admin.
   - Recargar la página: form vuelve a estar visible, success oculto.
   - axe-core: 0 violaciones en la sección.
   - Reduced motion DevTools: no hay animaciones residuales.
9. Probar el ancla desde otra sección: añadir un `<a href="#contacto">Contacto</a>` en `orn-hero` o `orn-services` y verificar el scroll suave + offset.

### Anchor convention
- `id="<anchor_id>"` en la `<section>` → los links del header (`#contacto` por default en ADR-0003) ya hacen click y disparan `ornHeader.onAnchorClick` que llama `Element.scrollIntoView({behavior:'smooth'})`. `scroll-margin-top: var(--header-height)` ajusta el offset.
- Defecto recomendado: `contacto` (consistente con el CTA del header y la ADR-0003).

### Pendientes documentales (out of scope de este ADR)
- Configurar `Settings → Notifications → Sender email` en el admin de Shopify a `contact@ornevo.fr`.
- (Opcional) Activar `Bot protection` en `Settings → Checkout → Spam protection`.
- (V2) Migrar la sección a un `<dialog>` popup (overlay 50%, animación, X de cierre, focus trap, `aria-modal="true"`) — el shell `<div class="orn-contact__panel">` se reusa tal cual.

## References

- Spec: `landing/form/specs.md` (incluye tabla `validacion_1.png` y `validacion_2.png`).
- Diseños: `landing/form/form_desktop.png`, `landing/form/form_responsive.png`.
- Shopify contact form: https://shopify.dev/docs/storefronts/themes/customer-engagement/add-contact-form
- Shopify form tag (`contact`): https://shopify.dev/docs/api/liquid/tags/form
- ADR-0001 — design system base (color schemes, fuentes, botones `.ornevo-btn--*`).
- ADR-0002 — `orn-services` (patrón Alpine + scroll-margin-top + window-global component).
- ADR-0003 — `orn-header` (productor de `--header-height` en `<body>`; CTA `¿Un proyecto?` apunta a `#contacto` por default).
- E.164: https://en.wikipedia.org/wiki/E.164
- WAI-ARIA Authoring Practices — Forms: https://www.w3.org/WAI/ARIA/apg/patterns/
