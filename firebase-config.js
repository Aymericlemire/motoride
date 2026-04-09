/**
 * MotoTrack - Configuration Firebase & APIs externes
 * Ce module centralise l'initialisation de Firebase et expose
 * les services utilisés dans toute l'application.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { getMessaging, isSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js";

// Remplacer avec les vraies clés de production.
const firebaseConfig = {
  apiKey: "AIzaSyBSFRFTR-pAGu9_M8Ff9i2HWblXli7hFlI",
  authDomain: "motoride-f54d6.firebaseapp.com",
  // Realtime Database requise pour la localisation riders.
  databaseURL: "https://motoride-f54d6-default-rtdb.firebaseio.com",
  projectId: "motoride-f54d6",
  storageBucket: "motoride-f54d6.firebasestorage.app",
  messagingSenderId: "488045896105",
  appId: "1:488045896105:web:e796ad2ac143e1d53de4b8"
};

export const FIREBASE_MEASUREMENT_ID = "G-BDMMF4M93G";

export const WEATHER_API_KEY = "YOUR_OPENWEATHER_KEY";
export const WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

function isPlaceholder(value) {
  return typeof value !== "string" || value.includes("YOUR_");
}

export function isFirebaseConfigured() {
  return !(
    isPlaceholder(firebaseConfig.apiKey) ||
    isPlaceholder(firebaseConfig.authDomain) ||
    isPlaceholder(firebaseConfig.databaseURL) ||
    isPlaceholder(firebaseConfig.projectId) ||
    isPlaceholder(firebaseConfig.storageBucket) ||
    isPlaceholder(firebaseConfig.messagingSenderId) ||
    isPlaceholder(firebaseConfig.appId)
  );
}

let appInstance = null;
let authInstance = null;
let dbInstance = null;
let rtdbInstance = null;
let storageInstance = null;
let messagingInstance = null;

/**
 * Initialise Firebase une seule fois et configure la persistance de session.
 * @returns {Promise<{ app: import('firebase/app').FirebaseApp, auth: any, db: any, rtdb: any, storage: any, messaging: any }>}
 */
export async function initializeFirebase() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase non configure: remplace les valeurs YOUR_* dans firebase-config.js."
    );
  }

  if (appInstance && authInstance && dbInstance && rtdbInstance && storageInstance) {
    return {
      app: appInstance,
      auth: authInstance,
      db: dbInstance,
      rtdb: rtdbInstance,
      storage: storageInstance,
      messaging: messagingInstance
    };
  }

  try {
    appInstance = initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    rtdbInstance = getDatabase(appInstance);
    storageInstance = getStorage(appInstance);

    await setPersistence(authInstance, browserLocalPersistence);

    // Messaging est optionnel selon le navigateur/environnement.
    const messagingSupported = await isSupported().catch(() => false);
    messagingInstance = messagingSupported ? getMessaging(appInstance) : null;

    return {
      app: appInstance,
      auth: authInstance,
      db: dbInstance,
      rtdb: rtdbInstance,
      storage: storageInstance,
      messaging: messagingInstance
    };
  } catch (error) {
    console.error("[Firebase] Erreur d'initialisation :", error);
    throw error;
  }
}

/**
 * Retourne les instances Firebase sans réinitialiser.
 * Appeler initializeFirebase() au démarrage de l'app.
 */
export function getFirebaseServices() {
  return {
    app: appInstance,
    auth: authInstance,
    db: dbInstance,
    rtdb: rtdbInstance,
    storage: storageInstance,
    messaging: messagingInstance
  };
}

export { firebaseConfig };
