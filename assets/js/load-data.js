/**
 * Chargement dataset circuits + utilitaires favoris.
 */
const dataState = {
  loading: false,
  tracks: [],
  favorites: JSON.parse(localStorage.getItem("moto_favorites") || "[]")
};

export async function loadTracks() {
  dataState.loading = true;
  try {
    const response = await fetch("assets/data/moto-tracks.json", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const payload = await response.json();
    dataState.tracks = payload.tracks || [];
    return dataState.tracks;
  } catch (error) {
    console.error("[Data] Erreur loadTracks:", error);
    return [];
  } finally {
    dataState.loading = false;
  }
}

export function getTracks() {
  return [...dataState.tracks];
}

export function toggleFavorite(trackId) {
  try {
    const index = dataState.favorites.indexOf(trackId);
    if (index >= 0) dataState.favorites.splice(index, 1);
    else dataState.favorites.push(trackId);
    localStorage.setItem("moto_favorites", JSON.stringify(dataState.favorites));
  } catch (error) {
    console.error("[Data] Erreur toggleFavorite:", error);
  }
}

export function isFavorite(trackId) {
  return dataState.favorites.includes(trackId);
}
