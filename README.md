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

## Membres du staff

Les admins nomment des membres du staff (profil → « 🦺 Staff », durée au choix ou indéfinie). Même outils de modération qu'un admin,
avec des limites : bannissement de 2 h maximum, changement de pseudo toutes les 4 h (24 h pour les autres, aucune limite pour les admins),
pas de nomination de staff, pas de sanction contre un admin ou un autre staff.

## 🔒 Base de données sécurisée (v2)

Par défaut le site utilise l'ancienne base (deux documents partagés `bins/users` et `bins/videos`), que tout compte connecté peut modifier.
La v2 stocke un document par profil (`users/<uid>`) et par vidéo (`videos/<id>`) et **fait vérifier les droits par Firestore** :
admin (e-mails vérifiés), staff, propriétaire, délai des pseudos, bans de 2 h, likes / vues / commentaires limités à leur auteur.

Passer en v2 (une seule fois, par un admin) :

1. Console Firebase → Firestore → **Règles** : coller le contenu de `firestore.rules` → **Publier**
   (les règles gèrent les deux modes ; les e-mails admin y sont dupliqués depuis `ADMIN_EMAILS` : gardez-les identiques).
2. Sur le site, connecté en admin : **👑 Admin → bouton « Migrer vers la base sécurisée »**. Les profils et vidéos sont copiés,
   puis le mode v2 est activé pour tout le monde (les visiteurs déjà connectés rechargent la page).
3. Retour possible depuis le même panneau (« Revenir à l'ancienne base ») ; les anciennes données restent intactes.

Les règles et la couche de données sont testées avec les émulateurs Firebase : voir `tests/README.md`.

## ⚠️ Sécurité

La clé web Firebase est publique par conception. En revanche le secret Sightengine de `js/config.js` est visible de tous :
faites-le régénérer si besoin. Tant que la migration v2 n'est pas faite, les règles Firestore limitent seulement l'écriture aux
comptes connectés : tout compte connecté peut modifier le document partagé.
