import { initBaseLayers, switchMapLayer } from "./layers.js";
import { initClusterLayer, addTrackMarkersToCluster } from "./clustering.js";

const mapState = {
  loading: false,
  map: null,
  riderMarkers: new Map(),
  riderPolylines: new Map(),
  selfMarker: null
};

export function getMap() {
  return mapState.map;
}

export function initMap() {
  mapState.loading = true;
  try {
    mapState.map = L.map("map", { zoomControl: false }).setView([46.5398, 2.4303], 6);
    window.motoTrackMap = mapState.map;
    initBaseLayers(mapState.map);
    initClusterLayer(mapState.map);

    document.getElementById("layerToggleBtn")?.addEventListener("click", () => {
      const next = localStorage.getItem("moto_layer") === "osm" ? "satellite" : "osm";
      switchMapLayer(next);
    });
  } catch (error) {
    console.error("[Map] Erreur initMap:", error);
  } finally {
    mapState.loading = false;
  }
}

export function renderTracksOnMap(tracks = []) {
  try {
    addTrackMarkersToCluster(tracks);
  } catch (error) {
    console.error("[Map] Erreur renderTracksOnMap:", error);
  }
}

function riderIcon(isSelf = false) {
  const color = isSelf ? "#8b5cf6" : "#a855f7";
  return L.divIcon({
    className: "rider-live-marker",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color}88;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

export function renderLiveRiders(presenceMap = {}, currentUid = null) {
  try {
    if (!mapState.map) return;
    const incomingIds = new Set(Object.keys(presenceMap));

    mapState.riderMarkers.forEach((marker, uid) => {
      if (!incomingIds.has(uid)) {
        mapState.map.removeLayer(marker);
        mapState.riderMarkers.delete(uid);
      }
    });

    Object.entries(presenceMap).forEach(([uid, payload]) => {
      if (!Number.isFinite(payload?.lat) || !Number.isFinite(payload?.lng)) return;
      const latlng = [payload.lat, payload.lng];
      const popup = `<strong>${uid === currentUid ? "Moi" : `Rider ${uid.slice(0, 5)}`}</strong><br>Statut: ${payload.status || "inconnu"}`;
      const existing = mapState.riderMarkers.get(uid);
      if (existing) {
        existing.setLatLng(latlng).setPopupContent(popup);
      } else {
        const marker = L.marker(latlng, { icon: riderIcon(uid === currentUid) }).addTo(mapState.map).bindPopup(popup);
        mapState.riderMarkers.set(uid, marker);
      }
    });
  } catch (error) {
    console.error("[Map] Erreur renderLiveRiders:", error);
  }
}

export function renderRiderTraces(tracesMap = {}) {
  try {
    if (!mapState.map) return;
    const incomingIds = new Set(Object.keys(tracesMap));

    mapState.riderPolylines.forEach((line, uid) => {
      if (!incomingIds.has(uid)) {
        mapState.map.removeLayer(line);
        mapState.riderPolylines.delete(uid);
      }
    });

    Object.entries(tracesMap).forEach(([uid, pointsObj]) => {
      const points = Object.values(pointsObj || {}).filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng));
      if (points.length < 2) return;
      const latLngs = points.slice(-25).map((p) => [p.lat, p.lng]);
      const existing = mapState.riderPolylines.get(uid);
      if (existing) {
        existing.setLatLngs(latLngs);
      } else {
        const color = "#7c3aed";
        const line = L.polyline(latLngs, { color, weight: 3, opacity: 0.8 }).addTo(mapState.map);
        mapState.riderPolylines.set(uid, line);
      }
    });
  } catch (error) {
    console.error("[Map] Erreur renderRiderTraces:", error);
  }
}

export function focusOnGroup(presenceMap = {}) {
  try {
    if (!mapState.map) return;
    const points = Object.values(presenceMap)
      .filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
      .map((p) => [p.lat, p.lng]);
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    mapState.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  } catch (error) {
    console.error("[Map] Erreur focusOnGroup:", error);
  }
}

/**
 * Affiche la position locale du pilote, meme si Firebase n'ecrit pas.
 */
export function renderSelfPilotPosition(position, label = "Moi (local)") {
  try {
    if (!mapState.map || !position?.coords) return;
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const icon = L.divIcon({
      className: "rider-self-marker",
      html: `<div class="rider-self-pulse"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (mapState.selfMarker) {
      mapState.selfMarker.setLatLng([lat, lng]);
    } else {
      mapState.selfMarker = L.marker([lat, lng], { icon }).addTo(mapState.map);
    }
    mapState.selfMarker.bindPopup(`<strong>${label}</strong><br>GPS local actif`);
    const panel = document.getElementById("gpsLivePanel");
    if (panel) {
      panel.textContent = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  } catch (error) {
    console.error("[Map] Erreur renderSelfPilotPosition:", error);
  }
}
