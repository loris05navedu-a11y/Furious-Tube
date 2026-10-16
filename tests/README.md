# Tests

Ces tests utilisent les émulateurs Firebase (aucune donnée réelle n'est touchée).

```bash
cd tests && npm install
npm run rules                         # 87 cas : ce que chaque rôle peut / ne peut pas écrire (dont les préférences privées)
python3 -m http.server 8123 --directory .. &   # sert le site
npm run e2e                           # parcours complet : migration v1 -> v2, likes, commentaires, pseudo, staff, ban, synchro des recommandations
```

`e2e.js` charge le site dans Chromium (variable `CHROMIUM_PATH` si besoin) avec les émulateurs Auth et Firestore.
