# Z-AI Plugin Tirages
> Développeur senior d'une suite d'apps web de tirage (compatibilité amoureuse, tarot, numérologie) en HTML/CSS/JS pur, livrables en plugin WordPress et CodeCanyon.

## Stack
- HTML / CSS / JS pur (pas de framework, pas de build tool)
- API Mistral (tirage IA)
- TTS ElevenLabs (optionnel Phase 3)
- WordPress (Phase 2)
- Git local, pas de remote

## Fichiers clés
| Fichier/Dossier | Rôle |
|---|---|
| assets/css/themes/ | Thèmes (mystique, dialotel) — CSS variables var(--theme-*) |
| assets/js/core.js | Moteur partagé : étapes, limiteur quota, API, i18n, analytics |
| assets/data/ | JSON inline : tarot, astrologie, config, i18n |
| assets/animations/ | Banque CSS : transitions, loaders, card reveal, reveal |
| [nom-tirage].html | Apps autonomes Phase 1 (compatibilité, tarot, numérologie...) |
| clients/dialotel/ | White label client (jamais dans les zips de livraison) |

## Architecture
Socle partagé : CSS global (var(--theme-*), reset .vt-app) + components réutilisables + moteur core.js pour étapes/limiteur/IA/i18n. Chaque tirage = 1 HTML autonome + CSS spécifique + JS logique métier. Phases : Phase 1 (HTML standalone + theme mystique) → Phase 1B (plugin Dialotel sobre) → Phase 2 (plugin CodeCanyon commercial).

## État actuel
✅ Arborescence + socle CSS/JS + banque animations + sprites SVG + i18n  
🔄 En cours : première app (compatibilité-amoureuse.html)  
⏳ À faire : config API Mistral, clé CatchyMager, définir quotas/counterBase

## Prochaines étapes
1. Finaliser compatibilité-amoureuse.html (HTML + CSS + JS + config.json)
2. Récupérer police CatchyMager auprès de Dialotel
3. Configurer clé API Mistral (pattern `"apiKey": "REMPLACER_ICI"`)
4. Définir dans TODO.md : counterBase par tirage + limites quotas

## Commandes
```bash
# Ouvrir tirage dans navigateur (pas de serveur nécessaire)
open [nom-tirage].html

# Consulter autorité de projet
cat PROJECT.md   # Vision produit
cat SPEC.md      # Règles techniques
cat TODO.md      # État d'avancement
```
