import { getFirebaseServices } from "../../firebase-config.js";
import { ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const socialState = { loading: false, shareEnabled: false, timerId: null, watchId: null, currentGroupId: null };

export function isLiveLocationShareEnabled() {
  return socialState.shareEnabled;
}

export function getOrCreateLocalRiderId() {
  const key = "mototrack_local_rider_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = `rider-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, created);
  return created;
}

export function initSocialUI() {
  const host = document.getElementById("socialContainer");
  if (!host) return;
  host.innerHTML = `
    <div class="social-actions">
      <button id="shareToggleBtn" class="btn-primary">Partager ma position OFF</button>
      <button id="createGroupBtn" class="btn-secondary">Créer un groupe</button>
    </div>
    <div id="socialStatus" class="social-item">Statut: prêt.</div>
    <div class="chat-box card">
      <h3>Chat riders</h3>
      <div id="chatMessages" class="chat-messages"></div>
      <input id="chatInput" class="auth-input" placeholder="Message... 🏍️ ⛽ 🛑 ✅ 👍" />
      <button id="chatSendBtn" class="btn-primary">Envoyer</button>
    </div>
  `;
}

function setSocialStatus(message) {
  const node = document.getElementById("socialStatus");
  if (node) node.textContent = `Statut: ${message}`;
}

export function startLiveLocationShare(uid, groupId = "global", onError = null, onLocalPosition = null) {
  socialState.loading = true;
  socialState.shareEnabled = true;
  socialState.currentGroupId = groupId;
  const btn = document.getElementById("shareToggleBtn");
  if (btn) btn.textContent = "Partager ma position ON";
  try {
    if (!("geolocation" in navigator)) {
      throw new Error("Geolocalisation non supportee sur cet appareil.");
    }

    const { rtdb } = getFirebaseServices();
    const publishPosition = async (position) => {
      if (typeof onLocalPosition === "function") onLocalPosition(position);
      try {
        const payload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed || 0,
          status: (position.coords.speed || 0) > 2 ? "en route" : "a l'arret",
          updatedAt: Date.now()
        };
        await set(ref(rtdb, `presence/${groupId}/${uid}`), payload);
        await push(ref(rtdb, `traces/${groupId}/${uid}`), payload);
        setSocialStatus("position partagée en direct.");
      } catch (error) {
        console.error("[Social] Erreur publication position:", error);
        setSocialStatus("erreur d'envoi position (Firebase).");
        if (typeof onError === "function") onError(error);
      }
    };

    // Envoi immédiat pour affichage instantané sur la carte.
    navigator.geolocation.getCurrentPosition(
      (position) => publishPosition(position),
      (error) => {
        console.error("[Social] Erreur GPS initiale:", error);
        setSocialStatus("permission GPS refusée ou indisponible.");
        if (typeof onError === "function") onError(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Suivi continu moderne (plus fiable que setInterval).
    socialState.watchId = navigator.geolocation.watchPosition(
      (position) => publishPosition(position),
      (error) => {
        console.error("[Social] Erreur watchPosition:", error);
        setSocialStatus("erreur GPS continue.");
        if (typeof onError === "function") onError(error);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
    );
  } catch (error) {
    console.error("[Social] Erreur startLiveLocationShare:", error);
    setSocialStatus("démarrage partage impossible.");
    if (typeof onError === "function") onError(error);
  } finally {
    socialState.loading = false;
  }
}

export function stopLiveLocationShare() {
  if (socialState.timerId) clearInterval(socialState.timerId);
  socialState.timerId = null;
  if (socialState.watchId !== null) {
    navigator.geolocation.clearWatch(socialState.watchId);
    socialState.watchId = null;
  }
  socialState.shareEnabled = false;
  const btn = document.getElementById("shareToggleBtn");
  if (btn) btn.textContent = "Partager ma position OFF";
  setSocialStatus("partage désactivé.");
}

export function watchGroupPresence(groupId, callback) {
  try {
    const { rtdb } = getFirebaseServices();
    onValue(ref(rtdb, `presence/${groupId}`), (snapshot) => callback(snapshot.val() || {}));
  } catch (error) {
    console.error("[Social] Erreur watchGroupPresence:", error);
  }
}

export function watchGroupTraces(groupId, callback) {
  try {
    const { rtdb } = getFirebaseServices();
    onValue(ref(rtdb, `traces/${groupId}`), (snapshot) => callback(snapshot.val() || {}));
  } catch (error) {
    console.error("[Social] Erreur watchGroupTraces:", error);
  }
}
