/* FuriousTubes — point d'entrée : chargé en dernier, une fois tous les modules définis */
loadSession();
renderHeader();
renderCats();
loadFeed().then(openFromUrl);
if(currentUser) startTimeTracking();
watchAuth();   // Firebase : restaure / valide la session

// Furious Maker : liste des projets récents (après loadSession pour voir les projets du compte)
renderRecent();
