# FuriousTubes 🔥

Plateforme de partage de vidéos + éditeur vidéo intégré (**Furious Maker**), 100 % statique : hébergeable sur **GitHub Pages**.

## Structure

```
index.html            → structure de la page (HTML uniquement)
assets/favicon.svg
css/
  base.css            → variables, reset
  layout.css          → header, hero, catégories, grille, boutons
  music.css           → barre de musique
  cards.css           → cartes vidéo
  modals.css          → connexion / import
  player.css          → lecteur + commentaires
  profile.css         → profils
  toast.css           → notifications
  maker.css           → Furious Maker
js/
  config.js           → clés API, catégories, mots interdits  ← à modifier ici
  utils.js            → fonctions utilitaires (dates, toast…)
  api.js              → JSONBin (base de données)
  session.js          → session + temps passé sur le site
  header.js / categories.js / auth.js / feed.js / upload.js
  player.js / comments.js / moderation.js / profile.js / music.js
  maker/              → Furious Maker (état, timeline, filtres, textes, export, projets…)
  main.js             → démarrage (chargé en dernier)
```

Les scripts sont chargés dans l'ordre depuis `index.html` ; `main.js` doit rester le dernier.

## Mettre en ligne avec GitHub Pages

1. Sur GitHub : **Settings → Pages**
2. *Source* : **Deploy from a branch**
3. Branche : `main` (ou la branche qui contient ces fichiers), dossier **/ (root)** → **Save**
4. Le site sera disponible sous `https://<utilisateur>.github.io/Furious-Tube/`

Le fichier `.nojekyll` empêche GitHub de traiter le site avec Jekyll.

## Tester en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## ⚠️ Sécurité

Les clés présentes dans `js/config.js` (clé maître JSONBin, secret Sightengine) sont **publiques** dès que le site est en ligne :
n'importe qui peut les lire et modifier/supprimer la base de données. Pour un vrai site, passez par un backend
(ex. Firebase, Supabase, ou une petite fonction serverless) au lieu d'une clé maître côté navigateur.
