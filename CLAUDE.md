# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Plugin WordPress white-label Dialotel / Hexagon Voyance — suite de 4 apps de tirage (compatibilité amoureuse, compatibilité astrologique, tirage tarot, numérologie). Stack : HTML/CSS/JS pur + PHP (WordPress) + API Mistral/OpenAI/Claude.

Le repo **est** le plugin. `voyance-tirages.php` est à la racine. Le livrable client = zip du repo (hors `previews/`, `config/`, docs).

## Commandes

```bash
# Tester localement avec wp-now
npx @wp-now/wp-now start --path=. --skip-browser

# Repartir sur une base WordPress fraîche (re-déclenche l'activation)
npx @wp-now/wp-now start --path=. --skip-browser --reset

# Cloner depuis GitHub et lancer
git clone https://github.com/dashmymailbox-wq/dialotel-preview.git
npx @wp-now/wp-now start --path=dialotel-preview --skip-browser
```

Admin WP (wp-now) : http://localhost:8881/wp-admin/ — user: `admin` / password: `password`

## Architecture

### Structure du plugin (racine du repo)

```
voyance-tirages.php          — entry point, activation hook, création des 4 pages auto
includes/
  enqueue.php                — chargement conditionnel CSS/JS (has_shortcode detection)
  shortcodes.php             — [tirage_voyance type="x"]
  proxy.php                  — proxy AJAX pour masquer les clés API IA
  settings.php               — page admin WP (onglets : Applications, Branding, APIs, Avancé, Logs)
  logger.php
  admin-ui.css
templates/tirages/           — 4 templates PHP (1 par tirage)
assets/css/                  — CSS en couches (voir ci-dessous)
assets/js/                   — core.js + 4 JS métier
assets/textures/             — SVG cosmiques
animations/                  — 5 CSS d'animation Dialotel
previews/                    — HTML standalone pour tests locaux (non livrables)
config/                      — hexagon-voyance.config.json (gitignored, clé API locale)
```

### Admin WP — onglet Applications

L'admin (`includes/settings.php`) a un onglet **Applications** avec sous-onglets :
- **Compat. Amoureuse** — active/désactive, slug page, titre, CTA, FAQ, partage
- **Compat. Astrologique** — active/désactive, slug page, titre, CTA

Options WP : `vt_app_amoureuse_enabled`, `vt_app_astro_enabled`, `vt_astro_page_slug`, etc.

### Layering CSS (ordre de chargement WP)

1. `global.css` — variables CSS `var(--vt-*)`, reset scopé `.vt-app`
2. `components.css` — bouton hex, cards, états loading/error
3. `theme-dialotel.css` — palette rose/jaune fond blanc
4. CSS app-spécifique — ex. `compatibilite-amoureuse.css`
5. Animations — `transition-dialotel.css`, `loader-dialotel.css`, `reveal-dialotel.css`, `card-dialotel.css`, `animations-dialotel.css`

Inline styles WP dans `enqueue.php` neutralisent les propriétés WordPress qui cassent `position:fixed`.

### JS — namespace `window.VT`

`core.js` expose `window.VT` :
- `VT.StepEngine` — navigation entre étapes (`.vt-step[data-step="x"]`)
- `VT.Counter` — compteur social-proof (sessionStorage)
- `VT.Quota` — limiteur tirages/jour (localStorage)
- `VT.AIAdapter` — appels IA via proxy WP
- `VT.EmailCapture` — modale capture email → Brevo
- `VT.Analytics` — events GA4
- `VT.TTS` — synthèse vocale ElevenLabs (Phase 3)

### Proxy PHP (proxy.php)

Les clés API ne sont jamais dans le JS front. Le JS poste vers `wp-admin/admin-ajax.php?action=vt_ai_generate`. Le proxy vérifie le nonce WP, applique le rate limit (transient par IP), essaie les providers dans l'ordre (mistral → openai → claude).

### Shortcode et pages auto

Shortcode : `[tirage_voyance type="x"]`
Types valides : `compatibilite-amoureuse`, `compatibilite-astrologique`, `tirage-tarot`, `numerologie`

À l'activation, 4 pages WP sont créées automatiquement. Les assets ne sont chargés que sur les pages contenant le shortcode (`has_shortcode()` dans `enqueue.php`).

### Options WordPress (préfixe `vt_`)

- `vt_app_amoureuse_enabled` / `vt_app_astro_enabled` — tirages actifs
- `vt_ai_provider` / `vt_ai_mistral_key` / `vt_ai_mistral_model`
- `vt_counter_base` — base compteur social-proof
- `vt_rate_free` / `vt_rate_extended` — quotas tirages/jour
- `vt_cta_url` / `vt_cta_btn_text` / `vt_cta_enabled`
- `vt_default_theme` — `light` ou `dark`

## Version actuelle : 2.2.0

Bloqueurs restants :
- Clé API Mistral à saisir dans l'admin WP (Applications → APIs)
- Font `CatchyMager.woff2` manquante — fallback héritage thème WP actif
