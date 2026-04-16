# Z-AI Plugin Tirages
> Développeur senior d'une suite d'apps web de tirage (compatibilité amoureuse, tarot, numérologie) en HTML/CSS/JS pur, livrables en plugin WordPress et CodeCanyon.

## Stack
- HTML / CSS / JS pur (pas de framework, pas de build tool)
- API Mistral (tirage IA)
- TTS ElevenLabs (optionnel Phase 3)
- WordPress (Phase 2)
- Git local

## Fichiers clés
| Fichier/Dossier | Rôle |
|---|---|
| assets/css/themes/ | Thèmes (mystique, dialotel) — CSS variables var(--theme-*) |
| assets/js/core.js | Moteur partagé : étapes, limiteur quota, API, i18n, analytics |
| assets/data/ | JSON : tarot, astrologie, config, i18n, prompts |
| assets/animations/ | Banque CSS : transitions, loaders, cards, reveal |
| [nom-tirage].html | 4 apps : compatibilité-amoureuse, -astrologique, tarot, numérologie |
| clients/dialotel/ | White label client Dialotel (jamais dans zips client) |

## Architecture
Socle partagé : CSS global (var(--theme-*), reset .vt-app) + moteur core.js pour étapes/limiteur/IA/i18n/analytics. Chaque tirage = 1 HTML autonome + CSS spécifique + JS logique métier. Phases : Phase 1 (4 apps HTML standalone + theme mystique) → Phase 1B (plugin Dialotel sobre) → Phase 2 (plugin CodeCanyon commercial).

## État actuel
✅ Phase 1 socle complet : CSS, JS core, animations, SVG zodiac, i18n
✅ 4 apps HTML fonctionnelles : structure + UI + flux UX
⏳ À finaliser : intégration API Mistral, CatchyMager.woff2 (Dialotel), counterBase + quotas, URL landing voyants

## Prochaines étapes
1. Obtenir CatchyMager.woff2 auprès de Dialotel → clients/dialotel/fonts/
2. Configurer clé API Mistral dans core.js (pattern `"apiKey": "REMPLACER_ICI"`)
3. Définir counterBase par app + quotas limiteur (freePerDay, extendedPerDay)
4. Définir URL landing voyants pour CTA (configurable par app)

## Commandes
```bash
# Lancer une app dans navigateur
open compatibilite-amoureuse.html

# Consulter la doc
cat PROJECT.md   # Vision produit
cat SPEC.md      # Règles techniques
cat TODO.md      # État d'avancement
```
