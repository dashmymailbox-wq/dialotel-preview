# Z-AI Plugin Tirages
> Développeur senior d'une suite d'apps web de tirage (compatibilité amoureuse, tarot, numérologie) en HTML/CSS/JS pur, livrables en plugin WordPress et CodeCanyon.

## Stack
- HTML / CSS / JS pur (pas de framework, pas de build tool)
- API Mistral (tirage IA)
- TTS ElevenLabs (optionnel Phase 3)
- WordPress (Phase 1B en cours)
- Git local

## Fichiers clés
| Fichier/Dossier | Rôle |
|---|---|
| assets/css/themes/ | Thèmes (mystique, dialotel) — variables CSS var(--theme-*) |
| assets/js/core.js | Moteur partagé : étapes, limiteur quota, API, i18n, analytics |
| assets/data/ | JSON : tarot, astrologie, config, i18n, prompts |
| assets/animations/ | Banque CSS : transitions, loaders, cards, reveal |
| [nom-tirage].html | 4 apps HTML : compatibilité-amoureuse, -astrologique, tarot, numérologie |
| clients/dialotel/ | White label Dialotel : plugin WordPress, shortcodes, enqueue, theme sobre |

## Architecture
Socle partagé : CSS global (variables, reset scopé) + core.js pour étapes/limiteur/IA/i18n/analytics. Chaque tirage = HTML + CSS + JS métier. Monétisation : compteur social-proof, limiteur quota/jour, modale capture email, CTA voyants. Phases : Phase 1 (apps HTML + theme mystique) → Phase 1B (plugin Dialotel WordPress) → Phase 2 (CodeCanyon commercial).

## État actuel
✅ Phase 1 socle : CSS, core.js, animations, SVG zodiac, i18n, 4 apps HTML autonomes
🔄 Phase 1B en cours : plugin Dialotel WordPress (shortcodes, enqueue, theme sobre)
⏳ À finaliser : API Mistral, CatchyMager.woff2, counterBase, quotas, URL landing

## Prochaines étapes
1. Intégrer plugin WordPress Dialotel (shortcodes dynamiques, enqueue assets, admin config)
2. Configurer clé API Mistral dans core.js
3. Définir counterBase + quotas limiteur (freePerDay, extendedPerDay) par app
4. Définir URL landing voyants et modale email (provider, champs)

## Commandes
```bash
open compatibilite-amoureuse.html        # Tester une app
cat PROJECT.md                            # Vision produit
cat SPEC.md                               # Règles techniques
cat TODO.md                               # État d'avancement
```
