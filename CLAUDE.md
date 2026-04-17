# Z-AI Plugin Tirages
> Développeur senior d'une suite d'apps web de tirage (compatibilité amoureuse, tarot, numérologie) en HTML/CSS/JS pur, livrables en plugin WordPress et CodeCanyon.

## Stack
- HTML / CSS / JS pur (pas de framework, pas de build tool)
- API Mistral (tirage IA)
- WordPress (Phase 1B en cours)
- PHP (shortcodes, enqueue) — Phase 1B
- TTS ElevenLabs (optionnel Phase 3)

## Fichiers clés
| Fichier/Dossier | Rôle |
|---|---|
| assets/css/themes/ | Thèmes (mystique, dialotel) — variables CSS var(--theme-*) |
| assets/js/core.js | Moteur partagé : étapes, TTS, IA, limiteur quota, i18n, analytics |
| assets/data/ | JSON : tarot, astrologie, config, i18n, prompts |
| assets/animations/ | Banque CSS : transitions, loaders, cards, reveal |
| [nom-tirage].html | 4 apps HTML autonomes |
| clients/dialotel/ | White label Dialotel : config JSON, fonts, theme |
| voyance-tirages/ | Plugin WordPress — shortcodes.php, enqueue.php, templates |

## Architecture
Phase 1 : socle complet (CSS global variables + core.js moteur + animations CSS + banque data). Chaque tirage = HTML autonome + CSS + JS métier. Phase 1B (en cours) : plugin WordPress avec shortcodes pour intégrer les apps dans n'importe quel thème, enqueue d'assets, adaptation Dialotel. Monétisation : compteur social-proof, limiteur quota/jour, modale capture email, CTA voyants.

## État actuel
✅ Phase 1 : socle, CSS, JS core, animations, SVG zodiac, 4 apps HTML
⏳ **Phase 1B (en cours)** : plugin WordPress, shortcodes.php, enqueue.php, templates Dialotel
❌ **Bloqueurs** : (1) clé API Mistral à injecter core.js, (2) font CatchyMager.woff2 manquante, (3) quotas (counterBase, freePerDay, extendedPerDay) non définis

## Prochaines étapes
1. Débloquer clé API Mistral → injecter core.js + tester tirage IA
2. Récupérer CatchyMager.woff2 → clients/dialotel/fonts/ + vérifier CSS
3. Configurer counterBase + quotas par tirage (assets/data/config/) + URL CTA voyants
4. Finaliser Phase 1B : compléter templates, enqueue, shortcodes compatibilité tous thèmes WP

## Commandes
