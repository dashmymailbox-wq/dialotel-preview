## TODO.md

```markdown
# TODO.md — Voyance Tirages
> Suivi d'avancement. Ouvrir en debut de chaque session de travail.
> Derniere mise a jour : 31 mars 2026

---

## Statut global

| Phase | Avancement |
|-------|------------|
| Phase 1 — Apps HTML | En cours |
| Phase 2 — Plugin WP | Non demarre |
| Phase 3 — IA premium | Non demarre |

---

## En cours

- [ ] Recuperer le fichier Catchy Mager aupres de Dialotel -> clients/dialotel/fonts/CatchyMager.woff2
- [ ] Configurer la cle API Mistral
- [ ] Definir les counterBase pour chaque tirage
- [ ] Definir les quotas du limiteur (freePerDay, extendedPerDay)
- [ ] Definir l'URL de la landing voyants (CTA)

---

## A faire — Phase 1

### Setup
- [ ] Recuperer le fichier Catchy Mager aupres de Dialotel -> clients/dialotel/fonts/CatchyMager.woff2
- [x] Creer le dossier clients/dialotel/
- [x] Creer clients/dialotel/theme-dialotel.css (palette fond blanc)
- [x] Creer clients/dialotel/config/hexagon-voyance.config.json
- [x] Initialiser Git local (git init) dans le dossier du projet
- [x] Creer .gitignore (config reels, fichiers OS)

### Socle partage
- [x] Creer assets/css/themes/theme-mystique.css
- [x] Creer assets/css/global.css (variables CSS, reset scope .vt-app)
- [x] Creer assets/css/components.css (bouton hex, cards, etats loading/error)
- [x] Creer assets/js/core.js (moteur etapes, TTS, IA adapter, limiteur, analytics, i18n)
- [x] Generer assets/icons/zodiac-sprite.svg (12 signes, style Hybride)
- [x] Creer assets/data/i18n/fr.json

### Banque d'animations
- [x] assets/animations/transitions/fade.css
- [x] assets/animations/transitions/slide.css
- [x] assets/animations/transitions/scale-reveal.css
- [x] assets/animations/transitions/blur-reveal.css
- [x] assets/animations/loaders/pulse.css
- [x] assets/animations/loaders/shimmer.css
- [x] assets/animations/loaders/orbit.css
- [x] assets/animations/loaders/dots.css
- [x] assets/animations/cards/card-shuffle.css
- [x] assets/animations/cards/card-draw.css
- [x] assets/animations/cards/card-flip.css
- [x] assets/animations/cards/card-hover.css
- [x] assets/animations/reveal/glow.css
- [x] assets/animations/reveal/typewriter.css
- [x] assets/animations/reveal/unfold.css
- [x] assets/animations/reveal/star-burst.css

### Donnees
- [x] Creer assets/data/astrology/signs.json
- [x] Creer assets/data/compatibility/matrix.json
- [x] Creer assets/data/tarot/definitions.json
- [x] Creer assets/data/i18n/fr.json
- [x] Generer assets/icons/zodiac-sprite.svg (12 signes, style Hybride)

### Apps de tirage
- [x] Compatibilite amoureuse (compatibilite-amoureuse.html)
- [ ] Compatibilite astrologique (compatibilite-astrologique.html)
- [ ] Tirage tarot (tirage-tarot.html)
- [ ] Numerologie (numerologie.html)

---

## A faire — Phase 2

- [ ] Creer voyance-tirages.php (entry point plugin)
- [ ] Creer includes/enqueue.php
- [ ] Creer includes/shortcodes.php
- [ ] Creer les templates templates/tirages/[nom].html
- [ ] Page settings admin (theme global, provider IA, config email, Google Fonts)
- [ ] Proxy PHP wp-ajax pour masquer les cles API IA

---

## Decisions en attente

| Sujet | Options | Deadline |
|-------|---------|----------|
| Themes supplementaires | Noms et palettes a definir | Phase 2 |

## Decisions prises

| Sujet | Decision | Date |
|-------|----------|------|
| Font corps | DM Sans (Google Fonts) | Mars 2026 |
| Provider email | Brevo | Mars 2026 |
| Font Catchy Mager | Pas disponible pour l'instant - fallback heritage theme WP | Mars 2026 |

---

## Log des sessions

| Date | Version | Travail effectue |
|------|---------|-----------------|
| Mars 2026 | v0.1 | Initialisation spec |
| Mars 2026 | v0.2 | Icones astrologiques - style Hybride SVG |
| Mars 2026 | v0.3 | Systeme de themes CSS |
| Mars 2026 | v0.4 | Compteur, email capture, CTA voyants, TTS |
| Mars 2026 | v0.5 | Limiteur tirages, provider IA, compatibilite WP, i18n, analytics |
| Mars 2026 | v0.6 | Banque d'animations, allegement doc |
| Mars 2026 | v0.7 | Decoupage en 3 fichiers PROJECT / SPEC / TODO |
| Mars 2026 | v0.8 | Creation CLAUDE.md - 6 points de cadrage valides |
| Mars 2026 | v0.9 | Ajout modele white label - client Dialotel / hexagon-voyance |
| Mars 2026 | v1.0 | Systeme de typo 3 niveaux (local, Google Fonts, heritage WP) |
| 2026-03-31 | v1.1 | Build complet : Git, .gitignore, theme-mystique, theme-dialotel, global.css, components.css, core.js, config Dialotel, 16 animations, donnees JSON, sprite SVG, app compatibilite-amoureuse |
```
