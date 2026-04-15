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
| assets/data/ | JSON inline : tarot, astrologie, config, i18n, prompts |
| assets/animations/ | Banque CSS : transitions, loaders, cards, reveal |
| [nom-tirage].html | 4 apps : compatibilité-amoureuse, -astrologique, tarot, numérologie |
| clients/dialotel/ | White label client (jamais dans les zips client) |

## Architecture
Socle partagé : CSS global (var(--theme-*), reset .vt-app) + moteur core.js pour étapes/limiteur/IA/i18n. Chaque tirage = 1 HTML autonome + CSS spécifique + JS logique métier. Phases : Phase 1 (4 apps HTML standalone + theme mystique) → Phase 1B (plugin Dialotel sobre) → Phase 2 (plugin CodeCanyon commercial).

## État actuel
✅ Phase 1 socle complet : arborescence, CSS/JS, animations, SVG, i18n  
✅ 4 apps HTML : compatibilité-amoureuse, -astrologique, tarot, numérologie  
⏳ À finaliser : API Mistral, CatchyMager (Dialotel), counterBase & quotas

## Prochaines étapes
1. Récupérer CatchyMager.woff2 auprès de Dialotel → clients/dialotel/fonts/
2. Configurer clé API Mistral (pattern `"apiKey": "REMPLACER_ICI"`)
3. Définir counterBase (valeur initiale) + quotas (freePerDay, extendedPerDay)
4. Définir URL landing voyants pour CTA

## Commandes
```bash
# Ouvrir tirage dans navigateur
open [nom-tirage].html

# Consulter références
cat PROJECT.md   # Vision produit
cat SPEC.md      # Règles techniques
cat TODO.md      # État d'avancement
```
