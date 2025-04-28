// Initialiser la carte : 'mapid' est l'ID de l'élément div dans index.html
var mymap = L.map('mapid').setView([48.8566, 2.3522], 10); // Centre initial sur Paris, zoom niveau 10

// Ajouter le fond de carte OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mymap);

// --- Configuration et ajout de la barre d'outils de dessin ---

// Un groupe de couches Leaflet pour stocker les formes dessinées (obligatoire pour Leaflet.draw)
var editableLayers = new L.FeatureGroup();
mymap.addLayer(editableLayers);

// Options pour la barre d'outils de dessin
var options = {
    position: 'topright', // Position de la barre d'outils
    draw: {
        polygon: false, // Désactiver l'outil polygone
        polyline: false, // Désactiver l'outil polyligne
        rectangle: false, // Désactiver l'outil rectangle
        marker: false, // Désactiver l'outil marqueur simple
        circlemarker: false, // Désactiver l'outil marqueur cercle
        circle: { // Activer et configurer l'outil cercle
            shapeOptions: {
                color: '#f30', // Couleur du cercle
                fillOpacity: 0.1 // Transparence du remplissage
            }
        }
    },
    edit: {
        featureGroup: editableLayers, // Le groupe de couches qui contient les formes à éditer
        edit: true, // Permettre l'édition des formes
        remove: true // Permettre la suppression des formes
    }
};

// Créer la barre d'outils de dessin avec les options
var drawControl = new L.Control.Draw(options);
mymap.addControl(drawControl);

// --- Écouteurs d'événements pour les actions de dessin ---

// Événement déclenché quand une forme est dessinée
mymap.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer; // La forme qui vient d'être dessinée

    // Ici, 'layer' est le cercle dessiné.
    // Vous pouvez l'ajouter au groupe de couches si vous voulez le conserver
    editableLayers.addLayer(layer);

    // *** Prochaine étape importante : Récupérer les infos du cercle ***
    if (layer instanceof L.Circle) {
        var center = layer.getLatLng(); // Coordonnées du centre (LatLng object)
        var radius = layer.getRadius(); // Rayon en mètres

        console.log("Cercle dessiné !");
        console.log("Centre:", center.lat, center.lng);
        console.log("Rayon:", radius, "mètres"); // Leaflet stocke le rayon en mètres

        // --- C'est ici que vous appellerez la fonction pour trouver les clients dans ce rayon ---
        // Ex: trouverClientsDansRayon(center.lat, center.lng, radius);
    }

    // Si vous ne voulez permettre qu'un seul cercle à la fois :
    // editableLayers.clearLayers(); // Efface les anciennes formes
    // editableLayers.addLayer(layer); // Ajoute la nouvelle
});

// Événement déclenché quand une forme est éditée (redimensionnée, déplacée)
mymap.on(L.Draw.Event.EDITED, function (event) {
    var layers = event.layers; // Les couches qui ont été modifiées

    layers.eachLayer(function (layer) {
        // Si la couche modifiée est un cercle
        if (layer instanceof L.Circle) {
             var center = layer.getLatLng(); // Nouvelles coordonnées du centre
             var radius = layer.getRadius(); // Nouveau rayon en mètres

             console.log("Cercle modifié !");
             console.log("Nouveau centre:", center.lat, center.lng);
             console.log("Nouveau rayon:", radius, "mètres");

             // --- Appeler à nouveau la fonction pour trouver les clients avec les nouvelles valeurs ---
             // Ex: trouverClientsDansRayon(center.lat, center.lng, radius);
        }
    });
});

// Événement déclenché quand une forme est supprimée
mymap.on(L.Draw.Event.DELETED, function (event) {
    var layers = event.layers; // Les couches qui ont été supprimées

    layers.eachLayer(function (layer) {
        console.log("Forme supprimée !");
        // --- Ici, vous pourriez vouloir effacer les résultats de recherche précédents ---
    });
});
