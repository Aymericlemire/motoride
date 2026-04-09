/**
 * Clustering de marqueurs circuits.
 */
const clusteringState = { loading: false, map: null, clusterGroup: null };

function markerIcon(track) {
  return L.divIcon({
    className: "track-marker",
    html: `<div style="width:14px;height:14px;background:#FF6B00;border-radius:50%;border:2px solid #fff;"></div>`,
    iconSize: [14, 14]
  });
}

export function initClusterLayer(map) {
  clusteringState.loading = true;
  try {
    clusteringState.map = map;
    clusteringState.clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      animate: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const color = count > 25 ? "#ef4444" : count > 10 ? "#f59e0b" : "#22c55e";
        return L.divIcon({ html: `<div style="background:${color};color:white;border-radius:999px;padding:6px 10px;">${count}</div>` });
      }
    });
    clusteringState.clusterGroup.on("clusterclick", (event) => {
      const childCount = event.layer.getChildCount();
      event.layer.bindPopup(`<div class="cluster-summary">${childCount} circuits dans cette zone</div>`).openPopup();
    });
    map.addLayer(clusteringState.clusterGroup);
  } catch (error) {
    console.error("[Cluster] Erreur initClusterLayer:", error);
  } finally {
    clusteringState.loading = false;
  }
}

export function addTrackMarkersToCluster(tracks = []) {
  try {
    if (!clusteringState.clusterGroup) return;
    clusteringState.clusterGroup.clearLayers();
    tracks.forEach((track) => {
      const marker = L.marker([track.lat, track.lng], { icon: markerIcon(track) })
        .bindPopup(`<strong>${track.name}</strong><br>${track.region}<br>${track.type}`);
      clusteringState.clusterGroup.addLayer(marker);
    });
  } catch (error) {
    console.error("[Cluster] Erreur addTrackMarkersToCluster:", error);
  }
}
