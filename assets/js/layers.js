/**
 * Gestion des couches cartographiques avec persistance locale.
 */
const layerState = { loading: false, map: null, activeLayerKey: "osm", layers: {} };

export function initBaseLayers(map) {
  layerState.loading = true;
  try {
    layerState.map = map;
    layerState.layers = {
      osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "OSM" }),
      satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Esri" }),
      terrain: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { attribution: "OpenTopoMap" }),
      // URL publique sans clé API pour éviter l'écran carte vide.
      cycle: L.tileLayer("https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png", { attribution: "CyclOSM" })
    };
    const persisted = localStorage.getItem("moto_layer") || "osm";
    switchMapLayer(persisted);
  } catch (error) {
    console.error("[Layers] Erreur initBaseLayers:", error);
  } finally {
    layerState.loading = false;
  }
}

export function switchMapLayer(key = "osm") {
  try {
    if (!layerState.map) return;
    Object.values(layerState.layers).forEach((layer) => {
      if (layerState.map.hasLayer(layer)) layerState.map.removeLayer(layer);
    });
    const selected = layerState.layers[key] || layerState.layers.osm;
    selected.addTo(layerState.map);
    selected.off("tileerror");
    selected.on("tileerror", () => {
      // Fallback immédiat si serveur tuiles indisponible.
      if (selected !== layerState.layers.osm) {
        switchMapLayer("osm");
      }
    });
    layerState.activeLayerKey = key in layerState.layers ? key : "osm";
    localStorage.setItem("moto_layer", layerState.activeLayerKey);
  } catch (error) {
    console.error("[Layers] Erreur switchMapLayer:", error);
  }
}
