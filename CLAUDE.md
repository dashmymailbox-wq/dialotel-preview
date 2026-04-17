# Z-AI Plugin Tirages
> Développeur senior d'une suite d'apps web de tirage (compatibilité amoureuse, tarot, numérologie) en HTML/CSS/JS pur, livrables en plugin WordPress et CodeCanyon.

## Stack
- HTML / CSS / JS pur (pas de framework, pas de build tool)
- API Mistral (tirage IA)
- TTS ElevenLabs (optionnel Phase 3)
- WordPress (Phase 1B à démarrer)
- Git local

## Fichiers clés
| Fichier/Dossier | Rôle |
|---|---|
| assets/css/themes/ | Thèmes (mystique, dialotel) — variables CSS var(--theme-*) |
| assets/js/core.js | Moteur partagé : étapes, TTS, IA, limiteur quota, i18n, analytics |
| assets/data/ | JSON : tarot, astrologie, config, i18n, prompts |
| assets/animations/ | Banque CSS : transitions, loaders, cards, reveal |
| [nom-tirage].html | 4 apps HTML : compatibilité-amoureuse, -astrologique, tarot, numérologie |
| clients/dialotel/ | White label Dialotel : theme sobre, config, font locale |
| assets/icons/zodiac-sprite.svg | Sprite SVG 12 signes zodiacaux (style Hybride) |

## Architecture
Socle Phase 1 complet : CSS global (variables, reset scopé) + core.js (étapes, IA, limiteur, i18n, analytics) + banque animations CSS. Chaque tirage = HTML autonome + CSS + JS métier. Phase 1B : plugin WordPress avec shortcodes + enqueue assets + thème Dialotel. Monétisation : compteur social-proof, limiteur quota/jour, modale capture email, CTA voyants.

## État actuel
✅ Phase 1 : socle, CSS, JS core, animations, SVG zodiac, 4 apps HTML
❌ **Bloqueurs critiques** : (1) clé API Mistral manquante → l'injecter dans core.js, (2) CatchyMager.woff2 non reçue → à récupérer auprès de Dialotel, (3) counterBase + quotas (freePerDay, extendedPerDay) non définis → à configurer par app dans assets/data/config/
⏳ Phase 1B : plugin WordPress à créer (shortcodes, enqueue, Dialotel spécifique)

## Prochaines étapes
1. Récupérer clé API Mistral → injecter dans core.js + tester tirage IA
2. Obtenir CatchyMager.woff2 → clients/dialotel/fonts/ + vérifier chargement CSS
3. Configurer counterBase + quotas par tirage (config JSON) + URL CTA voyants
4. Démarrer Phase 1B : créer plugin WordPress (shortcodes, enqueue, theme Dialotel)

## Commandes
