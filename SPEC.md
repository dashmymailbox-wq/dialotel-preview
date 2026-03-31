## SPEC.md

```markdown
# SPEC.md — Voyance Tirages
> Référence technique. Consulter avant tout acte de développement.
> Dernière mise à jour : Mars 2026

---

## 1. Architecture des fichiers

```
voyance-tirages/
├── assets/
│   ├── css/
│   │   ├── themes/
│   │   │   ├── theme-mystique.css       ← thème par défaut
│   │   │   └── theme-[nom].css          ← thèmes futurs
│   │   ├── global.css                   ← variables CSS (var(--theme-*)), reset scopé
│   │   ├── components.css               ← bouton hex, cards, transitions partagées
│   │   └── [nom-tirage].css             ← styles spécifiques par tirage
│   ├── js/
│   │   ├── core.js                      ← moteur partagé (étapes, TTS, IA, limiteur, analytics, i18n)
│   │   └── [nom-tirage].js              ← logique spécifique par tirage
│   ├── fonts/
│   │   └── CatchyMager.woff2            ← police locale (si fournie)
│   ├── images/
│   │   ├── tarot/
│   │   ├── astrology/
│   │   └── ui/
│   ├── icons/
│   │   └── zodiac-sprite.svg            ← sprite SVG 12 signes, style Hybride
│   ├── animations/
│   │   ├── cards/                       ← shuffle, draw, flip, hover
│   │   ├── transitions/                 ← fade, slide, scale-reveal, blur-reveal
│   │   ├── loaders/                     ← pulse, shimmer, orbit, dots
│   │   └── reveal/                      ← unfold, glow, typewriter, star-burst
│   └── data/
│       ├── tarot/definitions.json
│       ├── astrology/signs.json
│       ├── compatibility/matrix.json
│       ├── config/[nom-tirage].config.json
│       ├── i18n/fr.json / en.json / ...
│       └── prompts/[nom-tirage].txt
├── templates/tirages/[nom-tirage].html  ← réservé Phase 2
├── includes/                            ← réservé Phase 2 (PHP)
├── [nom-tirage].html                    ← app standalone Phase 1
├── clients/                             ← jamais inclus dans un zip client
│   └── dialotel/
│       ├── theme-dialotel.css
│       ├── fonts/CatchyMager.woff2      ← à fournir par le client
│       ├── config/hexagon-voyance.config.json
│       ├── README-install.md
│       └── .build
└── voyance-tirages.php                  ← réservé Phase 2
```

### Règles de nommage
- kebab-case partout
- Un CSS + un JS par tirage
- Données en JSON, prompts IA en TXT
- HTML standalone à la racine (Phase 1)

---

## 2. Règles de compatibilité WordPress universelle

> Priorité absolue. Ces règles ne sont jamais négociables.

- **CSS scopé** : toutes les règles sous .vt-app — zéro règle globale (body, h1, a, *)
- **JS encapsulé** : IIFE ou module ES — namespace unique window.VT — compatible jQuery noConflict
- **Données inline** : <script type="application/json" id="vt-[nom]"> — jamais de fetch() local
- **Animations CSS pures** : @keyframes uniquement — zéro lib JS d'animation
- **Police locale** : Catchy Mager via @font-face dans le thème client — ne pas dépendre de CDN externe
- **Zéro librairie JS non validée**

---

## 3. Design System

### Palette (variables CSS thémables)

| Variable | Valeur défaut | Rôle |
|----------|--------------|------|
| --theme-primary | #ed8ce6 | Rose — accent principal |
| --theme-secondary | #e2ed77 | Jaune — accent secondaire / actif |
| --theme-bg | #0a0012 | Fond principal |
| --theme-bg-card | #1a0e24 | Fond des cards |
| --theme-border | #3d2a4a | Bordures |
| --theme-text | #f0eaf5 | Texte principal |
| --theme-text-muted | #7a5e8a | Texte secondaire |
| --theme-title-color | #000000 | Couleur titres |
| --theme-font-title | inherit | Font des titres |
| --theme-font-body | inherit | Font du corps |

### Typographie — système à 3 niveaux

1. **Font locale** (@font-face) — si fichier présent dans assets/fonts/ ou clients/[nom]/fonts/
2. **Google Fonts** — si définie dans le config JSON (googleFont: "Nom+Font")
3. **Héritage thème WordPress** — fallback automatique (font-family: inherit)

| Variable | Rôle | Fallback |
|----------|------|---------|
| --theme-font-title | Titres h1, h2, étapes, résultats | inherit |
| --theme-font-body | Corps et UI | inherit |

**Cas Dialotel** : Catchy Mager en priorité → Google Fonts si absent → héritage thème hôte
**Cas version commerciale** : Google Fonts configurable en admin → héritage thème hôte

### Bouton hexagone étiré
- clip-path polygon simulant un hexagone allongé
- Adaptatif à la longueur du texte
- Variante primaire (rose) et secondaire (jaune)
- Icône Feather autorisée (stroke-width 1px) — jamais d'emoji
- Classes : .vt-app .btn-hex et .vt-app .btn-hex--secondary

### Icônes UI
- Feather Icons uniquement — stroke-width 1px
- Taille standard : 20px (UI), 24px (mise en avant)

### Icônes astrologiques
- Sprite SVG maison : assets/icons/zodiac-sprite.svg
- Style Hybride validé :
  - Glyphe central : stroke rose, stroke-width 1, fill none
  - Halo cercle : stroke jaune, stroke-width 0.4, fill none
- viewBox 0 0 24 24 — cohérent avec Feather
- IDs : sign-aries, sign-taurus, sign-gemini, sign-cancer, sign-leo, sign-virgo, sign-libra, sign-scorpio, sign-sagittarius, sign-capricorn, sign-aquarius, sign-pisces
- Colorisation via currentColor — rose par défaut, jaune si .active
- À générer lors de la première app de tirage

### Animations
- Durées : 300ms (micro), 400ms (transition), 800ms (révélation), 1.4s (loop)
- Toutes les classes préfixées vt-anim-
- prefers-reduced-motion obligatoire sur chaque animation

| Moment | Animation | Fichier |
|--------|-----------|---------|
| Changement d'étape | fade + slide | transitions/fade.css + slide.css |
| Attente IA | orbit ou pulse | loaders/orbit.css |
| Mélange cartes | card-shuffle | cards/card-shuffle.css |
| Tirage carte | card-draw | cards/card-draw.css |
| Retournement | card-flip | cards/card-flip.css |
| Révélation résultat | glow + typewriter | reveal/glow.css + typewriter.css |
| Score / compteur | scale-reveal | transitions/scale-reveal.css |
| Chargement données | shimmer | loaders/shimmer.css |

---

## 4. UX Standard

### Parcours type (toutes apps)
1. Écran d'introduction — titre, description, CTA bouton hex
2. Saisie des données — max 3 champs visibles simultanément
3. Transition rituelle — animation de tirage / révélation (2-3s)
4. Résultat — mémorable : typo forte, animation, mise en page soignée
5. Actions secondaires — rejouer, CTA voyants, email capture

### Règles UX
- Un seul focus par étape
- Composants de résultat autonomes et réutilisables entre apps
- États obligatoires sur chaque app : loading, error, empty

---

## 5. Système de Thèmes

- Chaque thème = un fichier CSS qui override uniquement les var(--theme-*)
- Zéro duplication HTML/JS entre thèmes
- Charger le thème EN PREMIER (avant global.css)
- Un thème ne modifie jamais layout, typographie, structure ou animations
- Phase 2 : [tirage_voyance type="x" theme="mystique"]

---

## 6. Fournisseurs IA

- **Provider actuel** : Mistral (mistral-small-latest)
- Adaptateur multi-provider dans core.js — changer provider = changer la config JSON

| Provider | Modèle par défaut |
|----------|------------------|
| mistral | mistral-small-latest |
| openai | gpt-4o-mini |
| gemini | gemini-1.5-flash |
| anthropic | claude-haiku-20240307 |

- Config dans assets/data/config/[tirage].config.json
- ⚠️ Clé API exposée côté client en Phase 1 — proxy PHP wp-ajax en Phase 2

---

## 7. Fonctionnalités — Règles de comportement

### Compteur de tirages
- Valeur de départ (fake) configurable par tirage (counterBase)
- Incrément aléatoire par session (sessionStorage)
- Remise à zéro automatique au 1er du mois
- Affichage animé (count-up)

### Limiteur de tirages
- Stockage : localStorage — clé par tirage + date
- Quota gratuit configurable (freePerDay) + quota étendu après email (extendedPerDay)
- Modale dédiée (distincte de la modale email post-résultat)
- Déblocage immédiat après soumission email valide — sans rechargement

### Capture email
- Affiché après révélation résultats (dismissable)
- Configurable : provider, headline, champs, message succès, bon de réduction
- Providers : Mailchimp, Brevo, webhook générique
- Mention RGPD obligatoire

### CTA Voyants
- Bouton hexagone secondaire (jaune)
- URL, texte, icône, position configurables
- Positions disponibles : after-result, after-email, floating, intro
- Ouvre dans un nouvel onglet

### TTS (lecture vocale)
- Web Speech API native — zéro dépendance
- Autoplay au chargement de l'écran résultat
- Contrôles : pause / reprendre — icônes Feather volume-2 / pause
- Voix FR automatique — fallback silencieux si non supporté
- Option Phase 3 : ElevenLabs / OpenAI TTS

### Analytics (GTM dataLayer)
- Events : vt_tirage_started, vt_tirage_completed, vt_email_shown, vt_email_submitted,
  vt_email_dismissed, vt_cta_voyants_clicked, vt_tts_started, vt_rate_limit_hit, vt_rate_limit_extended
- Fallback silencieux si GTM absent

### Internationalisation
- Fichiers JSON par locale dans assets/data/i18n/[code].json
- Détection automatique via document.documentElement.lang
- Interpolation {variable} dans les chaînes
- Phase 2 : chaînes admin wrappées dans __()

---

## 8. Config JSON par tirage

Fichier : assets/data/config/[nom-tirage].config.json
Clés attendues : tirageId, theme, counterBase, googleFont, ai (provider, apiKey, model),
tts (enabled, autoplay, provider), rateLimit (enabled, freePerDay, extendedPerDay, modal),
emailCapture (enabled, provider, headline, fields, legalText, discount),
ctaVoyants (enabled, label, url, position, style, icon)

La clé apiKey doit toujours contenir "REMPLACER_ICI" dans les fichiers versionnés.
Le vrai fichier config est dans .gitignore.

---

## 9. Phase 2 — Plugin WordPress

- Entry point : voyance-tirages.php
- includes/enqueue.php : chargement conditionnel CSS/JS (détection shortcode)
- includes/shortcodes.php : rendu via templates/tirages/[nom].html
- Shortcode : [tirage_voyance type="x" theme="y"]
- Settings admin : thème global, provider IA, config email, Google Fonts

---

## 10. Distribution White Label

### Principe
Le cœur des apps est identique pour tous les clients. Seul le fichier de thème change.
Zéro modification dans les apps elles-mêmes.

### Structure par client
```
clients/[nom-client]/
  theme-[nom-client].css        ← override des var(--theme-*) uniquement
  fonts/                        ← police locale si fournie
  config/[site-slug].config.json
  README-install.md
  .build                        ← liste des fichiers à embarquer dans le zip
```

### Règles
- Un zip par site client — jamais de fichiers croisés entre clients
- Le dossier clients/ n'est jamais livré au client
- CLAUDE.md, PROJECT.md, SPEC.md, TODO.md ne sont jamais dans un zip
- La clé API du client est dans son config/ — jamais dans le core

### Thème Dialotel — theme-dialotel.css

| Variable | Valeur |
|----------|--------|
| --theme-primary | #ed8ce6 |
| --theme-secondary | #e2ed77 |
| --theme-bg | #ffffff |
| --theme-bg-card | #f5f5f5 |
| --theme-bg-card-alt | #efefef |
| --theme-border | #e0e0e0 |
| --theme-border-accent | #ed8ce6 |
| --theme-text | #000000 |
| --theme-text-muted | #666666 |
| --theme-title-color | #000000 |
| --theme-btn-bg | #ed8ce6 |
| --theme-btn-text | #000000 |
| --theme-btn-bg-alt | #e2ed77 |
| --theme-icon-primary | #ed8ce6 |
| --theme-icon-halo | #e2ed77 |
| --theme-font-title | 'Catchy Mager', inherit |
| --theme-font-body | inherit |
```

