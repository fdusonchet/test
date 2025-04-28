// ==========================================================================
// INITIALISATION DE LA CARTE LEAFLET
// ==========================================================================

// Crée une instance de carte Leaflet.
// 'mapid' correspond à l'ID de la div dans votre fichier index.html.
// setView() définit le centre initial (ici, les coordonnées de Paris) et le niveau de zoom (10).
const mymap = L.map('mapid').setView([48.8566, 2.3522], 10);

// Ajoute une couche de tuiles (les images de la carte) à partir d'OpenStreetMap.
// C'est ce qui affiche le fond de carte.
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    // Attribution : Important de mentionner la source des données cartographiques.
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mymap); // Ajoute cette couche de tuiles à votre carte.


// ==========================================================================
// CONFIGURATION DE LEAFLET.DRAW (pour le dessin interactif du cercle)
// ==========================================================================

// Un L.FeatureGroup est un conteneur spécial pour stocker des couches (comme nos marqueurs ou le cercle dessiné).
// Leaflet.draw a besoin d'un tel groupe pour savoir où stocker les formes éditables.
const editableLayers = new L.FeatureGroup();
mymap.addLayer(editableLayers); // Ajoute ce groupe à la carte. Les éléments ajoutés dedans seront visibles.

// Configuration de la barre d'outils de dessin.
// Pour l'instant, on la configure mais on ne l'ajoutera pas forcément à la carte tout de suite
// dans le workflow final (car le cercle sera créé par code), mais on garde la config.
// Si vous voulez voir la barre d'outils pour tester le dessin libre, décommentez la ligne 'mymap.addControl(drawControl);' plus bas.
const drawOptions = {
    position: 'topright', // Position par défaut de la barre d'outils si elle est affichée
    draw: {
        // Désactiver les outils dont nous n'avons pas besoin pour ce projet.
        polygon: false,
        polyline: false,
        rectangle: false,
        marker: false,
        circlemarker: false,
        // Configurer l'outil cercle s'il devait être disponible pour dessin libre (pourrait être désactivé plus tard)
        circle: {
            shapeOptions: {
                color: '#f30', // Couleur du cercle de dessin
                fillOpacity: 0.1
            }
        }
    },
    edit: {
        // Lier les outils d'édition (redimensionnement, déplacement, suppression) au groupe de couches modifiables.
        featureGroup: editableLayers,
        edit: true, // Permettre l'édition (redimensionnement/déplacement par défaut)
        remove: true // Permettre la suppression
    }
};

// Crée l'instance du contrôle de dessin/édition.
const drawControl = new L.Control.Draw(drawOptions);

// LIGNE À DÉCOMMENTER SEULEMENT SI VOUS VOULEZ VOIR ET TESTER LA BARRE D'OUTILS DE DESSIN LIBRE INITIALEMENT
// mymap.addControl(drawControl);


// ==========================================================================
// GESTION DES DONNÉES CLIENTS ET AFFICHAGE DES MARQUEURS
// ==========================================================================

// Tableau qui stockera nos données clients une fois lues et structurées.
let clientsData = [];
// Un groupe de couches spécifiquement pour les marqueurs clients, pour les gérer facilement.
const clientMarkers = L.featureGroup().addTo(mymap);


// Récupère l'élément input file depuis le HTML en utilisant son ID.
const excelFile = document.getElementById('excelFile');

// Ajoute un "écouteur d'événement" : cette fonction s'exécutera
// chaque fois que l'utilisateur sélectionnera un fichier dans l'input.
excelFile.addEventListener('change', function(e) {
    console.log("Fichier sélectionné. Début de la lecture...");

    // FileReader est un objet JavaScript standard pour lire le contenu des fichiers.
    const reader = new FileReader();

    // Cette fonction s'exécute quand le fichier est lu avec succès.
    reader.onload = function(e) {
        console.log("Fichier lu. Début du parsing...");
        const data = e.target.result; // Le contenu du fichier (binaire pour Excel)

        try {
            // Utilise SheetJS pour lire le classeur Excel à partir des données binaires.
            const workbook = XLSX.read(data, { type: 'binary' });

            // Supposons qu'on travaille toujours avec la première feuille (index 0).
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convertit la feuille en un tableau de tableaux.
            // 'header: 1' signifie que la première ligne est considérée comme l'en-tête.
            // 'raw: true' pour obtenir les valeurs brutes (important pour les nombres).
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

            console.log("Données parsées (tableau de tableaux):", jsonData);

            // *** ÉTAPE CRUCIALE : Traiter les données lues et extraire Lat/Lng ***
            // Cette fonction (définie plus bas) va parcourir le tableau 'jsonData'
            // pour créer un tableau d'objets JavaScript plus facile à utiliser,
            // en lisant directement les colonnes Latitude et Longitude.
            clientsData = processDataWithCoords(jsonData);

            console.log("Données clients structurées avec Lat/Lng:", clientsData);

            // *** ÉTAPE SUIVANTE : Afficher ces clients sur la carte ***
            displayClientMarkers(clientsData);

            // Ajuste la vue de la carte pour qu'elle englobe tous les marqueurs ajoutés.
            if (clientMarkers.getLayers().length > 0) { // Vérifie s'il y a des marqueurs
                 const bounds = clientMarkers.getBounds(); // Calcule l'étendue (rectangle) des marqueurs
                 if (bounds.isValid()) { // Vérifie si l'étendue est valide (pas vide)
                     mymap.fitBounds(bounds); // Adapte le zoom et le centrage de la carte
                 }
            }

             // Met à jour la zone des résultats pour indiquer le nombre de clients chargés.
             updateResultsList([]); // On vide la liste des clients "proches" pour l'instant
             const resultsDiv = document.getElementById('results');
             if (resultsDiv) {
                 resultsDiv.innerHTML = `<h3>Clients chargés : ${clientsData.length}</h3>`;
             }


        } catch (error) {
            console.error("Erreur lors du parsing ou du traitement du fichier:", error);
            alert("Erreur lors du traitement du fichier Excel. Vérifiez le format.");
        }
    };

    // Cette fonction s'exécute s'il y a une erreur pendant la lecture du fichier.
    reader.onerror = function(error) {
        console.error("Erreur lors de la lecture du fichier:", error);
        alert("Erreur lors de la lecture du fichier.");
    };

    // Lance la lecture du fichier sélectionné par l'utilisateur.
    // readAsBinaryString est nécessaire pour que SheetJS puisse lire les fichiers .xlsx.
    if (e.target.files && e.target.files[0]) { // Vérifie qu'un fichier a bien été sélectionné
        reader.readAsBinaryString(e.target.files[0]);
    }
});


// --- FONCTIONS DE TRAITEMENT ET D'AFFICHAGE ---

// Cette fonction prend le tableau de tableaux lu depuis le fichier Excel/CSV,
// extrait les informations nécessaires (Nom, Adresse, Lat, Lng, etc.)
// et retourne un tableau d'objets JavaScript structurés.
// Elle suppose que les coordonnées Lat/Lng sont déjà dans le fichier !
function processDataWithCoords(rawData) {
    const processedData = [];

    if (!rawData || rawData.length < 2) { // Moins de 2 lignes (en-tête + au moins une donnée)
        console.warn("Aucune donnée ou fichier vide/incorrect.");
        return processedData;
    }

    // --- IDENTIFICATION DES COLONNES ---
    // IMPORTANT : Adaptez ces indices pour qu'ils correspondent EXACTEMENT
    // à l'ordre des colonnes dans le fichier Excel/CSV que vous exportez
    // AVEC les colonnes Latitude et Longitude remplies automatiquement.
    // La première ligne (index 0) est considérée comme l'en-tête ici.
    const header = rawData[0]; // L'en-tête du tableau (première ligne)
    console.log("En-tête détecté (utilisé pour info, indexés ci-dessous):", header);

    // ATTENTION : Ces indices sont basés sur le fichier type AVEC Lat/Lng que j'ai proposé précédemment.
    // VÉRIFIEZ-LES ABSOLUMENT par rapport à votre fichier réel !
    const nomColIndex = 0;
    const adresseColIndex = 1;
    const cpColIndex = 2;
    const villeColIndex = 3;
    const paysColIndex = 4;
    const latColIndex = 5; // <== Index de la colonne Latitude dans VOTRE fichier
    const lngColIndex = 6; // <== Index de la colonne Longitude dans VOTRE fichier
    const typeColIndex = 7; // Exemple
    const potentielColIndex = 8; // Exemple
    const dernierContactColIndex = 9; // Exemple
    const commentairesColIndex = 10; // Exemple
    // ... ajoutez les indices pour les autres colonnes que vous voulez récupérer.

    // Parcourir les lignes de données, en commençant après l'en-tête (index 1).
    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];

        // Vérifie que la ligne n'est pas vide et qu'elle a suffisamment de colonnes
        // pour contenir au moins les colonnes Lat et Lng que vous essayez de lire.
        if (!row || row.length <= Math.max(latColIndex, lngColIndex) || !row[latColIndex] || !row[lngColIndex]) {
            console.warn(`Ligne ${i+1} ignorée : vide ou données Lat/Lng manquantes/incomplètes.`, row);
            continue; // Passe à la ligne suivante
        }

        // Tente de convertir les valeurs de Latitude et Longitude en nombres flottants (avec décimales).
        // C'est crucial car SheetJS pourrait les lire comme du texte.
        const latitude = parseFloat(row[latColIndex]);
        const longitude = parseFloat(row[lngColIndex]);

        // Vérifie si la conversion en nombre a réussi et que les valeurs sont valides.
        if (!isNaN(latitude) && !isNaN(longitude)) {
             // Crée un objet pour ce client avec les données structurées.
             const client = {
                 // Utilise les indices pour lire les données de la ligne.
                 // || "" permet d'éviter 'undefined' si une cellule est vide.
                 nom: row[nomColIndex] || "Nom Inconnu",
                 adresse: row[adresseColIndex] || "",
                 cp: row[cpColIndex] || "",
                 ville: row[villeColIndex] || "",
                 pays: row[paysColIndex] || "",
                 lat: latitude, // Utilise la latitude convertie
                 lng: longitude, // Utilise la longitude convertie
                 // Récupère les autres données en utilisant leurs indices correspondants.
                 type: row[typeColIndex] || "",
                 potentiel: row[potentielColIndex] || "",
                 dernierContact: row[dernierContactColIndex] || "",
                 commentaires: row[commentairesColIndex] || ""
                 // ... ajoutez les autres propriétés client
             };
             // Ajoute l'objet client au tableau final.
             processedData.push(client);
        } else {
             console.warn(`Ligne ${i+1} ignorée : Coordonnées Lat/Lng invalides (${row[latColIndex]}, ${row[lngColIndex]}).`, row);
        }
    }

    // Retourne le tableau d'objets clients prêts à être utilisés.
    return processedData;
}


// Cette fonction prend un tableau d'objets clients (qui doivent avoir lat et lng)
// et les ajoute sur la carte Leaflet sous forme de marqueurs.
function displayClientMarkers(clients) {
    console.log(`Affichage de ${clients.length} clients sur la carte...`);

    // Supprime tous les marqueurs qui étaient précédemment dans notre groupe clientMarkers.
    // C'est utile pour ne pas avoir d'anciens marqueurs après un nouvel import.
    clientMarkers.clearLayers();

    // Parcourt chaque client dans le tableau 'clients'.
    clients.forEach(client => {
        // Crée un marqueur Leaflet aux coordonnées [latitude, longitude] du client.
        const marker = L.marker([client.lat, client.lng]);

        // Prépare le contenu qui s'affichera dans la petite fenêtre (popup)
        // quand on clique sur le marqueur. Utilisez les données de l'objet client.
        const popupContent = `
            <b>${client.nom || 'Nom Inconnu'}</b><br>
            ${client.adresse}, ${client.cp} ${client.ville}<br>
            ${client.pays}<br>
            ${client.type ? `Type: ${client.type}<br>` : ''}
            ${client.potentiel ? `Potentiel: ${client.potentiel}<br>` : ''}
            ${client.dernierContact ? `Dernier contact: ${client.dernierContact}<br>` : ''}
            ${client.commentaires ? `Commentaires: ${client.commentaires}` : ''}
            `; // Utilisation d'opérateur ternaire `condition ? value_if_true : ''` pour n'afficher la ligne que si la donnée existe.

        // Lie ce contenu popup au marqueur.
        marker.bindPopup(popupContent);

        // Ajoute le marqueur créé au groupe de marqueurs clients.
        // Comme clientMarkers est déjà ajouté à la carte, le marqueur devient visible.
        clientMarkers.addLayer(marker);

        // Optionnel : Stocker une référence au client dans le marqueur (utile plus tard pour la recherche de proximité)
        marker.clientData = client;
    });

    console.log(`${clientMarkers.getLayers().length} marqueurs de clients ajoutés.`);
}


// ==========================================================================
// LOGIQUE DE RECHERCHE ET INTERACTION AVEC LE CERCLE (à implémenter plus tard)
// ==========================================================================

// Dans cette version, le cercle de recherche sera créé APRES qu'un client
// de départ soit sélectionné via une barre de recherche (qui n'est pas encore implémentée).
// Le centre du cercle sera la position du client sélectionné.
// Le cercle sera ensuite redimensionnable à la souris (grâce à Leaflet.draw).

// Variable pour stocker le cercle de recherche actuellement dessiné/édité.
let searchCircle = null;

// Événement de Leaflet.draw qui se déclenche quand une forme est DESSINÉE sur la carte
// via la barre d'outils (si elle est visible et configurée).
// Pour notre workflow "centre client fixe", ce listener pourrait ne pas être celui utilisé
// pour créer le cercle initial (qui sera créé par code), mais il peut servir si
// on veut permettre AUSSI le dessin manuel libre.
mymap.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer; // La forme qui vient d'être dessinée (notre cercle si configuré)

    // Si la forme créée est un cercle (Vérifie si l'objet est bien une instance de L.Circle)
    if (layer instanceof L.Circle) {
         // On peut ajouter le cercle dessiné au groupe de couches modifiables.
         editableLayers.clearLayers(); // Efface les anciens cercles/formes éditables
         editableLayers.addLayer(layer); // Ajoute le nouveau cercle

         // Met à jour la référence vers le cercle actif.
         searchCircle = layer;

         // Récupère les propriétés du cercle dessiné/créé.
         const center = searchCircle.getLatLng(); // Coordonnées du centre (objet LatLng)
         const radius = searchCircle.getRadius(); // Rayon en mètres

         console.log("Cercle créé via dessin !");
         console.log("Centre:", center.lat, center.lng);
         console.log("Rayon:", radius, "mètres");

         // *** APPELER LA FONCTION DE RECHERCHE ICI ***
         // Maintenant qu'on a un cercle, on peut chercher les clients à l'intérieur.
         findClientsInRadius(center, radius, clientsData); // clientsData contient tous les clients chargés

         // Le cercle est automatiquement éditable car il est dans editableLayers
         // lié à drawOptions.edit.
    } else {
         // Si une autre forme a été dessinée (si les autres outils ne sont pas désactivés)
         // On peut choisir d'ajouter d'autres formes éditables ou de les ignorer.
         // editableLayers.addLayer(layer); // Ajoute d'autres formes si désiré
         console.log("Une autre forme a été dessinée:", layer.type);
    }
});

// Événement de Leaflet.draw qui se déclenche quand une forme est MODIFIÉE
// (déplacée, redimensionnée). C'est l'événement clé pour le redimensionnement du cercle.
mymap.on(L.Draw.Event.EDITED, function (event) {
    const layers = event.layers; // Les couches (formes) qui ont été modifiées dans ce groupe

    // Parcourt chaque couche qui a été modifiée.
    layers.eachLayer(layer => {
        // Si la couche modifiée est bien un cercle.
        if (layer instanceof L.Circle) {
             // Récupère les nouvelles propriétés du cercle après modification.
             const center = layer.getLatLng(); // Nouvelles coordonnées du centre
             const radius = layer.getRadius(); // Nouveau rayon en mètres

             console.log("Cercle modifié !");
             console.log("Nouveau centre:", center.lat, center.lng);
             console.log("Nouveau rayon:", radius, "mètres");

             // *** APPELER LA FONCTION DE RECHERCHE ICI ***
             // Avec les nouvelles valeurs, on relance la recherche de clients dans le rayon.
             findClientsInRadius(center, radius, clientsData);
        }
    });
});

// Événement de Leaflet.draw qui se déclenche quand une forme est SUPPRIMÉE.
mymap.on(L.Draw.Event.DELETED, function (event) {
    // On réinitialise la référence au cercle et on vide la liste des résultats.
    searchCircle = null;
    updateResultsList([]);
    console.log("Cercle supprimé.");
});


// ==========================================================================
// FONCTIONS DE RECHERCHE DE PROXIMITÉ ET D'AFFICHAGE DES RÉSULTATS (à compléter)
// ==========================================================================

// Cette fonction prend les coordonnées du centre du cercle, son rayon (en mètres),
// et la liste de tous les clients. Elle identifie quels clients sont à l'intérieur
// du rayon et met à jour l'affichage.
function findClientsInRadius(center, radiusInMeters, allClients) {
     const clientsInRadius = [];

     // Parcourt tous les clients chargés.
     allClients.forEach(client => {
         // Crée un objet LatLng Leaflet pour la position du client.
         const clientLatLng = L.latLng(client.lat, client.lng);

         // Calcule la distance entre le centre du cercle et le client en mètres.
         // Leaflet fournit une méthode pratique 'distanceTo'.
         const distance = center.distanceTo(clientLatLng);

         // Vérifie si la distance est inférieure ou égale au rayon du cercle.
         if (distance <= radiusInMeters) {
             clientsInRadius.push(client);
             // Optionnel : Vous pourriez vouloir changer l'icône ou la couleur
             // du marqueur du client sur la carte ici pour le mettre en évidence.
             // Par exemple : clientMarkers.eachLayer(layer => { if (layer.clientData === client) { layer.setIcon(...); } });
         } else {
             // Optionnel : Vous pourriez vouloir assurer que les marqueurs hors rayon
             // ont leur apparence par défaut.
         }
     });

     console.log(`Trouvé ${clientsInRadius.length} clients dans un rayon de ${(radiusInMeters/1000).toFixed(1)} km.`);

     // *** ÉTAPE FINALE DE LA RECHERCHE : METTRE À JOUR L'AFFICHAGE DES RÉSULTATS ***
     // Appelle la fonction pour afficher la liste des clients trouvés dans la div 'results'.
     updateResultsList(clientsInRadius);
}


// Cette fonction prend la liste des clients trouvés à proximité
// et met à jour le contenu de l'élément HTML (la div #results) pour les afficher.
function updateResultsList(clients) {
    // Récupère l'élément div où afficher les résultats.
    const resultsDiv = document.getElementById('results');

    // S'assure que l'élément existe avant de le modifier.
    if (resultsDiv) {
        // Nettoie le contenu précédent et ajoute un titre.
        resultsDiv.innerHTML = `<h3>Clients trouvés à proximité (${clients.length}) :</h3>`;

        // Si aucun client n'est trouvé.
        if (clients.length === 0) {
            resultsDiv.innerHTML += '<p>Aucun client trouvé dans ce rayon.</p>';
        } else {
            // Crée une liste (ul) pour afficher les noms des clients.
            const ul = document.createElement('ul');
            clients.forEach(client => {
                const li = document.createElement('li');
                // Affiche le nom du client dans chaque élément de liste.
                // Vous pourriez ajouter d'autres infos ici.
                li.textContent = `${client.nom} - ${client.ville}`;

                // Optionnel : Ajoute un événement 'click' sur l'élément de liste
                // pour centrer la carte sur ce client quand on clique dessus.
                li.style.cursor = 'pointer'; // Change le curseur pour montrer que c'est cliquable
                li.addEventListener('click', () => {
                    mymap.setView([client.lat, client.lng], 14); // Centre et zoome légèrement
                    // Optionnel : Ouvrir la popup du marqueur correspondant
                    // Il faudrait pouvoir retrouver le marqueur à partir du client.
                    // On pourrait stocker l'objet client dans le marqueur quand on le crée (comme suggéré dans displayClientMarkers)
                    // puis chercher le marqueur correspondant ici.
                });

                ul.appendChild(li); // Ajoute l'élément li à la liste ul.
            });
            resultsDiv.appendChild(ul); // Ajoute la liste ul à la div des résultats.
        }
    }
}

// ==========================================================================
// PROCHAINES ÉTAPES À IMPLÉMENTER
// ==========================================================================

// 1. Barre de recherche client : Créer un input texte pour chercher un client par nom.
// 2. Logique de recherche/auto-complétion : Filtrer clientsData en fonction de la saisie.
// 3. Sélection client : Quand un client est sélectionné (par clic dans auto-complétion ou validation).
//    - Centrer la carte sur ce client.
//    - Créer le cercle de recherche à la position de ce client (L.circle(...)).
//    - Ajouter ce cercle à editableLayers.
//    - Activer le mode d'édition/redimensionnement sur ce cercle (via Leaflet.draw API ou juste en l'ajoutant à editableLayers).
//    - Lancer la première recherche findClientsInRadius() avec le centre du client et un rayon par défaut.
// 4. Affichage dynamique du rayon : Afficher le rayon en km quelque part sur l'interface et le mettre à jour lors de l'événement L.Draw.Event.EDITED.
// 5. Améliorer l'affichage des marqueurs : Changer l'icône ou la couleur des marqueurs des clients trouvés dans le rayon.
// 6. Géocodage dans l'app (Optionnel/Avancé) : Si votre fichier ne contient pas Lat/Lng, implémenter processAndGeocodeData pour appeler une API de géocodage avec gestion de l'asynchronicité et des limites d'API.
