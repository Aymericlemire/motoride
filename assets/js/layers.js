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
      cycle: L.tileLayer("https://{s}.tile.thunderforest.com/cycle/{z}/{x}.png?apikey=YOUR_THUNDERFOREST_KEY", { attribution: "OpenCycleMap" })
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
    layerState.activeLayerKey = key in layerState.layers ? key : "osm";
    localStorage.setItem("moto_layer", layerState.activeLayerKey);
  } catch (error) {
    console.error("[Layers] Erreur switchMapLayer:", error);
  }
}
