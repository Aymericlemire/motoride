/**
 * Mode Test Ride
 * Checklist de validation avant départ + compteur style moto.
 */

import { getBluetoothState } from "./bluetooth.js";
import { getAuthState } from "./auth.js";

const rideState = {
  loading: false,
  speedKmh: 0,
  maxKmh: 0,
  watchId: null,
  refreshTimer: null
};

function boolLabel(ok) {
  return ok ? "OK" : "KO";
}

function renderGauge() {
  const gauge = document.getElementById("rideGauge");
  const speed = document.getElementById("rideSpeedValue");
  const max = document.getElementById("rideMaxValue");
  if (!gauge || !speed || !max) return;
  const capped = Math.min(200, Math.max(0, Math.round(rideState.speedKmh)));
  const deg = Math.round((capped / 200) * 270);
  gauge.style.background = `conic-gradient(#FF6B00 ${deg}deg, rgba(255,255,255,0.15) ${deg}deg 270deg, transparent 270deg)`;
  speed.textContent = String(capped);
  max.textContent = `${Math.round(rideState.maxKmh)} km/h`;
}

function evaluateChecklist() {
  const bt = getBluetoothState();
  const auth = getAuthState();
  const shareBtn = document.getElementById("shareToggleBtn");
  const checks = {
    bluetooth: Boolean(bt.device),
    gps: "geolocation" in navigator,
    network: navigator.onLine,
    auth: Boolean(auth.user?.uid),
    socialShare: Boolean(shareBtn?.textContent?.includes("ON"))
  };

  const target = document.getElementById("rideChecklist");
  if (!target) return;
  target.innerHTML = `
    <li>Bluetooth intercom: <strong>${boolLabel(checks.bluetooth)}</strong></li>
    <li>GPS disponible: <strong>${boolLabel(checks.gps)}</strong></li>
    <li>Connexion réseau: <strong>${boolLabel(checks.network)}</strong></li>
    <li>Rider connecté: <strong>${boolLabel(checks.auth)}</strong></li>
    <li>Partage social actif: <strong>${boolLabel(checks.socialShare)}</strong></li>
  `;
}

export function startTestRide() {
  rideState.loading = true;
  try {
    if ("geolocation" in navigator && rideState.watchId === null) {
      rideState.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const kmh = Math.max(0, (position.coords.speed || 0) * 3.6);
          rideState.speedKmh = kmh;
          rideState.maxKmh = Math.max(rideState.maxKmh, kmh);
          renderGauge();
        },
        () => {
          rideState.speedKmh = 0;
          renderGauge();
        },
        { enableHighAccuracy: true }
      );
    }

    if (rideState.refreshTimer === null) {
      rideState.refreshTimer = window.setInterval(evaluateChecklist, 1500);
    }
    evaluateChecklist();
    renderGauge();
  } catch (error) {
    console.error("[TestRide] Erreur startTestRide:", error);
  } finally {
    rideState.loading = false;
  }
}

export function stopTestRide() {
  try {
    if (rideState.watchId !== null) {
      navigator.geolocation.clearWatch(rideState.watchId);
      rideState.watchId = null;
    }
    if (rideState.refreshTimer !== null) {
      clearInterval(rideState.refreshTimer);
      rideState.refreshTimer = null;
    }
  } catch (error) {
    console.error("[TestRide] Erreur stopTestRide:", error);
  }
}

export function initTestRideUI(containerId = "statsContainer") {
  const host = document.getElementById(containerId);
  if (!host) return;

  const block = document.createElement("section");
  block.className = "test-ride card";
  block.innerHTML = `
    <h3>Mode Test Ride</h3>
    <p style="margin-top: 0; color: var(--muted);">Checklist avant départ + compteur style moto.</p>
    <div class="ride-gauge-wrap">
      <div id="rideGauge" class="ride-gauge">
        <div class="ride-gauge-inner">
          <div id="rideSpeedValue" class="ride-speed">0</div>
          <div class="ride-unit">km/h</div>
          <div id="rideMaxValue" class="ride-max">0 km/h</div>
        </div>
      </div>
    </div>
    <ul id="rideChecklist" class="ride-checklist"></ul>
    <div class="ride-actions">
      <button id="rideStartBtn" class="btn-primary">Activer le test</button>
      <button id="rideStopBtn" class="btn-secondary">Stop test</button>
    </div>
  `;
  host.prepend(block);

  document.getElementById("rideStartBtn")?.addEventListener("click", startTestRide);
  document.getElementById("rideStopBtn")?.addEventListener("click", stopTestRide);
}
