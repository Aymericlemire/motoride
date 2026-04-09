import { initAuth, signInWithGoogle, getAuthState, logout } from "./auth.js";
import { isFirebaseConfigured } from "../../firebase-config.js";
import { initNavigation } from "./navigation.js";
import { loadTracks } from "./load-data.js";
import {
  initMap,
  renderTracksOnMap,
  getMap,
  renderLiveRiders,
  renderRiderTraces,
  focusOnGroup,
  renderSelfPilotPosition,
  getSelfPilotCoords
} from "./map.js";
import { initRouting } from "./routing.js";
import { initCircuitsUI } from "./circuits.js";
import { loadWeather, renderWeatherWidget } from "./weather.js";
import {
  initSocialUI,
  startLiveLocationShare,
  stopLiveLocationShare,
  watchGroupPresence,
  watchGroupTraces,
  getOrCreateLocalRiderId,
  isLiveLocationShareEnabled,
  renderNearbyRiders,
  bindNearbyRadiusChange,
  getNearbyRadiusKm
} from "./social.js";
import { sendChatMessage, watchLastMessages } from "./chat.js";
import { renderStatsDashboard } from "./stats.js";

const appState = {
  loading: false,
  firebaseReady: false,
  latestPresence: {},
  focusedOnce: false
};

function riderId() {
  return getAuthState().user?.uid || getOrCreateLocalRiderId();
}

function setLoading(value) {
  appState.loading = value;
  document.getElementById("globalLoader")?.classList.toggle("hidden", !value);
}

export function showToast(message, type = "info") {
  const host = document.getElementById("toastContainer");
  if (!host) return;
  const item = document.createElement("div");
  item.className = "toast";
  item.style.borderLeftColor = type === "error" ? "#ef4444" : type === "success" ? "#22c55e" : "#ff6b00";
  item.textContent = message;
  host.appendChild(item);
  setTimeout(() => item.remove(), 2600);
}

function geoError(error) {
  if (!error || typeof error.code !== "number") return "Erreur GPS inconnue";
  if (error.code === 1) return "Permission GPS refusée";
  if (error.code === 2) return "Position indisponible";
  if (error.code === 3) return "Timeout GPS";
  return "Erreur GPS inconnue";
}

async function requestGpsPermission() {
  if (!("geolocation" in navigator)) {
    showToast("GPS non supporté sur cet appareil", "error");
    return false;
  }
  try {
    await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 });
    });
    return true;
  } catch (error) {
    showToast(geoError(error), "error");
    return false;
  }
}

function updateProfileInfo() {
  const node = document.getElementById("profileInfo");
  if (!node) return;
  const user = getAuthState().user;
  if (!user) {
    node.innerHTML = `<div style="color:var(--text-secondary)">Non connecté</div>`;
    return;
  }
  node.innerHTML = `
    <div>
      Connecté: <strong>${user.displayName || user.email || "Rider"}</strong><br>
      <span style="color:var(--text-secondary);font-size:12px;">UID: ${user.uid}</span>
    </div>
  `;
}

async function ensureLivePresence() {
  if (!appState.firebaseReady) return;
  const user = getAuthState().user;
  if (!user?.uid) return;
  if (isLiveLocationShareEnabled()) return;
  startLiveLocationShare(
    user.uid,
    "global",
    () => showToast("Erreur envoi position Firebase", "error"),
    (pos) => renderSelfPilotPosition(pos, "Moi")
  );
  showToast("Mode live activé", "success");
}

function bindAuthEvents() {
  window.addEventListener("mototrack:auth-state-changed", async () => {
    updateProfileInfo();
    if (getAuthState().user?.uid) await ensureLivePresence();
    else stopLiveLocationShare();
  });
}

function initProfileUI() {
  const host = document.getElementById("profileContainer");
  if (!host) return;
  host.innerHTML = `
    <div class="card">
      <h3>Profil</h3>
      <button id="googleSignBtn" class="btn-primary">Connexion Google</button>
      <button id="logoutBtn" class="btn-danger">Déconnexion</button>
      <div id="profileInfo" style="margin-top:10px;"></div>
    </div>
  `;
  document.getElementById("googleSignBtn")?.addEventListener("click", async () => {
    try {
      await signInWithGoogle();
      showToast("Connexion Google lancée", "success");
    } catch (error) {
      showToast(`Erreur Google: ${error?.code || "unknown"}`, "error");
    }
  });
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      await logout();
      stopLiveLocationShare();
      showToast("Déconnecté", "info");
    } catch (error) {
      showToast(`Erreur logout: ${error?.code || "unknown"}`, "error");
    }
  });
  updateProfileInfo();
}

function bindSocialRealtime() {
  bindNearbyRadiusChange(() => {
    renderNearbyRiders(appState.latestPresence, riderId(), getSelfPilotCoords(), getNearbyRadiusKm());
  });

  watchGroupPresence("global", (presence) => {
    appState.latestPresence = presence || {};
    const current = riderId();
    renderLiveRiders(appState.latestPresence, current);
    renderNearbyRiders(appState.latestPresence, current, getSelfPilotCoords(), getNearbyRadiusKm());
    if (!appState.focusedOnce && Object.keys(appState.latestPresence).length > 0) {
      focusOnGroup(appState.latestPresence);
      appState.focusedOnce = true;
    }
  });

  watchGroupTraces("global", (traces) => renderRiderTraces(traces));

  watchLastMessages("global", (messages) => {
    const box = document.getElementById("chatMessages");
    if (!box) return;
    box.innerHTML = Object.values(messages).map((m) => `<div class="chat-message">${m.text}</div>`).join("");
  });

  document.getElementById("chatSendBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("chatInput");
    const text = input?.value?.trim();
    if (!text) return;
    await sendChatMessage("global", { text, uid: riderId() });
    input.value = "";
  });

  document.getElementById("shareToggleBtn")?.addEventListener("click", () => {
    if (!appState.firebaseReady) {
      showToast("Firebase non configuré", "error");
      return;
    }
    const uid = riderId();
    if (!isLiveLocationShareEnabled()) {
      startLiveLocationShare(
        uid,
        "global",
        () => showToast("Erreur partage position", "error"),
        (pos) => renderSelfPilotPosition(pos, "Moi")
      );
      showToast("Partage activé", "success");
    } else {
      stopLiveLocationShare();
      showToast("Partage désactivé", "info");
    }
  });
}

async function bootstrap() {
  setLoading(true);
  try {
    appState.firebaseReady = isFirebaseConfigured();
    if (!appState.firebaseReady) {
      showToast("Configure Firebase dans firebase-config.js", "error");
    }

    initNavigation();
    initMap();
    initRouting(getMap());
    initSocialUI();
    initProfileUI();
    initCircuitsUI();
    renderStatsDashboard([]);
    bindAuthEvents();
    bindSocialRealtime();

    const tracks = await loadTracks();
    renderTracksOnMap(tracks);

    const gpsOk = await requestGpsPermission();
    if (gpsOk) {
      navigator.geolocation.watchPosition(
        async (pos) => {
          renderSelfPilotPosition(pos, "Moi");
          const weather = await loadWeather(pos.coords.latitude, pos.coords.longitude);
          renderWeatherWidget(weather);
        },
        (error) => showToast(geoError(error), "error"),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
      );
    }

    if (appState.firebaseReady) {
      await initAuth();
      if (gpsOk) await ensureLivePresence();
    }
  } catch (error) {
    console.error("[App] bootstrap error:", error);
    showToast(`Erreur init: ${error?.message || "unknown"}`, "error");
  } finally {
    setLoading(false);
  }
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
bootstrap();
