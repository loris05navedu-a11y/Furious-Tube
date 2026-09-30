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
  api.js              → Firestore (base de données)
  firebase.js         → initialisation Firebase (Auth + Firestore)
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

## Firebase

Auth (e-mail / mot de passe **ou Google**) et Firestore (vidéos + profils) utilisent le projet Firebase de `js/config.js`.
Connexion Google : console Firebase → Authentication → Sign-in method → **Google → Activer** (une seule fois).
Le même projet sert à la connexion Google de [WhatQuiz](https://loris05navedu-a11y.github.io/WhatQuiz/) (la connexion Google fonctionne sur les deux) :
un compte Google est reconnu sur les deux sites. Le nom Google est converti en pseudo valide (caractères autorisés uniquement).
Règles Firestore recommandées : voir `firestore.rules` (à coller dans Firestore → Règles → Publier).
Domaine autorisé requis : Authentication → Paramètres → Domaines autorisés → `<utilisateur>.github.io`.

## Administrateurs

Les e-mails admin sont listés dans `ADMIN_EMAILS` (`js/config.js`). Un compte n'est admin que si son **e-mail est vérifié**
(un e-mail de vérification est envoyé à l'inscription / à la connexion). Les admins ont : suppression et masquage de n'importe quelle
vidéo, suppression de commentaires, bannissement, et un panneau « 👑 Admin » (vidéos + utilisateurs).

## ⚠️ Sécurité

La clé web Firebase est publique par conception. En revanche le secret Sightengine de `js/config.js` est visible de tous :
faites-le régénérer si besoin. Les règles Firestore limitent l'écriture aux comptes connectés, mais tout compte connecté
peut encore modifier le document partagé : pour une vraie sécurité, il faudrait des documents par vidéo / par utilisateur.
