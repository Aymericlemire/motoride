/**
 * Routage entre deux circuits via Leaflet Routing Machine (OSRM public).
 */
const routingState = { loading: false, control: null, map: null };

export function initRouting(map) {
  routingState.map = map;
}

export function buildRoute(fromTrack, toTrack) {
  routingState.loading = true;
  try {
    if (!routingState.map || !fromTrack || !toTrack) return null;
    if (routingState.control) routingState.map.removeControl(routingState.control);
    routingState.control = L.Routing.control({
      waypoints: [L.latLng(fromTrack.lat, fromTrack.lng), L.latLng(toTrack.lat, toTrack.lng)],
      routeWhileDragging: true,
      draggableWaypoints: true,
      showAlternatives: false,
      router: L.Routing.osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1" })
    }).addTo(routingState.map);
    return routingState.control;
  } catch (error) {
    console.error("[Routing] Erreur buildRoute:", error);
    return null;
  } finally {
    routingState.loading = false;
  }
}

export function exportRouteAsGpx() {
  // Placeholder export GPX: brancher un vrai parser GPX selon lib choisie.
  const gpx = `<?xml version="1.0"?><gpx version="1.1"><metadata><name>MotoTrack Route</name></metadata></gpx>`;
  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mototrack-route.gpx";
  a.click();
}
