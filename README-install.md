# Installation — Plugin Voyance Tirages (Dialotel / Hexagon Voyance)

## Installation WordPress

1. Aller dans **Extensions > Ajouter > Televerser une extension**
2. Selectionner le fichier `voyance-tirages.zip`
3. Cliquer **Installer**, puis **Activer**
4. Un nouveau menu **Voyance Tirages** apparait dans la sidebar admin

## Configuration

Aller dans **Voyance Tirages** — 6 onglets :

### Onglet "Page & SEO"
- Definir le titre et le slug de la page WordPress
- Configurer les balises meta (title, description)
- Cliquer **Enregistrer** pour creer la page automatiquement

### Onglet "Branding"
- Nom de la marque (defaut : Hexagon Voyance)
- Logo et favicon (URL depuis la mediatheque WordPress)

### Onglet "App"
- Titre, description, texte du bouton
- Compteur de tirages
- Bon de reduction (pourcentage, texte email)
- CTA voyants (texte d'accroche, bouton, URL destination)
- FAQ SEO (5 questions/reponses)
- Boutons de partage social (Facebook, WhatsApp, TikTok, Instagram, Snapchat)

### Onglet "APIs"
- Choisir le provider IA actif : **Mistral**, **OpenAI** ou **Claude**
- Saisir la cle API correspondante
- Tester la cle avec le bouton "Tester la cle"
- Configurer **Brevo** pour la capture email (cle API + List ID)

### Onglet "Avance"
- Voix TTS (lecture vocale du resultat)
- Limite de tirages par jour (gratuits + etendus apres email)
- Theme par defaut (clair/sombre)
- Bouton toggle theme

### Onglet "Logs"
- Journal d'activite en temps reel
- Historique des appels IA, erreurs, inscriptions email

## Integration dans une page

Placer le shortcode dans le contenu de n'importe quelle page :

```
[tirage_voyance type="compatibilite-amoureuse"]
```

Types disponibles :
- `compatibilite-amoureuse`
- `compatibilite-astrologique` (bientot)
- `tirage-tarot` (bientot)
- `numerologie` (bientot)

## Fonctionnement technique

- Les cles API sont stockees cote serveur (WordPress options) — jamais exposees dans le navigateur
- Les appels IA passent par un proxy AJAX (`admin-ajax.php`) pour proteger les cles
- Les emails sont envoyes via Brevo (si configure)
- Le plugin cree automatiquement la page WordPress lors de la premiere sauvegarde

## Support

Pour toute question, contacter l'equipe de developpement.
