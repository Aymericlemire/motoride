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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const WEATHER_API_KEY = "YOUR_OPENWEATHER_KEY";
export const WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

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
