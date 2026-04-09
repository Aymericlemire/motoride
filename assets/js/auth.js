/**
 * MotoTrack - Auth refaite simple et robuste.
 */

import { initializeFirebase, getFirebaseServices } from "../../firebase-config.js";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const AUTH_EVENTS = {
  STATE_CHANGED: "mototrack:auth-state-changed",
  LOADING_CHANGED: "mototrack:auth-loading-changed",
  ERROR: "mototrack:auth-error",
  SUCCESS: "mototrack:auth-success"
};

const authState = {
  initialized: false,
  loading: false,
  user: null,
  riderProfile: null
};

function emit(type, detail) {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function setLoading(value) {
  authState.loading = value;
  emit(AUTH_EVENTS.LOADING_CHANGED, { loading: value });
}

function friendly(code) {
  const map = {
    "auth/unauthorized-domain": "Domaine non autorisé. Ajoute web.app et firebaseapp.com dans Firebase Auth.",
    "auth/operation-not-allowed": "Google Sign-In n'est pas activé dans Firebase Auth.",
    "auth/popup-blocked": "Popup bloquée, passage en mode redirection.",
    "auth/network-request-failed": "Erreur réseau pendant la connexion.",
    "auth/invalid-api-key": "Configuration Firebase invalide (apiKey)."
  };
  return map[code] || "Erreur d'authentification.";
}

async function ensureRiderProfile(user) {
  if (!user) return null;
  const { db } = getFirebaseServices();
  const ref = doc(db, "riders", user.uid);
  const snap = await getDoc(ref);

  const fallback = {
    uid: user.uid,
    email: user.email || "",
    pseudo: user.displayName || "Rider",
    photoURL: user.photoURL || "",
    city: "",
    motoType: "",
    publicStats: true,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  };

  if (!snap.exists()) {
    await setDoc(ref, fallback, { merge: true });
    return fallback;
  }
  return { ...fallback, ...snap.data() };
}

function applyUser(user, riderProfile) {
  authState.user = user;
  authState.riderProfile = riderProfile || null;
  emit(AUTH_EVENTS.STATE_CHANGED, { ...authState });
}

export async function initAuth() {
  if (authState.initialized) return authState;
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();

    // Finalise une éventuelle redirection OAuth.
    const redirect = await getRedirectResult(auth).catch(() => null);
    if (redirect?.user) {
      const profile = await ensureRiderProfile(redirect.user);
      applyUser(redirect.user, profile);
      emit(AUTH_EVENTS.SUCCESS, { message: "Connexion Google réussie (redirect)." });
    }

    onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          applyUser(null, null);
          return;
        }
        const profile = await ensureRiderProfile(user);
        applyUser(user, profile);
      } catch (error) {
        emit(AUTH_EVENTS.ERROR, { message: friendly(error?.code), raw: error });
      } finally {
        setLoading(false);
      }
    });

    authState.initialized = true;
    return authState;
  } catch (error) {
    emit(AUTH_EVENTS.ERROR, { message: friendly(error?.code), raw: error });
    setLoading(false);
    throw error;
  }
}

export async function signInWithGoogle() {
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
    if (mobile) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const profile = await ensureRiderProfile(result.user);
      applyUser(result.user, profile);
      emit(AUTH_EVENTS.SUCCESS, { message: "Connexion Google réussie." });
      return result.user;
    } catch {
      await signInWithRedirect(auth, provider);
      return null;
    }
  } catch (error) {
    emit(AUTH_EVENTS.ERROR, { message: friendly(error?.code), raw: error });
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function logout() {
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();
    await signOut(auth);
    applyUser(null, null);
    emit(AUTH_EVENTS.SUCCESS, { message: "Déconnexion effectuée." });
  } catch (error) {
    emit(AUTH_EVENTS.ERROR, { message: friendly(error?.code), raw: error });
    throw error;
  } finally {
    setLoading(false);
  }
}

export function getAuthState() {
  return { ...authState };
}

export function getAuthEvents() {
  return { ...AUTH_EVENTS };
}
