import { getTracks, toggleFavorite, isFavorite } from "./load-data.js";
import { buildRoute, exportRouteAsGpx } from "./routing.js";

const circuitsState = { loading: false, selectedFrom: null, selectedTo: null };

export function initCircuitsUI() {
  circuitsState.loading = true;
  try {
    const host = document.getElementById("circuitsContainer");
    if (!host) return;
    const tracks = getTracks();
    const options = tracks.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
    host.innerHTML = `
      <div class="card-grid">
        <div class="card">
          <h3>Itinéraire entre circuits</h3>
          <select id="routeFrom" class="auth-input"><option value="">Départ</option>${options}</select>
          <select id="routeTo" class="auth-input"><option value="">Arrivée</option>${options}</select>
          <button id="routeCalcBtn" class="btn-primary">Calculer l'itinéraire</button>
          <button id="routeExportBtn" class="btn-secondary">Exporter GPX</button>
        </div>
        ${tracks.map((t) => `
          <article class="card">
            <strong>${t.name}</strong><br>${t.region} - ${t.type}
            <p>${t.description}</p>
            <button data-track-fav="${t.id}" class="btn-secondary">${isFavorite(t.id) ? "Retirer favori" : "Ajouter favori"}</button>
          </article>
        `).join("")}
      </div>
    `;
    host.querySelectorAll("[data-track-fav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleFavorite(btn.dataset.trackFav);
        initCircuitsUI();
      });
    });
    document.getElementById("routeCalcBtn")?.addEventListener("click", () => {
      const from = tracks.find((t) => t.id === document.getElementById("routeFrom").value);
      const to = tracks.find((t) => t.id === document.getElementById("routeTo").value);
      circuitsState.selectedFrom = from || null;
      circuitsState.selectedTo = to || null;
      if (from && to) buildRoute(from, to);
    });
    document.getElementById("routeExportBtn")?.addEventListener("click", exportRouteAsGpx);
  } catch (error) {
    console.error("[Circuits] Erreur initCircuitsUI:", error);
  } finally {
    circuitsState.loading = false;
  }
}
