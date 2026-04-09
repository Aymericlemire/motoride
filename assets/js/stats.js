const statsState = { loading: false, chart: null };

export function renderStatsDashboard(trips = []) {
  statsState.loading = true;
  try {
    const host = document.getElementById("statsContainer");
    if (!host) return;
    const totalKm = trips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
    const totalSec = trips.reduce((sum, t) => sum + (t.durationSec || 0), 0);
    const avgSpeed = trips.length ? trips.reduce((s, t) => s + (t.avgSpeed || 0), 0) / trips.length : 0;
    host.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div>Total km</div><div class="stat-value">${totalKm.toFixed(1)}</div></div>
        <div class="stat-card"><div>Temps en selle</div><div class="stat-value">${Math.round(totalSec / 3600)} h</div></div>
        <div class="stat-card"><div>Trajets</div><div class="stat-value">${trips.length}</div></div>
        <div class="stat-card"><div>Vitesse moyenne</div><div class="stat-value">${avgSpeed.toFixed(1)} km/h</div></div>
      </div>
      <div class="chart-wrap"><canvas id="speedChart"></canvas></div>
    `;
    const ctx = document.getElementById("speedChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (statsState.chart) statsState.chart.destroy();
    statsState.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: trips.map((_, i) => `T${i + 1}`),
        datasets: [{ label: "Vitesse moyenne", data: trips.map((t) => t.avgSpeed || 0), borderColor: "#FF6B00" }]
      }
    });
  } catch (error) {
    console.error("[Stats] Erreur renderStatsDashboard:", error);
  } finally {
    statsState.loading = false;
  }
}
