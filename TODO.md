## TODO.md

```markdown
# TODO.md — Voyance Tirages
> Suivi d'avancement. Ouvrir en début de chaque session de travail.
> Dernière mise à jour : 31 mars 2026

---

## Statut global

| Phase | Avancement |
|-------|------------|
| Phase 1 — Apps HTML | En cours |
| Phase 2 — Plugin WP | Non démarré |
| Phase 3 — IA premium | Non démarré |

---

## En cours

- [ ] Récupérer le fichier Catchy Mager auprès de Dialotel -> clients/dialotel/fonts/CatchyMager.woff2
- [ ] Configurer la clé API Mistral
- [ ] Définir les counterBase pour chaque tirage
- [ ] Définir les quotas du limiteur (freePerDay, extendedPerDay)
- [ ] Définir l'URL de la landing voyants (CTA)

---

## A faire — Phase 1

### Setup
- [ ] Récupérer le fichier Catchy Mager auprès de Dialotel -> clients/dialotel/fonts/CatchyMager.woff2
- [ ] Creer le dossier clients/dialotel/
- [ ] Creer clients/dialotel/theme-dialotel.css (palette fond blanc)
- [ ] Creer clients/dialotel/config/hexagon-voyance.config.json
- [ ] Initialiser Git local (git init) dans le dossier du projet
- [ ] Creer .gitignore (config reels, fichiers OS)

### Socle partage
- [ ] Creer assets/css/themes/theme-mystique.css
- [ ] Creer assets/css/global.css (variables CSS, reset scope .vt-app)
- [ ] Creer assets/css/components.css (bouton hex, cards, etats loading/error)
- [ ] Creer assets/js/core.js (moteur etapes, TTS, IA adapter, limiteur, analytics, i18n)
- [ ] Generer assets/icons/zodiac-sprite.svg (12 signes, style Hybride)
- [ ] Creer assets/data/i18n/fr.json

### Banque d'animations
- [ ] assets/animations/transitions/fade.css
- [ ] assets/animations/transitions/slide.css
- [ ] assets/animations/transitions/scale-reveal.css
- [ ] assets/animations/transitions/blur-reveal.css
- [ ] assets/animations/loaders/pulse.css
- [ ] assets/animations/loaders/shimmer.css
- [ ] assets/animations/loaders/orbit.css
- [ ] assets/animations/loaders/dots.css
- [ ] assets/animations/cards/card-shuffle.css
- [ ] assets/animations/cards/card-draw.css
- [ ] assets/animations/cards/card-flip.css
- [ ] assets/animations/cards/card-hover.css
- [ ] assets/animations/reveal/glow.css
- [ ] assets/animations/reveal/typewriter.css
- [ ] assets/animations/reveal/unfold.css
- [ ] assets/animations/reveal/star-burst.css

### Donnees
- [ ] Creer assets/data/astrology/signs.json
- [ ] Creer assets/data/compatibility/matrix.json
- [ ] Creer assets/data/tarot/definitions.json
- [ ] Creer assets/data/i18n/fr.json
- [ ] Generer assets/icons/zodiac-sprite.svg (12 signes, style Hybride)

### Apps de tirage
- [ ] Compatibilite amoureuse (compatibilite-amoureuse.html)
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
```
