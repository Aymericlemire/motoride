import { initAuth, signInWithGoogle, getAuthState, logout } from "./auth.js";
import { isFirebaseConfigured } from "../../firebase-config.js";
import { initNavigation } from "./navigation.js";
import { loadTracks, getTracks } from "./load-data.js";
import { initMap, renderTracksOnMap, getMap, renderLiveRiders, renderRiderTraces, focusOnGroup, renderSelfPilotPosition, getSelfPilotCoords } from "./map.js";
import { initRouting } from "./routing.js";
import { initCircuitsUI } from "./circuits.js";
import { loadWeather, renderWeatherWidget } from "./weather.js";
import { initSocialUI, startLiveLocationShare, stopLiveLocationShare, watchGroupPresence, watchGroupTraces, getOrCreateLocalRiderId, isLiveLocationShareEnabled, renderNearbyRiders } from "./social.js";
import { sendChatMessage, watchLastMessages } from "./chat.js";
import { startTracking, stopTrackingAndSave } from "./tracking.js";
import { renderStatsDashboard } from "./stats.js";
import { connectBluetoothDevice, disconnectBluetoothDevice, getBluetoothState, diagnoseGattServices } from "./bluetooth.js";
import { openIntercomVendorApp } from "./intercom-bridge.js";
import { initTestRideUI } from "./test-ride.js";

const appState = { loading: false, deferredInstallPrompt: null, currentTrips: [] };
let hasFocusedGroupOnce = false;
let localPilotWatchId = null;

function getRuntimeRiderId() {
  return getAuthState().user?.uid || getOrCreateLocalRiderId();
}

function setGlobalLoading(value) {
  appState.loading = value;
  document.getElementById("globalLoader")?.classList.toggle("hidden", !value);
}

export function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const item = document.createElement("div");
  item.className = "toast";
  item.style.borderLeftColor = type === "error" ? "#ef4444" : type === "success" ? "#22c55e" : "#FF6B00";
  item.textContent = message;
  container.appendChild(item);
  setTimeout(() => item.remove(), 2600);
}

function describeGeoError(error) {
  if (!error || typeof error.code !== "number") return "Erreur GPS inconnue.";
  if (error.code === 1) return "Permission GPS refusée.";
  if (error.code === 2) return "Position indisponible.";
  if (error.code === 3) return "Timeout GPS.";
  return "Erreur GPS inconnue.";
}

async function requestGpsPermission() {
  try {
    if (!("geolocation" in navigator)) {
      showToast("Geolocalisation non supportee sur cet appareil", "error");
      return false;
    }

    // Force la popup de permission navigateur si nécessaire.
    await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 });
    });
    showToast("Permission GPS accordee", "success");
    return true;
  } catch (error) {
    showToast(describeGeoError(error), "error");
    return false;
  }
}

function startLocalPilotWatcher() {
  try {
    if (!("geolocation" in navigator)) {
      showToast("Geolocalisation non supportee sur cet appareil", "error");
      return;
    }
    if (localPilotWatchId !== null) return;
    localPilotWatchId = navigator.geolocation.watchPosition(
      (position) => {
        renderSelfPilotPosition(position, "Moi (local)");
      },
      (error) => {
        showToast(describeGeoError(error), "error");
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
    );
  } catch (error) {
    console.error("[App] Erreur startLocalPilotWatcher:", error);
  }
}

function initTheme() {
  const btn = document.getElementById("themeToggleBtn");
  const current = localStorage.getItem("moto_theme") || "dark";
  document.body.classList.toggle("theme-light", current === "light");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("theme-light");
    localStorage.setItem("moto_theme", isLight ? "light" : "dark");
  });
}

function initProfileUI() {
  const host = document.getElementById("profileContainer");
  if (!host) return;
  const btSupported = getBluetoothState().supported;
  host.innerHTML = `
    <div class="auth-card">
      <h3>Profil rider</h3>
      <button id="googleSignBtn" class="btn-primary">Connexion Google</button>
      <button id="logoutBtn" class="btn-danger">Déconnexion</button>
      <button id="trackStartBtn" class="btn-secondary">Démarrer trajet</button>
      <button id="trackStopBtn" class="btn-secondary">Stop + sauvegarder trajet</button>
      <button id="gpsPermissionBtn" class="btn-primary">Autoriser GPS</button>
      <hr style="border-color: rgba(255,255,255,0.15); width: 100%;" />
      <h4 style="margin: 0;">Intercom Bluetooth</h4>
      <button id="btConnectBtn" class="btn-primary" ${btSupported ? "" : "disabled"}>Connecter un intercom</button>
      <button id="btDisconnectBtn" class="btn-secondary">Déconnecter intercom</button>
      <button id="btDiagBtn" class="btn-secondary">Diagnostic compatibilité</button>
      <div id="bluetoothStatus">${btSupported ? "Bluetooth prêt pour test." : "Web Bluetooth non supporté sur cet appareil/navigateur."}</div>
      <pre id="bluetoothDiag" style="white-space: pre-wrap; margin: 0; font-size: 12px; color: var(--muted);"></pre>
      <hr style="border-color: rgba(255,255,255,0.15); width: 100%;" />
      <h4 style="margin: 0;">Intercom Hub (apps constructeurs)</h4>
      <div style="display: grid; gap: 8px; grid-template-columns: 1fr 1fr;">
        <button id="openCardoAppBtn" class="btn-secondary">Ouvrir Cardo</button>
        <button id="openSenaAppBtn" class="btn-secondary">Ouvrir Sena</button>
        <button id="openMidlandAppBtn" class="btn-secondary">Ouvrir Midland</button>
        <button id="openFodsportsAppBtn" class="btn-secondary">Ouvrir Fodsports</button>
      </div>
      <small style="color: var(--muted);">
        Si l'app n'est pas installée, un site officiel s'ouvre automatiquement.
      </small>
      <div id="profileInfo"></div>
    </div>
  `;
  document.getElementById("googleSignBtn")?.addEventListener("click", async () => {
    try { await signInWithGoogle(); showToast("Connexion réussie", "success"); } catch { showToast("Erreur connexion", "error"); }
  });
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try { await logout(); showToast("Déconnecté", "success"); } catch { showToast("Erreur déconnexion", "error"); }
  });
  document.getElementById("trackStartBtn")?.addEventListener("click", () => startTracking());
  document.getElementById("gpsPermissionBtn")?.addEventListener("click", async () => {
    const granted = await requestGpsPermission();
    if (granted) {
      startLocalPilotWatcher();
      navigator.geolocation.getCurrentPosition((pos) => {
        renderSelfPilotPosition(pos, "Moi (local)");
        getMap()?.setView([pos.coords.latitude, pos.coords.longitude], 17);
      });
    }
  });
  document.getElementById("trackStopBtn")?.addEventListener("click", async () => {
    const uid = getAuthState().user?.uid;
    if (!uid) return showToast("Connecte-toi d'abord", "error");
    const trip = await stopTrackingAndSave(uid);
    if (trip) {
      appState.currentTrips.push(trip);
      renderStatsDashboard(appState.currentTrips);
      showToast("Trajet enregistré", "success");
    }
  });
  document.getElementById("btConnectBtn")?.addEventListener("click", async () => {
    try {
      await connectBluetoothDevice();
      showToast("Intercom connecté", "success");
    } catch {
      showToast("Impossible de connecter l'intercom", "error");
    }
  });
  document.getElementById("btDisconnectBtn")?.addEventListener("click", async () => {
    await disconnectBluetoothDevice();
    showToast("Intercom déconnecté", "info");
  });
  document.getElementById("btDiagBtn")?.addEventListener("click", async () => {
    try {
      const services = await diagnoseGattServices();
      const state = getBluetoothState();
      const diag = document.getElementById("bluetoothDiag");
      if (diag) {
        diag.textContent = [
          `Compatibilité: ${state.compatibilityMode}`,
          `Nom appareil: ${state.device?.name || "inconnu"}`,
          `Services détectés: ${services.length}`,
          ...services.map((uuid) => `- ${uuid}`)
        ].join("\n");
      }
      if (!state.device) showToast("Connecte d'abord un intercom", "error");
      else showToast("Diagnostic terminé", "success");
    } catch {
      showToast("Diagnostic impossible", "error");
    }
  });
  document.getElementById("openCardoAppBtn")?.addEventListener("click", async () => {
    try { await openIntercomVendorApp("cardo"); showToast("Ouverture Cardo...", "info"); } catch { showToast("Ouverture Cardo impossible", "error"); }
  });
  document.getElementById("openSenaAppBtn")?.addEventListener("click", async () => {
    try { await openIntercomVendorApp("sena"); showToast("Ouverture Sena...", "info"); } catch { showToast("Ouverture Sena impossible", "error"); }
  });
  document.getElementById("openMidlandAppBtn")?.addEventListener("click", async () => {
    try { await openIntercomVendorApp("midland"); showToast("Ouverture Midland...", "info"); } catch { showToast("Ouverture Midland impossible", "error"); }
  });
  document.getElementById("openFodsportsAppBtn")?.addEventListener("click", async () => {
    try { await openIntercomVendorApp("fodsports"); showToast("Ouverture Fodsports...", "info"); } catch { showToast("Ouverture Fodsports impossible", "error"); }
  });
}

function initPwaInstall() {
  const installBtn = document.getElementById("installPwaBtn");
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    appState.deferredInstallPrompt = event;
    installBtn?.classList.remove("hidden");
  });
  installBtn?.addEventListener("click", async () => {
    if (!appState.deferredInstallPrompt) return;
    appState.deferredInstallPrompt.prompt();
    await appState.deferredInstallPrompt.userChoice;
    appState.deferredInstallPrompt = null;
    installBtn.classList.add("hidden");
  });
}

async function bootstrap() {
  setGlobalLoading(true);
  try {
    const firebaseReady = isFirebaseConfigured();
    if (!firebaseReady) {
      showToast("Firebase non configure: renseigne tes cles dans firebase-config.js", "error");
    }

    initTheme();
    initNavigation();
    if (firebaseReady) {
      await initAuth();
    }
    const gpsGranted = await requestGpsPermission();
    initMap();
    initRouting(getMap());
    const tracks = await loadTracks();
    renderTracksOnMap(tracks);
    initCircuitsUI();
    initSocialUI();
    initProfileUI();
    renderStatsDashboard(appState.currentTrips);
    initTestRideUI("statsContainer");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const weather = await loadWeather(pos.coords.latitude, pos.coords.longitude);
      renderWeatherWidget(weather);
      renderSelfPilotPosition(pos, "Moi (local)");
    }, (error) => {
      showToast(describeGeoError(error), "error");
    });
    startLocalPilotWatcher();

    // Intégration Firebase: active automatiquement la présence live si GPS OK.
    if (firebaseReady && gpsGranted && !isLiveLocationShareEnabled()) {
      const uid = getRuntimeRiderId();
      startLiveLocationShare(
        uid,
        "global",
        () => showToast("Impossible d'envoyer la position Firebase", "error"),
        (position) => renderSelfPilotPosition(position, "Moi (GPS local)")
      );
      showToast("Présence Firebase activée", "success");
    }

    document.getElementById("locatePilotBtn")?.addEventListener("click", () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          renderSelfPilotPosition(pos, "Moi (local)");
          getMap()?.setView([pos.coords.latitude, pos.coords.longitude], 17);
          showToast("Position pilote mise a jour", "success");
        },
        (error) => showToast(describeGeoError(error), "error"),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });

    document.getElementById("shareToggleBtn")?.addEventListener("click", () => {
      if (!firebaseReady) {
        showToast("Firebase non configure: partage riders indisponible", "error");
        return;
      }
      const uid = getRuntimeRiderId();
      if (!isLiveLocationShareEnabled()) {
        startLiveLocationShare(
          uid,
          "global",
          () => showToast("Active la permission GPS pour partager ta position", "error"),
          (position) => renderSelfPilotPosition(position, "Moi (GPS local)")
        );
        showToast("Partage de position active", "success");
      }
      else {
        stopLiveLocationShare();
        showToast("Partage de position desactive", "info");
      }
    });
    watchGroupPresence("global", (presence) => {
      const currentUid = getRuntimeRiderId();
      renderLiveRiders(presence, currentUid);
      renderNearbyRiders(presence, currentUid, getSelfPilotCoords(), 10);
      if (!hasFocusedGroupOnce && Object.keys(presence || {}).length > 0) {
        focusOnGroup(presence);
        hasFocusedGroupOnce = true;
      }
    });
    watchGroupTraces("global", (traces) => {
      renderRiderTraces(traces);
    });
    document.getElementById("chatSendBtn")?.addEventListener("click", async () => {
      const input = document.getElementById("chatInput");
      const text = input?.value?.trim();
      if (!text) return;
      await sendChatMessage("global", { text, uid: getRuntimeRiderId() });
      input.value = "";
    });
    watchLastMessages("global", (messages) => {
      const box = document.getElementById("chatMessages");
      if (!box) return;
      box.innerHTML = Object.values(messages).map((m) => `<div class="chat-message">${m.text}</div>`).join("");
    });
    initPwaInstall();
  } catch (error) {
    console.error("[App] Erreur bootstrap:", error);
    showToast("Erreur d'initialisation", "error");
  } finally {
    setGlobalLoading(false);
  }
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
bootstrap();
